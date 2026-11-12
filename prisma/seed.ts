import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.liabilityComment.deleteMany();
  await prisma.qAReviewPlaylist.deleteMany();
  await prisma.qAReviewProduct.deleteMany();
  await prisma.qAReview.deleteMany();
  await prisma.liability.deleteMany();
  await prisma.user.deleteMany();
  await prisma.callType.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.product.deleteMany();

  // ── Lookup tables ────────────────────────────────────────────────────────

  const [coldCall, followUp, auditReview] = await Promise.all([
    prisma.callType.create({ data: { name: "Cold Call" } }),
    prisma.callType.create({ data: { name: "Follow-Up Call" } }),
    prisma.callType.create({ data: { name: "Audit/Review" } }),
  ]);

  const [pl1, pl2, pl3, pl4] = await Promise.all([
    prisma.playlist.create({ data: { name: "Successful Outcome" } }),
    prisma.playlist.create({ data: { name: "Meetings Booked" } }),
    prisma.playlist.create({ data: { name: "Good Discovery" } }),
    prisma.playlist.create({ data: { name: "Successful Budget Objection" } }),
  ]);

  const [pr1, pr2, pr3, pr4, pr5, pr6] = await Promise.all([
    prisma.product.create({ data: { name: "PPC E-Commerce" } }),
    prisma.product.create({ data: { name: "PPC Lead Generation" } }),
    prisma.product.create({ data: { name: "SEO" } }),
    prisma.product.create({ data: { name: "Email Marketing" } }),
    prisma.product.create({ data: { name: "Web Development" } }),
    prisma.product.create({ data: { name: "Paid Social" } }),
  ]);

  // ── Users ────────────────────────────────────────────────────────────────

  const sarah = await prisma.user.create({
    data: { name: "Sarah Mitchell", email: "sarah.mitchell@company.com", role: "SUBMITTER" },
  });
  const james = await prisma.user.create({
    data: { name: "James Okafor", email: "james.okafor@company.com", role: "SUBMITTER" },
  });

  const managerA = await prisma.user.create({
    data: { name: "Donna Hartwell", email: "donna.hartwell@company.com", role: "MANAGER" },
  });
  const managerB = await prisma.user.create({
    data: { name: "Carlos Reyes", email: "carlos.reyes@company.com", role: "MANAGER" },
  });

  const rep1 = await prisma.user.create({
    data: { name: "Tamirica Epting", email: "tamirica.epting@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2023-03-12") },
  });
  const rep2 = await prisma.user.create({
    data: { name: "Malono Jones", email: "malono.jones@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2022-07-05") },
  });
  const rep3 = await prisma.user.create({
    data: { name: "Brett Calloway", email: "brett.calloway@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2024-01-22") },
  });
  const rep4 = await prisma.user.create({
    data: { name: "Priya Nandakumar", email: "priya.nandakumar@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2021-11-08") },
  });
  const rep5 = await prisma.user.create({
    data: { name: "Derek Winslow", email: "derek.winslow@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2023-06-19") },
  });
  const rep6 = await prisma.user.create({
    data: { name: "Alicia Fontaine", email: "alicia.fontaine@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2022-04-30") },
  });

  // ── Liabilities (existing flow unchanged) ────────────────────────────────

  const l1 = await prisma.liability.create({
    data: {
      repId: rep1.id, submitterId: sarah.id,
      customerName: "Acme Corp", callDate: new Date("2026-04-28"),
      liabilityReason: "Sales- Third-Party Consent for Call Recordings Policy",
      notes: "The rep did not disclose that the calls were being recorded.",
      region: "EAST", status: "NEEDS_REVIEW",
    },
  });
  const l2 = await prisma.liability.create({
    data: {
      repId: rep2.id, submitterId: sarah.id,
      customerName: "Blue Ridge Solutions", callDate: new Date("2026-04-28"),
      liabilityReason: "Sales- Third-Party Consent for Call Recordings Policy",
      notes: "Rep did not disclose call recording to third party on the line.",
      region: "WEST", status: "ACKNOWLEDGED", acknowledgedAt: new Date("2026-04-29"),
    },
  });
  await prisma.liabilityComment.create({
    data: { liabilityId: l2.id, authorId: rep2.id, type: "MANAGER", body: "Understood — will disclose recording at the start of every call going forward." },
  });
  const l3 = await prisma.liability.create({
    data: {
      repId: rep3.id, submitterId: james.id,
      customerName: "Harrington & Partners", callDate: new Date("2026-04-25"),
      liabilityReason: "Other - See Notes",
      notes: "Rep made pricing promises outside of approved offer guidelines.",
      region: "CENTRAL", status: "NEEDS_REVIEW",
    },
  });
  const l5 = await prisma.liability.create({
    data: {
      repId: rep5.id, submitterId: sarah.id,
      customerName: "Coastal Ventures LLC", callDate: new Date("2026-04-20"),
      liabilityReason: "User Locations",
      notes: "Rep failed to verify user location before proceeding with the offer.",
      region: "WEST", status: "NEEDS_REVIEW",
    },
  });

  // ── Sample QA Reviews ────────────────────────────────────────────────────

  const r1 = await prisma.qAReview.create({
    data: {
      repId: rep1.id, submitterId: sarah.id,
      callDate: new Date("2026-10-15"),
      callTypeId: coldCall.id,
      recordingUrl: "https://zoom.example.com/rec/abc123",
      recordingSource: "ZOOM",
      feedbackTypes: ["COACHING_OPPORTUNITY"],
      notes: "Strong opener and good rapport building. Recommend reviewing the discovery phase — rep moved to pitch too quickly without fully uncovering budget.",
      playlists: { create: [{ playlistId: pl3.id }] },
      products: { create: [{ productId: pr1.id }] },
    },
  });

  const r2 = await prisma.qAReview.create({
    data: {
      repId: rep2.id, submitterId: james.id,
      callDate: new Date("2026-10-20"),
      callTypeId: followUp.id,
      feedbackTypes: ["NO_QA_LIABILITIES", "COACHING_OPPORTUNITY"],
      notes: "Clean follow-up call. Rep handled the objection well and confirmed next steps. Recommend adding to Successful Budget Objection playlist.",
      playlists: { create: [{ playlistId: pl4.id }, { playlistId: pl1.id }] },
      products: { create: [{ productId: pr2.id }, { productId: pr3.id }] },
    },
  });

  const r3 = await prisma.qAReview.create({
    data: {
      repId: rep4.id, submitterId: sarah.id,
      callDate: new Date("2026-11-01"),
      callTypeId: auditReview.id,
      feedbackTypes: ["LIABILITY"],
      liabilityReason: "Sales- Third-Party Consent for Call Recordings Policy",
      region: "EAST",
      notes: "Rep failed to disclose recording to third party on the line. Second occurrence this quarter.",
      products: { create: [{ productId: pr4.id }] },
    },
  });

  // ── Notifications ────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      { userId: rep1.id, liabilityId: l1.id, message: "A new QA liability has been submitted for you by Sarah Mitchell.", read: false },
      { userId: managerA.id, liabilityId: l1.id, message: "A new QA liability has been submitted for Tamirica Epting.", read: false },
      { userId: rep3.id, liabilityId: l3.id, message: "A new QA liability has been submitted for you by James Okafor.", read: true },
      { userId: rep5.id, liabilityId: l5.id, message: "A new QA liability has been submitted for you by Sarah Mitchell.", read: false },
      { userId: managerB.id, liabilityId: l5.id, message: "A new QA liability has been submitted for Derek Winslow.", read: false },
      { userId: rep1.id, qaReviewId: r1.id, message: "A new QA review has been submitted for you (coaching opportunity).", read: false },
      { userId: managerA.id, qaReviewId: r1.id, message: "A new QA review has been submitted for Tamirica Epting.", read: false },
      { userId: rep2.id, qaReviewId: r2.id, message: "A new QA review has been submitted for you (coaching opportunity).", read: false },
      { userId: rep4.id, qaReviewId: r3.id, message: "A new QA review has been submitted for you (liability).", read: false },
      { userId: managerB.id, qaReviewId: r3.id, message: "A new QA review has been submitted for Priya Nandakumar.", read: false },
    ],
  });

  console.log("Seed complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
