import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: role ? { role: role as "REP" | "MANAGER" | "SUBMITTER" | "ADMIN" } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      manager: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, managerId, userRole } = body;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(managerId !== undefined && { managerId }),
      ...(userRole && { role: userRole }),
    },
  });

  return NextResponse.json(updated);
}
