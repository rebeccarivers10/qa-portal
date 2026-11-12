import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const REGION_LABELS: Record<string, string> = { EAST: "East", WEST: "West", CENTRAL: "Central" };
const FEEDBACK_LABELS: Record<string, string> = {
  NO_QA_LIABILITIES: "No QA Liabilities",
  COACHING_OPPORTUNITY: "Coaching Opportunity",
  LIABILITY: "Liability",
};

export default async function QAReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    repId?: string;
    managerId?: string;
    callTypeId?: string;
    feedbackType?: string;
    playlistId?: string;
    productId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role as string;
  const params = await searchParams;

  // Build where clause
  let where: Record<string, unknown> = {};

  if (role === "REP") {
    where.repId = session.user.id;
  } else if (role === "MANAGER") {
    const reps = await prisma.user.findMany({
      where: { managerId: session.user.id },
      select: { id: true },
    });
    where.repId = { in: reps.map((r) => r.id) };
  }

  if (params.repId && role !== "REP") where.repId = params.repId;
  if (params.managerId && role !== "REP") {
    const reps = await prisma.user.findMany({
      where: { managerId: params.managerId },
      select: { id: true },
    });
    where.repId = { in: reps.map((r) => r.id) };
  }
  if (params.callTypeId) where.callTypeId = params.callTypeId;
  if (params.feedbackType) where.feedbackTypes = { has: params.feedbackType };
  if (params.playlistId) where.playlists = { some: { playlistId: params.playlistId } };
  if (params.productId) where.products = { some: { productId: params.productId } };
  if (params.from || params.to) {
    where.callDate = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to) } : {}),
    };
  }

  const [reviews, callTypes, playlists, products, managers] = await Promise.all([
    prisma.qAReview.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true, email: true, manager: { select: { id: true, name: true } } } },
        submitter: { select: { name: true, email: true } },
        callType: true,
        playlists: { include: { playlist: true } },
        products: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.callType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.playlist.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    role !== "REP"
      ? prisma.user.findMany({ where: { role: "MANAGER" }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const isSubmitterOrAdmin = role === "SUBMITTER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">{reviews.length} record{reviews.length !== 1 ? "s" : ""}</p>
        </div>
        {isSubmitterOrAdmin && (
          <Link href="/dashboard/qa-reviews/submit"
            className="text-xs font-bold uppercase tracking-wide text-white px-5 py-2.5 rounded transition-colors"
            style={{ backgroundColor: "var(--lp-blue)" }}>
            + Submit Review
          </Link>
        )}
      </div>

      {/* Filters */}
      {role !== "REP" && (
        <form method="GET" className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {role !== "MANAGER" && (
            <select name="managerId" defaultValue={params.managerId ?? ""}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">All Managers</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <select name="callTypeId" defaultValue={params.callTypeId ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">All Call Types</option>
            {callTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
          </select>
          <select name="feedbackType" defaultValue={params.feedbackType ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">All Feedback Types</option>
            <option value="NO_QA_LIABILITIES">No QA Liabilities</option>
            <option value="COACHING_OPPORTUNITY">Coaching Opportunity</option>
            <option value="LIABILITY">Liability</option>
          </select>
          <select name="playlistId" defaultValue={params.playlistId ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">All Playlists</option>
            {playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select name="productId" defaultValue={params.productId ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">All Products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
          <input type="date" name="to" defaultValue={params.to ?? ""}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit"
              className="px-4 py-2 text-sm font-medium text-white rounded-md"
              style={{ backgroundColor: "var(--lp-blue)" }}>
              Filter
            </button>
            <Link href="/dashboard/qa-reviews"
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
              Clear
            </Link>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
        {reviews.length === 0 ? (
          <p className="px-6 py-10 text-sm text-gray-400 text-center">No reviews found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold text-white uppercase tracking-widest"
                style={{ backgroundColor: "var(--lp-navy)" }}>
                {role !== "REP" && <th className="px-4 py-3">User</th>}
                {role !== "REP" && <th className="px-4 py-3">Manager</th>}
                <th className="px-4 py-3">Call Date</th>
                <th className="px-4 py-3">Call Type</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Playlists</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Submitted By</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  {role !== "REP" && (
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <Link href={`/reps/${r.repId}`} className="hover:text-blue-600 hover:underline">
                        {r.rep.name ?? r.rep.email}
                      </Link>
                    </td>
                  )}
                  {role !== "REP" && (
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {r.rep.manager?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(r.callDate), "MM-dd-yyyy")}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.callType.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.feedbackTypes.map((ft) => (
                        <span key={ft} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ft === "LIABILITY" ? "bg-red-100 text-red-700"
                          : ft === "COACHING_OPPORTUNITY" ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                        }`}>
                          {FEEDBACK_LABELS[ft] ?? ft}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px]">
                    <p className="truncate text-xs" title={r.playlists.map((p) => p.playlist.name).join(", ")}>
                      {r.playlists.length > 0 ? r.playlists.map((p) => p.playlist.name).join(", ") : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px]">
                    <p className="truncate text-xs" title={r.products.map((p) => p.product.name).join(", ")}>
                      {r.products.length > 0 ? r.products.map((p) => p.product.name).join(", ") : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {r.submitter.name ?? r.submitter.email}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/qa-reviews/${r.id}`}
                      className="text-blue-600 hover:underline text-xs font-medium">
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
