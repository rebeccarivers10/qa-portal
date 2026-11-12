import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

const REGION_LABELS: Record<string, string> = { EAST: "East", WEST: "West", CENTRAL: "Central" };
const FEEDBACK_LABELS: Record<string, string> = {
  NO_QA_LIABILITIES: "No QA Liabilities",
  COACHING_OPPORTUNITY: "Coaching Opportunity",
  LIABILITY: "Liability",
};
const SOURCE_LABELS: Record<string, string> = {
  ZRA: "ZRA", ZOOM: "Zoom", HUBSPOT: "HubSpot", UPLOAD: "Upload",
};

export default async function QAReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const review = await prisma.qAReview.findUnique({
    where: { id },
    include: {
      rep: { include: { manager: { select: { id: true, name: true, email: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      callType: true,
      playlists: { include: { playlist: true } },
      products: { include: { product: true } },
    },
  });

  if (!review) notFound();

  const role = session.user.role as string;
  const hasLiability = review.feedbackTypes.includes("LIABILITY");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/qa-reviews" className="text-sm text-blue-600 hover:underline">← QA Reviews</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">QA Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Submitted {format(new Date(review.createdAt), "MMMM d, yyyy")} by{" "}
            {review.submitter.name ?? review.submitter.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {review.feedbackTypes.map((ft) => (
            <span key={ft} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              ft === "LIABILITY" ? "bg-red-100 text-red-700"
              : ft === "COACHING_OPPORTUNITY" ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
            }`}>
              {FEEDBACK_LABELS[ft] ?? ft}
            </span>
          ))}
        </div>
      </div>

      {/* Main info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">User</p>
            <p className="text-gray-900 mt-0.5">{review.rep.name ?? review.rep.email}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Manager</p>
            <p className="text-gray-900 mt-0.5">{review.rep.manager?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Call Date</p>
            <p className="text-gray-900 mt-0.5">{format(new Date(review.callDate), "MMMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Call Type</p>
            <p className="text-gray-900 mt-0.5">{review.callType.name}</p>
          </div>
          {review.recordingUrl && (
            <div>
              <p className="text-gray-500 font-medium">
                Recording {review.recordingSource ? `(${SOURCE_LABELS[review.recordingSource] ?? review.recordingSource})` : ""}
              </p>
              <a href={review.recordingUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline mt-0.5 block truncate">
                Open Recording
              </a>
            </div>
          )}
        </div>

        {/* QA Notes */}
        <div>
          <p className="text-gray-500 font-medium text-sm">QA Notes</p>
          <p className="text-gray-900 mt-1 text-sm leading-relaxed whitespace-pre-wrap">{review.notes}</p>
        </div>

        {/* Screenshots */}
        {review.imageUrls.length > 0 && (
          <div>
            <p className="text-gray-500 font-medium text-sm mb-2">Screenshots / Proof</p>
            <div className="flex flex-wrap gap-2">
              {review.imageUrls.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                  <img src={src} alt={`attachment ${i + 1}`}
                    className="h-24 w-24 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Liability details — only shown when LIABILITY is in feedbackTypes */}
      {hasLiability && (
        <div className="bg-white border border-red-200 rounded-lg p-6 space-y-3">
          <h2 className="font-semibold text-sm text-red-700 uppercase tracking-wide">Liability Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Liability Reason</p>
              <p className="text-gray-900 mt-0.5">{review.liabilityReason ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Region</p>
              <p className="text-gray-900 mt-0.5">{review.region ? (REGION_LABELS[review.region] ?? review.region) : "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Playlists */}
      {review.playlists.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-sm text-gray-800 mb-3">Playlists</h2>
          <div className="flex flex-wrap gap-2">
            {review.playlists.map((p) => (
              <span key={p.playlistId}
                className="text-xs font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {p.playlist.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      {review.products.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-sm text-gray-800 mb-3">Products</h2>
          <div className="flex flex-wrap gap-2">
            {review.products.map((p) => (
              <span key={p.productId}
                className="text-xs font-medium px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                {p.product.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
