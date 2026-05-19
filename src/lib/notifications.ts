import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) return; // no key configured — skip silently
  try {
    await resend.emails.send({
      from: "QA Portal <noreply@logicalposition.com>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

interface NotifyOptions {
  userIds: string[];
  liabilityId: string;
  message: string;
}

export async function createNotifications({ userIds, liabilityId, message }: NotifyOptions) {
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, liabilityId, message })),
  });
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

  const liabilityUrl = `${process.env.NEXTAUTH_URL}/dashboard/liabilities/${liabilityId}`;

  // Email the rep
  await sendEmail(
    liability.rep.email,
    "New QA Liability Submitted",
    `<p>Hi ${repName},</p>
     <p>A new QA liability has been submitted for you by ${submitterName}.</p>
     <p><strong>Reason:</strong> ${liability.liabilityReason}</p>
     <p><a href="${liabilityUrl}">View and acknowledge this liability →</a></p>
     <p style="color:#888;font-size:12px;">QA Portal — Logical Position</p>`
  );

  // Email the manager
  if (liability.rep.manager) {
    const managerName = liability.rep.manager.name ?? liability.rep.manager.email;
    await sendEmail(
      liability.rep.manager.email,
      `New QA Liability for ${repName}`,
      `<p>Hi ${managerName},</p>
       <p>A new QA liability has been submitted for your rep ${repName} by ${submitterName}.</p>
       <p><strong>Reason:</strong> ${liability.liabilityReason}</p>
       <p><a href="${liabilityUrl}">View this liability →</a></p>
       <p style="color:#888;font-size:12px;">QA Portal — Logical Position</p>`
    );
  }
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

  const liabilityUrl = `${process.env.NEXTAUTH_URL}/dashboard/liabilities/${liabilityId}`;
  const submitterName = liability.submitter.name ?? liability.submitter.email;

  await sendEmail(
    liability.submitter.email,
    `${repName} Acknowledged a QA Liability`,
    `<p>Hi ${submitterName},</p>
     <p>${repName} has acknowledged their QA liability.</p>
     <p><strong>Reason:</strong> ${liability.liabilityReason}</p>
     <p><a href="${liabilityUrl}">View this liability →</a></p>
     <p style="color:#888;font-size:12px;">QA Portal — Logical Position</p>`
  );
}

export async function notifyCommentAdded(liabilityId: string, commenterName: string) {
  const liability = await prisma.liability.findUnique({
    where: { id: liabilityId },
    select: { submitterId: true, submitter: { select: { email: true, name: true } } },
  });
  if (!liability) return;

  const message = `${commenterName} left a note on a QA liability.`;
  await createNotifications({ userIds: [liability.submitterId], liabilityId, message });

  const liabilityUrl = `${process.env.NEXTAUTH_URL}/dashboard/liabilities/${liabilityId}`;
  const submitterName = liability.submitter.name ?? liability.submitter.email;

  await sendEmail(
    liability.submitter.email,
    `New note from ${commenterName}`,
    `<p>Hi ${submitterName},</p>
     <p>${commenterName} left a note on a QA liability.</p>
     <p><a href="${liabilityUrl}">View this liability →</a></p>
     <p style="color:#888;font-size:12px;">QA Portal — Logical Position</p>`
  );
}
