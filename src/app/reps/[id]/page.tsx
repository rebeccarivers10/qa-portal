import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { Navbar } from "@/components/Navbar";

const REGION_LABELS: Record<string, string> = { EAST: "East", WEST: "West", CENTRAL: "Central" };

const ALL_LIABILITY_REASONS = [
  "Sales- Third-Party Consent for Call Recordings Policy",
  "User Locations",
  "Other - See Notes",
  "Ongoing Support",
  "AM- Impatience with the Client (Extreme)",
];

export default async function RepHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role as string;
  const canSeeCountDropdown = role === "MANAGER" || role === "SUBMITTER" || role === "ADMIN";

  const { id } = await params;
  const rep = await prisma.user.findUnique({
    where: { id },
    include: {
      manager: { select: { name: true, email: true } },
      liabilities: {
        include: { submitter: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!rep) notFound();

  const needsReview = rep.liabilities.filter((l) => l.status === "NEEDS_REVIEW").length;
  const acknowledged = rep.liabilities.filter((l) => l.status !== "NEEDS_REVIEW").length;

  // Count per reason for the dropdown
  const countByReason: Record<string, number> = {};
  for (const l of rep.liabilities) {
    countByReason[l.liabilityReason] = (countByReason[l.liabilityReason] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{rep.name ?? rep.email}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rep.email} · Manager: {rep.manager?.name ?? "—"}
            {rep.hireDate && ` · Hired: ${format(new Date(rep.hireDate), "MM-dd-yyyy")}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Liabilities</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{rep.liabilities.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Needs Review</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{needsReview}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Acknowledged</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{acknowledged}</p>
          </div>
        </div>

        {/* Liability count dropdown — managers and submitters only */}
        {canSeeCountDropdown && (
          <details className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors list-none">
              <span className="font-semibold text-sm text-gray-800">Liability Count by Type</span>
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
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-800">Liability History</div>
          {rep.liabilities.length === 0 ? (
            <p className="px-6 py-10 text-sm text-gray-400 text-center">No liabilities on record.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Contact Name</th>
                  <th className="px-4 py-3">Call Date</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rep.liabilities.map((l) => {
                  const statusVariant = l.status === "NEEDS_REVIEW" ? "needs_review" : "acknowledged";
                  const statusLabel = l.status === "NEEDS_REVIEW" ? "Needs Review" : "Acknowledged";
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{l.customerName}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(l.callDate), "MM-dd-yyyy")}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[160px]">
                        <p className="truncate" title={l.liabilityReason}>{l.liabilityReason}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{REGION_LABELS[l.region] ?? l.region}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.submitter.name ?? l.submitter.email}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/liabilities/${l.id}`} className="text-blue-600 hover:underline text-xs font-medium">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
