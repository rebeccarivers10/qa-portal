import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { DateRangeFilter } from "@/components/DateRangeFilter";

export const dynamic = "force-dynamic";

const REGION_LABELS: Record<string, string> = { EAST: "East", WEST: "West", CENTRAL: "Central" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { from, to } = await searchParams;
  const role = session.user.role as string;

  const dateFilter = (from || to) ? {
    callDate: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  } : {};

  let liabilities;

  if (role === "REP") {
    liabilities = await prisma.liability.findMany({
      where: { repId: session.user.id, ...dateFilter },
      include: { submitter: { select: { name: true, email: true } }, rep: { select: { id: true, name: true, email: true, manager: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "MANAGER") {
    const reps = await prisma.user.findMany({ where: { managerId: session.user.id }, select: { id: true } });
    liabilities = await prisma.liability.findMany({
      where: { repId: { in: reps.map((r) => r.id) }, ...dateFilter },
      include: { rep: { select: { id: true, name: true, email: true, manager: { select: { name: true } } } }, submitter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  } else {
    liabilities = await prisma.liability.findMany({
      where: dateFilter,
      include: { rep: { select: { id: true, name: true, email: true, hireDate: true, manager: { select: { name: true } } } as { id: true; name: true; email: true; hireDate: true; manager: { select: { name: true } } } }, submitter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // Count liabilities per rep
  const repCounts: Record<string, number> = {};
  for (const l of liabilities) {
    repCounts[l.repId] = (repCounts[l.repId] ?? 0) + 1;
  }

  const needsReview = liabilities.filter((l) => l.status === "NEEDS_REVIEW").length;
  const acknowledged = liabilities.filter((l) => l.status !== "NEEDS_REVIEW").length;
  const showDateFilter = role !== "REP";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {session.user.name ?? session.user.email}</p>
        </div>
        {(role === "SUBMITTER" || role === "ADMIN") && (
          <Link href="/dashboard/submit" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            + Submit Liability
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{liabilities.length}</p>
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

      {showDateFilter && <DateRangeFilter />}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-800">Liabilities</div>
        {liabilities.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">No liabilities found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                {role !== "REP" && <th className="px-4 py-3">Rep</th>}
                {role !== "REP" && <th className="px-4 py-3">Manager</th>}
                <th className="px-4 py-3">Contact Name</th>
                <th className="px-4 py-3">Call Date</th>
                <th className="px-4 py-3">Call Length</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Region</th>
                {(role === "SUBMITTER" || role === "ADMIN") && <th className="px-4 py-3">Hire Date</th>}
                {role !== "REP" && <th className="px-4 py-3 text-center">Count</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {liabilities.map((l) => {
                const rep = "rep" in l ? (l as { rep: { id: string; name: string | null; email: string; manager?: { name: string | null } | null } }).rep : null;
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    {role !== "REP" && (
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {rep ? (
                          <Link href={`/reps/${l.repId}`} className="hover:text-blue-600 hover:underline">
                            {rep.name ?? rep.email}
                          </Link>
                        ) : "—"}
                      </td>
                    )}
                    {role !== "REP" && (
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {rep?.manager?.name ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{l.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(l.callDate), "MM-dd-yyyy")}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.callLength}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                      <p className="truncate" title={l.liabilityReason}>{l.liabilityReason}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{REGION_LABELS[l.region] ?? l.region}</td>
                    {(role === "SUBMITTER" || role === "ADMIN") && (
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {rep && "hireDate" in rep && (rep as { hireDate?: Date | null }).hireDate
                          ? format(new Date((rep as { hireDate: Date }).hireDate), "MM-dd-yyyy")
                          : "—"}
                      </td>
                    )}
                    {role !== "REP" && (
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {repCounts[l.repId] ?? 1}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={l.status === "NEEDS_REVIEW" ? "needs_review" : "acknowledged"}>
                        {l.status === "NEEDS_REVIEW" ? "Needs Review" : l.status === "MANAGER_ACKNOWLEDGED" ? "Mgr Acknowledged" : "Acknowledged"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/liabilities/${l.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
