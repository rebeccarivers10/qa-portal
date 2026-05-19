import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LiabilityActions } from "./LiabilityActions";
import { AckTimeline } from "@/components/AckTimeline";

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

  // All liabilities for this rep (excluding current), grouped by reason
  const allRepLiabilities = await prisma.liability.findMany({
    where: { repId: liability.repId, id: { not: liability.id } },
    orderBy: { callDate: "desc" },
    select: { id: true, callDate: true, customerName: true, status: true, liabilityReason: true },
  });

  // Group by reason, sorted by count desc
  const byReason: Record<string, typeof allRepLiabilities> = {};
  for (const l of allRepLiabilities) {
    if (!byReason[l.liabilityReason]) byReason[l.liabilityReason] = [];
    byReason[l.liabilityReason].push(l);
  }
  const sortedReasons = Object.entries(byReason).sort((a, b) => b[1].length - a[1].length);
  const totalOther = allRepLiabilities.length;

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

      {/* Liability History Accordion */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-800">
            Liability History — <span className="font-normal text-gray-500">{liability.rep.name ?? liability.rep.email}</span>
          </h2>
          <span className="text-xs text-gray-500">
            {totalOther > 0 ? `${totalOther} prior record${totalOther !== 1 ? "s" : ""}` : "No prior records"}
          </span>
        </div>

        {sortedReasons.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">This is the first liability on record for this user.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedReasons.map(([reason, records]) => (
              <details
                key={reason}
                className="group"
                open={reason === liability.liabilityReason}
              >
                <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none hover:bg-gray-50 transition-colors list-none">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* chevron */}
                    <svg className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm text-gray-800 truncate">{reason}</span>
                  </div>
                  <span className="ml-4 shrink-0 text-xs text-gray-500">
                    {records.length} {records.length === 1 ? "time" : "times"}
                  </span>
                </summary>
                <div className="px-5 pb-3 space-y-1.5">
                  {records.map((r) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/liabilities/${r.id}`}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5 text-sm hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <span className="text-gray-700">
                        <span className="font-medium">{format(new Date(r.callDate), "MMM d, yyyy")}</span>
                        <span className="text-gray-400 ml-2 text-xs">Contact: {r.customerName}</span>
                      </span>
                      <Badge variant={statusVariantOf(r.status)}>{statusLabelOf(r.status)}</Badge>
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

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
