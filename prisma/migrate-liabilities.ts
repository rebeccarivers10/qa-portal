/**
 * One-time migration: converts existing Liability records into QAReview records
 * with feedbackTypes = ["LIABILITY"]. Does NOT delete the original Liability records.
 *
 * Run with: npx tsx prisma/migrate-liabilities.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const liabilities = await prisma.liability.findMany({
    include: { rep: true, submitter: true },
  });

  if (liabilities.length === 0) {
    console.log("No liabilities found — nothing to migrate.");
    return;
  }

  console.log(`Found ${liabilities.length} liabilities. Starting migration...`);

  let created = 0;
  let skipped = 0;

  for (const l of liabilities) {
    // Check if a QAReview already exists for this liability (idempotent guard)
    // We use the same repId + callDate + liabilityReason as a loose deduplicate key.
    const existing = await prisma.qAReview.findFirst({
      where: {
        repId: l.repId,
        callDate: l.callDate,
        liabilityReason: l.liabilityReason,
        feedbackTypes: { has: "LIABILITY" },
      },
    });

    if (existing) {
      console.log(`  SKIP  ${l.id} — matching QAReview already exists (${existing.id})`);
      skipped++;
      continue;
    }

    const review = await prisma.qAReview.create({
      data: {
        repId: l.repId,
        submitterId: l.submitterId,
        callDate: l.callDate,
        feedbackTypes: ["LIABILITY"],
        liabilityReason: l.liabilityReason ?? undefined,
        region: l.region ?? undefined,
        notes: l.notes ?? undefined,
        imageUrls: l.imageUrls ?? [],
        createdAt: l.createdAt,
      },
    });

    console.log(`  CREATE ${review.id}  (from liability ${l.id}, rep: ${l.rep.name})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
