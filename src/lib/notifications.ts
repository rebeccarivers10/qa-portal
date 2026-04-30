import { prisma } from "@/lib/prisma";

interface NotifyOptions {
  userIds: string[];
  liabilityId: string;
  message: string;
}

export async function createNotifications({ userIds, liabilityId, message }: NotifyOptions) {
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, liabilityId, message })),
  });
  // Email sending is disabled in demo mode
}

export async function notifyLiabilitySubmitted(liabilityId: string) {
  const liability = await prisma.liability.findUnique({
    where: { id: liabilityId },
    include: { rep: { include: { manager: true } }, submitter: true },
  });
  if (!liability) return;

  const repName = liability.rep.name ?? liability.rep.email;
  const submitterName = liability.submitter.name ?? liability.submitter.email;
  const message = `A new QA liability has been submitted for ${repName} by ${submitterName}.`;

  const userIds = [liability.repId];
  if (liability.rep.managerId) userIds.push(liability.rep.managerId);

  await createNotifications({ userIds, liabilityId, message });
}

export async function notifyLiabilityAcknowledged(liabilityId: string) {
  const liability = await prisma.liability.findUnique({
    where: { id: liabilityId },
    include: { rep: true, submitter: true },
  });
  if (!liability) return;

  const repName = liability.rep.name ?? liability.rep.email;
  const message = `${repName} has acknowledged their QA liability.`;

  await createNotifications({ userIds: [liability.submitterId], liabilityId, message });
}

export async function notifyCommentAdded(liabilityId: string, commenterName: string) {
  const liability = await prisma.liability.findUnique({
    where: { id: liabilityId },
    select: { submitterId: true },
  });
  if (!liability) return;

  const message = `${commenterName} left a note on a QA liability.`;
  await createNotifications({ userIds: [liability.submitterId], liabilityId, message });
}
