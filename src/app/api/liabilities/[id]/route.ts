import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyLiabilityAcknowledged, notifyCommentAdded } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const liability = await prisma.liability.findUnique({
    where: { id },
    include: {
      rep: { select: { id: true, name: true, email: true, hireDate: true, manager: { select: { id: true, name: true, email: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!liability) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(liability);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, commentBody } = body;

  const liability = await prisma.liability.findUnique({ where: { id } });
  if (!liability) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role as string;

  if (action === "acknowledge") {
    if (session.user.id !== liability.repId) {
      return NextResponse.json({ error: "Only the rep can acknowledge" }, { status: 403 });
    }
    const updated = await prisma.liability.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    await notifyLiabilityAcknowledged(id);
    return NextResponse.json(updated);
  }

  if (action === "manager_acknowledge") {
    if (role !== "MANAGER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only managers can do this" }, { status: 403 });
    }
    const updated = await prisma.liability.update({
      where: { id },
      data: { managerAcknowledgedAt: new Date() },
    });
    // Notify submitter
    await prisma.notification.create({
      data: {
        userId: liability.submitterId,
        liabilityId: id,
        message: `A manager has reviewed and acknowledged a QA liability.`,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "comment") {
    // Only managers and submitters can leave notes
    const allowedTypes: Record<string, string> = {
      MANAGER: "MANAGER",
      SUBMITTER: "SUBMITTER",
      ADMIN: "SUBMITTER",
    };
    const commentType = allowedTypes[role];
    if (!commentType) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const comment = await prisma.liabilityComment.create({
      data: {
        liabilityId: id,
        authorId: session.user.id,
        type: commentType as "MANAGER" | "SUBMITTER",
        body: commentBody,
        imageUrls: [],
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    const authorName = session.user.name ?? session.user.email ?? "Someone";
    if (role !== "SUBMITTER" && role !== "ADMIN") {
      await notifyCommentAdded(id, authorName);
    }

    return NextResponse.json(comment);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
