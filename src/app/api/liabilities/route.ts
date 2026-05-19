import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyLiabilitySubmitted } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repId = searchParams.get("repId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const role = session.user.role as string;
  let where: Record<string, unknown> = {};

  if (role === "REP") {
    where = { repId: session.user.id };
  } else if (role === "MANAGER") {
    const managedReps = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    where = { repId: { in: managedReps.map((r) => r.id) } };
  } else if (repId) {
    where = { repId };
  }

  if (from || to) {
    where = {
      ...where,
      callDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    };
  }

  const liabilities = await prisma.liability.findMany({
    where,
    include: {
      rep: { select: { id: true, name: true, email: true, manager: { select: { id: true, name: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(liabilities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  if (role !== "SUBMITTER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { repId, customerName, callDate, callLink, liabilityReason, notes, region, imageUrls } = body;

  if (!repId || !customerName || !callDate || !liabilityReason || !notes || !region) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const liability = await prisma.liability.create({
    data: {
      repId,
      submitterId: session.user.id,
      customerName,
      callDate: new Date(callDate),
      callLink: callLink || null,
      liabilityReason,
      notes,
      region,
      imageUrls: imageUrls ?? [],
    },
  });

  await notifyLiabilitySubmitted(liability.id);
  return NextResponse.json(liability, { status: 201 });
}
