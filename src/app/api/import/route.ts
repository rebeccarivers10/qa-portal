import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV columns: email, callDate, customerName, callLength, liabilityReason, region, notes
// callLink is optional
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  if (role !== "SUBMITTER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rows } = body as {
    rows: {
      email: string;
      callDate: string;
      customerName: string;
      callLength: string;
      liabilityReason: string;
      region: string;
      notes: string;
      callLink?: string;
    }[];
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const emailToId = Object.fromEntries(
    users.map((u: { id: string; email: string }) => [u.email.toLowerCase(), u.id])
  );
  const skipped: string[] = [];

  const data = rows.flatMap((row) => {
    const repId = emailToId[row.email.toLowerCase()];
    if (!repId) { skipped.push(row.email); return []; }
    const validRegions = ["EAST", "WEST", "CENTRAL"];
    const region = validRegions.includes(row.region?.toUpperCase()) ? row.region.toUpperCase() : "EAST";
    return [{
      repId,
      submitterId: session.user.id,
      customerName: row.customerName || "Unknown",
      callDate: new Date(row.callDate),
      callLength: row.callLength || "Unknown",
      callLink: row.callLink || null,
      liabilityReason: row.liabilityReason || "Other - See Notes",
      region: region as "EAST" | "WEST" | "CENTRAL",
      notes: row.notes,
      imageUrls: [],
    }];
  });

  const result = await prisma.liability.createMany({ data, skipDuplicates: false });
  return NextResponse.json({ imported: result.count, skipped });
}
