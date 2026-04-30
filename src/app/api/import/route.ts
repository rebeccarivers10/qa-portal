import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Expects CSV rows: email,contactDate,notes
// The rep is looked up by email; submitter is the logged-in user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  if (role !== "SUBMITTER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rows } = body as { rows: { email: string; contactDate: string; notes: string }[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const emailToId = Object.fromEntries(users.map((u: { id: string; email: string }) => [u.email.toLowerCase(), u.id]));
  const skipped: string[] = [];

  const data = rows.flatMap((row) => {
    const repId = emailToId[row.email.toLowerCase()];
    if (!repId) {
      skipped.push(row.email);
      return [];
    }
    return [
      {
        repId,
        submitterId: session.user.id,
        contactDate: new Date(row.contactDate),
        notes: row.notes,
        imageUrls: [],
      },
    ];
  });

  const result = await prisma.liability.createMany({ data, skipDuplicates: false });

  return NextResponse.json({ imported: result.count, skipped });
}
