import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { LiabilityActions } from "./LiabilityActions";
import { AckTimeline } from "@/components/AckTimeline";

const ALL_LIABILITY_REASONS = [
  "Sales- Third-Party Consent for Call Recordings Policy",
  "User Locations",
  "Other - See Notes",
  "Ongoing Support",
  "AM- Impatience with the Client (Extreme)",
];

const REGION_LABELS: Record<string, string> = { EAST: "East", WEST: "West", CENTRAL: "Central" };

function statusVariantOf(s: string) {
  return s === "NEEDS_REVIEW" ? "needs_review" : s === "MANAGER_ACKNOWLEDGED" ? "mgr_acknowledged" : "acknowledged";
}
function statusLabelOf(s: string) {
  return s === "NEEDS_REVIEW" ? "Needs Review" : s === "MANAGER_ACKNOWLEDGED" ? "Mgr Acknowledged" : "Acknowledged";
}

export default async function LiabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const liability = await prisma.liability.findUnique({
    where: { id },
    include: {
      rep: { include: { manager: { select: { id: true, name: true, email: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!liability) notFound();

  const role = session.user.role as string;
  const isRep = session.user.id === liability.repId;
  const isManager = session.user.id === liability.rep.managerId;
  const isSubmitter = role === "SUBMITTER" || role === "ADMIN";

  // Count all liabilities for this rep grouped by reason (including current record)
  const allRepLiabilities = await prisma.liability.findMany({
    where: { repId: liability.repId },
    select: { liabilityReason: true },
  });
  const countByReason: Record<string, number> = {};
  for (const l of allRepLiabilities) {
    countByReason[l.liabilityReason] = (countByReason[l.liabilityReason] ?? 0) + 1;
  }

  const commentColors: Record<string, string> = {
    MANAGER: "border-purple-200 bg-purple-50",
    SUBMITTER: "border-gray-200 bg-gray-50",
  };
  const commentLabels: Record<string, string> = {
    MANAGER: "Manager Note",
    SUBMITTER: "Submitter Note",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">QA Liability</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Submitted {format(new Date(liability.createdAt), "MMMM d, yyyy")} by {liability.submitter.name ?? liability.submitter.email}
          </p>
        </div>
        <Badge variant={statusVariantOf(liability.status)}>{statusLabelOf(liability.status)}</Badge>
      </div>

      {/* Main info card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">User</p>
            <p className="text-gray-900 mt-0.5">{liability.rep.name ?? liability.rep.email}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Manager</p>
            <p className="text-gray-900 mt-0.5">{liability.rep.manager?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Contact Name</p>
            <p className="text-gray-900 mt-0.5">{liability.customerName}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Region</p>
            <p className="text-gray-900 mt-0.5">{REGION_LABELS[liability.region] ?? liability.region}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Call Date</p>
            <p className="text-gray-900 mt-0.5">{format(new Date(liability.callDate), "MMMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Liability Reason</p>
            <p className="text-gray-900 mt-0.5">{liability.liabilityReason}</p>
          </div>
          {liability.acknowledgedAt && (
            <div>
              <p className="text-gray-500 font-medium">User Acknowledged</p>
              <p className="text-gray-900 mt-0.5">{format(new Date(liability.acknowledgedAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
          {liability.managerAcknowledgedAt && (
            <div>
              <p className="text-gray-500 font-medium">Manager Acknowledged</p>
              <p className="text-gray-900 mt-0.5">{format(new Date(liability.managerAcknowledgedAt), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-gray-500 font-medium text-sm">Notes</p>
          <p className="text-gray-900 mt-1 text-sm leading-relaxed whitespace-pre-wrap">{liability.notes}</p>
        </div>

        {/* Screenshots / Proof */}
        {liability.imageUrls.length > 0 && (
          <div>
            <p className="text-gray-500 font-medium text-sm mb-2">Screenshots / Proof</p>
            <div className="flex flex-wrap gap-2">
              {liability.imageUrls.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                  <img
                    src={src}
                    alt={`attachment ${i + 1}`}
                    className="h-24 w-24 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Liability History Dropdown */}
      <details className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors list-none">
          <h2 className="font-semibold text-sm text-gray-800">
            Liability History — <span className="font-normal text-gray-500">{liability.rep.name ?? liability.rep.email}</span>
          </h2>
          <svg className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {ALL_LIABILITY_REASONS.map((reason) => {
            const count = countByReason[reason] ?? 0;
            return (
              <div key={reason} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-gray-700">{reason}</span>
                <span className="text-gray-500 font-medium ml-4 shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </details>

      <AckTimeline
        submitterName={liability.submitter.name ?? liability.submitter.email}
        submittedAt={liability.createdAt}
        repName={liability.rep.name ?? liability.rep.email}
        acknowledgedAt={liability.acknowledgedAt}
        managerName={liability.rep.manager?.name ?? null}
        managerAcknowledgedAt={liability.managerAcknowledgedAt}
      />

      {liability.comments.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Notes</h2>
          {liability.comments.map((c) => (
            <div key={c.id} className={`border rounded-lg p-4 text-sm space-y-2 ${commentColors[c.type] ?? "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {c.author.name ?? c.author.id} — <span className="text-gray-500 font-normal">{commentLabels[c.type]}</span>
                </span>
                <span className="text-gray-400 text-xs">{format(new Date(c.createdAt), "MMM d, yyyy h:mm a")}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <LiabilityActions
        liabilityId={liability.id}
        status={liability.status}
        managerAcknowledgedAt={liability.managerAcknowledgedAt?.toISOString() ?? null}
        isRep={isRep}
        isManager={isManager}
        isSubmitter={isSubmitter}
      />
    </div>
  );
}
