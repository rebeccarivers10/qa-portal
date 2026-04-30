import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.liabilityComment.deleteMany();
  await prisma.liability.deleteMany();
  await prisma.user.deleteMany();

  // Submitters
  const sarah = await prisma.user.create({
    data: { name: "Sarah Mitchell", email: "sarah.mitchell@company.com", role: "SUBMITTER" },
  });
  const james = await prisma.user.create({
    data: { name: "James Okafor", email: "james.okafor@company.com", role: "SUBMITTER" },
  });

  // Managers
  const managerA = await prisma.user.create({
    data: { name: "Donna Hartwell", email: "donna.hartwell@company.com", role: "MANAGER" },
  });
  const managerB = await prisma.user.create({
    data: { name: "Carlos Reyes", email: "carlos.reyes@company.com", role: "MANAGER" },
  });

  // Sales reps — Team A (Donna)
  const rep1 = await prisma.user.create({
    data: { name: "Tamirica Epting", email: "tamirica.epting@company.com", role: "REP", managerId: managerA.id },
  });
  const rep2 = await prisma.user.create({
    data: { name: "Malono Jones", email: "malono.jones@company.com", role: "REP", managerId: managerA.id },
  });
  const rep3 = await prisma.user.create({
    data: { name: "Brett Calloway", email: "brett.calloway@company.com", role: "REP", managerId: managerA.id },
  });

  // Sales reps — Team B (Carlos)
  const rep4 = await prisma.user.create({
    data: { name: "Priya Nandakumar", email: "priya.nandakumar@company.com", role: "REP", managerId: managerB.id },
  });
  const rep5 = await prisma.user.create({
    data: { name: "Derek Winslow", email: "derek.winslow@company.com", role: "REP", managerId: managerB.id },
  });
  const rep6 = await prisma.user.create({
    data: { name: "Alicia Fontaine", email: "alicia.fontaine@company.com", role: "REP", managerId: managerB.id },
  });

  // Liabilities
  const l1 = await prisma.liability.create({
    data: {
      repId: rep1.id,
      submitterId: sarah.id,
      contactDate: new Date("2026-04-28"),
      notes: "The rep did not disclose that the calls were being recorded. Failure to inform the caller of a recording is a liability.\n\nThe rep has frequent recurring liabilities X52 for Third-Party Consent for Call Recordings Policy.\n\nCall Consent: Before recording a call, it is essential to inform all participants, including the decision-maker, gatekeeper, and anyone else who may join, that the call is being recorded.",
      status: "PENDING",
    },
  });

  const l2 = await prisma.liability.create({
    data: {
      repId: rep2.id,
      submitterId: sarah.id,
      contactDate: new Date("2026-04-28"),
      notes: "The rep did not disclose that the calls were being recorded. Failure to inform the caller of a recording is a liability.\n\nThe rep has frequent recurring liabilities X46 for Third-Party Consent for Call Recordings Policy.\n\nCall Consent: Before recording a call, it is essential to inform all participants, including the decision-maker, gatekeeper, and anyone else who may join, that the call is being recorded.",
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date("2026-04-29"),
    },
  });

  await prisma.liabilityComment.create({
    data: {
      liabilityId: l2.id,
      authorId: rep2.id,
      type: "REVIEWEE",
      body: "Understood. I will make sure to disclose the recording at the start of every call going forward.",
    },
  });

  const l3 = await prisma.liability.create({
    data: {
      repId: rep3.id,
      submitterId: james.id,
      contactDate: new Date("2026-04-25"),
      notes: "Rep made pricing promises outside of approved offer guidelines. The customer was quoted a rate that is not available under current contracts. This creates a legal and financial liability for the company.",
      status: "PENDING",
    },
  });

  const l4 = await prisma.liability.create({
    data: {
      repId: rep4.id,
      submitterId: james.id,
      contactDate: new Date("2026-04-22"),
      notes: "Rep referenced a competitor product inaccurately, claiming their service had been discontinued. This is factually incorrect and constitutes a misrepresentation liability.",
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date("2026-04-23"),
    },
  });

  await prisma.liabilityComment.create({
    data: {
      liabilityId: l4.id,
      authorId: managerB.id,
      type: "MANAGER",
      body: "We've addressed this in the team meeting. Rep has completed the competitor accuracy training module.",
    },
  });

  const l5 = await prisma.liability.create({
    data: {
      repId: rep5.id,
      submitterId: sarah.id,
      contactDate: new Date("2026-04-20"),
      notes: "Rep sent a follow-up email containing contract terms that had not been approved by legal. Unapproved written commitments are a significant liability.",
      status: "PENDING",
    },
  });

  const l6 = await prisma.liability.create({
    data: {
      repId: rep1.id,
      submitterId: james.id,
      contactDate: new Date("2026-04-15"),
      notes: "Second liability for same rep — failed to disclose a conflict of interest when presenting to a prospect that is a former employer.",
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date("2026-04-16"),
    },
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { userId: rep1.id, liabilityId: l1.id, message: "A new QA liability has been submitted for you by Sarah Mitchell.", read: false },
      { userId: managerA.id, liabilityId: l1.id, message: "A new QA liability has been submitted for Tamirica Epting.", read: false },
      { userId: rep3.id, liabilityId: l3.id, message: "A new QA liability has been submitted for you by James Okafor.", read: true },
      { userId: managerA.id, liabilityId: l3.id, message: "A new QA liability has been submitted for Brett Calloway.", read: true },
      { userId: sarah.id, liabilityId: l2.id, message: "Malono Jones has acknowledged their QA liability.", read: false },
      { userId: rep5.id, liabilityId: l5.id, message: "A new QA liability has been submitted for you by Sarah Mitchell.", read: false },
      { userId: managerB.id, liabilityId: l5.id, message: "A new QA liability has been submitted for Derek Winslow.", read: false },
    ],
  });

  console.log("Seed complete. Demo users:");
  console.log("  Submitters: Sarah Mitchell, James Okafor");
  console.log("  Managers:   Donna Hartwell (Team A), Carlos Reyes (Team B)");
  console.log("  Reps:       Tamirica Epting, Malono Jones, Brett Calloway, Priya Nandakumar, Derek Winslow, Alicia Fontaine");
}

main().catch(console.error).finally(() => prisma.$disconnect());
