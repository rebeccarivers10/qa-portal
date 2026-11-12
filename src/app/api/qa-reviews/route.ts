import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shouldNotify } from "@/lib/review-config";
import { notifyQAReviewSubmitted } from "@/lib/notifications";

// ── GET — list reviews (session-authenticated) ────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = session.user.role as string;

  let where: Record<string, unknown> = {};

  if (role === "REP") {
    where.repId = session.user.id;
  } else if (role === "MANAGER") {
    const reps = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    where.repId = { in: reps.map((r) => r.id) };
  }

  // Optional filters
  const repId = searchParams.get("repId");
  const managerId = searchParams.get("managerId");
  const callTypeId = searchParams.get("callTypeId");
  const feedbackType = searchParams.get("feedbackType");
  const playlistId = searchParams.get("playlistId");
  const productId = searchParams.get("productId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (repId && role !== "REP") where.repId = repId;
  if (managerId && role !== "REP") {
    const reps = await prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });
    where.repId = { in: reps.map((r) => r.id) };
  }
  if (callTypeId) where.callTypeId = callTypeId;
  if (feedbackType) where.feedbackTypes = { has: feedbackType };
  if (playlistId) where.playlists = { some: { playlistId } };
  if (productId) where.products = { some: { productId } };
  if (from || to) {
    where.callDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const reviews = await prisma.qAReview.findMany({
    where,
    include: {
      rep: { select: { id: true, name: true, email: true, manager: { select: { id: true, name: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      callType: true,
      playlists: { include: { playlist: true } },
      products: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

// ── POST — create review ──────────────────────────────────────────────────────
// Accepts both session auth (web form) and API key auth (automated jobs).

export async function POST(req: NextRequest) {
  // API key auth path
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    if (apiKey !== process.env.QA_REVIEW_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
  } else {
    // Session auth path
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role as string;
    if (role !== "SUBMITTER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const {
    repId,
    submitterId,
    callDate,
    callTypeId,
    recordingUrl,
    recordingSource,
    feedbackTypes,
    liabilityReason,
    region,
    notes,
    playlistIds = [],
    productIds = [],
    imageUrls = [],
  } = body;

  if (!repId || !callDate || !callTypeId || !feedbackTypes?.length || !notes) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // When LIABILITY is in feedbackTypes, liabilityReason and region are required
  if (feedbackTypes.includes("LIABILITY") && (!liabilityReason || !region)) {
    return NextResponse.json(
      { error: "liabilityReason and region are required when LIABILITY is selected" },
      { status: 400 }
    );
  }

  // For API key requests, submitterId must be provided in the body
  let resolvedSubmitterId = submitterId;
  if (!apiKey) {
    const session = await auth();
    resolvedSubmitterId = session!.user!.id;
  }
  if (!resolvedSubmitterId) {
    return NextResponse.json({ error: "submitterId required for API key requests" }, { status: 400 });
  }

  const review = await prisma.qAReview.create({
    data: {
      repId,
      submitterId: resolvedSubmitterId,
      callDate: new Date(callDate),
      callTypeId,
      recordingUrl: recordingUrl || null,
      recordingSource: recordingSource || null,
      feedbackTypes,
      liabilityReason: liabilityReason || null,
      region: region || null,
      notes,
      imageUrls,
      playlists: {
        create: (playlistIds as string[]).map((playlistId) => ({ playlistId })),
      },
      products: {
        create: (productIds as string[]).map((productId) => ({ productId })),
      },
    },
  });

  if (shouldNotify(feedbackTypes)) {
    await notifyQAReviewSubmitted(review.id);
  }

  return NextResponse.json(review, { status: 201 });
}
