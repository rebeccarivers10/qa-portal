import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
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

  // Reps — Team A
  const rep1 = await prisma.user.create({
    data: { name: "Tamirica Epting", email: "tamirica.epting@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2023-03-12") },
  });
  const rep2 = await prisma.user.create({
    data: { name: "Malono Jones", email: "malono.jones@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2022-07-05") },
  });
  const rep3 = await prisma.user.create({
    data: { name: "Brett Calloway", email: "brett.calloway@company.com", role: "REP", managerId: managerA.id, hireDate: new Date("2024-01-22") },
  });

  // Reps — Team B
  const rep4 = await prisma.user.create({
    data: { name: "Priya Nandakumar", email: "priya.nandakumar@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2021-11-08") },
  });
  const rep5 = await prisma.user.create({
    data: { name: "Derek Winslow", email: "derek.winslow@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2023-06-19") },
  });
  const rep6 = await prisma.user.create({
    data: { name: "Alicia Fontaine", email: "alicia.fontaine@company.com", role: "REP", managerId: managerB.id, hireDate: new Date("2022-04-30") },
  });

  // Liabilities
  const l1 = await prisma.liability.create({
    data: {
      repId: rep1.id, submitterId: sarah.id,
      customerName: "Acme Corp", callDate: new Date("2026-04-28"),
      callLength: "14 min", callLink: "https://zra.example.com/call/001",
      liabilityReason: "Sales- Third-Party Consent for Call Recordings Policy",
      notes: "The rep did not disclose that the calls were being recorded. Failure to inform the caller of a recording is a liability. Rep has recurring violations X52 for this policy.",
      region: "EAST", status: "NEEDS_REVIEW",
    },
  });

  const l2 = await prisma.liability.create({
    data: {
      repId: rep2.id, submitterId: sarah.id,
      customerName: "Blue Ridge Solutions", callDate: new Date("2026-04-28"),
      callLength: "22 min", callLink: "https://zra.example.com/call/002",
      liabilityReason: "Sales- Third-Party Consent for Call Recordings Policy",
      notes: "Rep did not disclose call recording to third party on the line. X46 recurring liability.",
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
      callLength: "31 min", callLink: "https://zra.example.com/call/003",
      liabilityReason: "Other - See Notes",
      notes: "Rep made pricing promises outside of approved offer guidelines. Customer was quoted a rate not available under current contracts.",
      region: "CENTRAL", status: "NEEDS_REVIEW",
    },
  });

  const l4 = await prisma.liability.create({
    data: {
      repId: rep4.id, submitterId: james.id,
      customerName: "Nexus Digital", callDate: new Date("2026-04-22"),
      callLength: "18 min", callLink: "https://zra.example.com/call/004",
      liabilityReason: "AM- Impatience with the Client (Extreme)",
      notes: "Rep was visibly impatient and dismissive with the client during an objection handling portion of the call.",
      region: "EAST", status: "ACKNOWLEDGED", acknowledgedAt: new Date("2026-04-23"),
      managerAcknowledgedAt: new Date("2026-04-24"),
    },
  });

  await prisma.liabilityComment.create({
    data: { liabilityId: l4.id, authorId: managerB.id, type: "MANAGER", body: "Addressed in team meeting. Rep has completed the client communication training module." },
  });

  const l5 = await prisma.liability.create({
    data: {
      repId: rep5.id, submitterId: sarah.id,
      customerName: "Coastal Ventures LLC", callDate: new Date("2026-04-20"),
      callLength: "9 min", callLink: "https://zra.example.com/call/005",
      liabilityReason: "User Locations",
      notes: "Rep failed to verify user location before proceeding with the offer, which violates regional compliance requirements.",
      region: "WEST", status: "NEEDS_REVIEW",
    },
  });

  const l6 = await prisma.liability.create({
    data: {
      repId: rep1.id, submitterId: james.id,
      customerName: "Summit Realty Group", callDate: new Date("2026-04-15"),
      callLength: "27 min",
      liabilityReason: "Ongoing Support",
      notes: "Rep promised ongoing dedicated support that is not included in the package sold.",
      region: "EAST", status: "ACKNOWLEDGED", acknowledgedAt: new Date("2026-04-16"),
    },
  });

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

  console.log("Seed complete.");
  console.log("Reps:", [rep1, rep2, rep3, rep4, rep5, rep6].map(r => r.name).join(", "));
}

main().catch(console.error).finally(() => prisma.$disconnect());
