import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role as string;
  let liabilities;

  if (role === "REP") {
    liabilities = await prisma.liability.findMany({
      where: { repId: session.user.id },
      include: { submitter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === "MANAGER") {
    const reps = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    liabilities = await prisma.liability.findMany({
      where: { repId: { in: reps.map((r) => r.id) } },
      include: {
        rep: { select: { name: true, email: true } },
        submitter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    liabilities = await prisma.liability.findMany({
      include: {
        rep: { select: { name: true, email: true } },
        submitter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const pending = liabilities.filter((l) => l.status === "PENDING").length;
  const acknowledged = liabilities.filter((l) => l.status === "ACKNOWLEDGED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {session.user.name ?? session.user.email}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{liabilities.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Acknowledged</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{acknowledged}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Liabilities</h2>
          {(role === "SUBMITTER" || role === "ADMIN") && (
            <Link
              href="/dashboard/submit"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              + Submit Liability
            </Link>
          )}
        </div>

        {liabilities.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">No liabilities found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                {role !== "REP" && <th className="px-6 py-3">Rep</th>}
                <th className="px-6 py-3">Contact Date</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Submitted</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {liabilities.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  {role !== "REP" && (
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {"rep" in l ? (
                        <Link href={`/reps/${l.repId}`} className="hover:text-blue-600 hover:underline">
                          {(l as { rep: { name: string | null; email: string } }).rep.name ??
                            (l as { rep: { name: string | null; email: string } }).rep.email}
                        </Link>
                      ) : null}
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-600">
                    {format(new Date(l.contactDate), "MM-dd-yyyy")}
                  </td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs">
                    <p className="line-clamp-2">{l.notes}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={l.status === "ACKNOWLEDGED" ? "acknowledged" : "pending"}>
                      {l.status === "ACKNOWLEDGED" ? "Acknowledged" : "Pending"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {format(new Date(l.createdAt), "MM-dd-yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/liabilities/${l.id}`}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
