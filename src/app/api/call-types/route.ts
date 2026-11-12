import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callTypes = await prisma.callType.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(callTypes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const item = await prisma.callType.create({ data: { name: name.trim() } });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, active } = await req.json();
  const item = await prisma.callType.update({ where: { id }, data: { active } });
  return NextResponse.json(item);
}
