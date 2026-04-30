import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { LiabilityActions } from "./LiabilityActions";

export default async function LiabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const liability = await prisma.liability.findUnique({
    where: { id },
    include: {
      rep: { include: { manager: { select: { id: true, name: true, email: true } } } },
      submitter: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!liability) notFound();

  const role = session.user.role as string;
  const isRep = session.user.id === liability.repId;
  const isManager = session.user.id === liability.rep.managerId;
  const isSubmitter = role === "SUBMITTER" || role === "ADMIN";

  const commentTypeLabel: Record<string, string> = {
    REVIEWEE: "Rep Note",
    MANAGER: "Manager Note",
    SUBMITTER: "Submitter Note",
  };

  const commentColors: Record<string, string> = {
    REVIEWEE: "border-blue-200 bg-blue-50",
    MANAGER: "border-purple-200 bg-purple-50",
    SUBMITTER: "border-gray-200 bg-gray-50",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">QA Liability</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Submitted {format(new Date(liability.createdAt), "MMMM d, yyyy")} by{" "}
            {liability.submitter.name ?? liability.submitter.email}
          </p>
        </div>
        <Badge variant={liability.status === "ACKNOWLEDGED" ? "acknowledged" : "pending"}>
          {liability.status === "ACKNOWLEDGED" ? "Acknowledged" : "Pending"}
        </Badge>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Sales Rep</p>
            <p className="text-gray-900 mt-0.5">
              {liability.rep.name ?? liability.rep.email}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Manager</p>
            <p className="text-gray-900 mt-0.5">
              {liability.rep.manager?.name ?? liability.rep.manager?.email ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Contact Date</p>
            <p className="text-gray-900 mt-0.5">
              {format(new Date(liability.contactDate), "MMMM d, yyyy")}
            </p>
          </div>
          {liability.acknowledgedAt && (
            <div>
              <p className="text-gray-500 font-medium">Acknowledged</p>
              <p className="text-gray-900 mt-0.5">
                {format(new Date(liability.acknowledgedAt), "MMMM d, yyyy h:mm a")}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-gray-500 font-medium text-sm">Notes</p>
          <p className="text-gray-900 mt-1 text-sm leading-relaxed whitespace-pre-wrap">
            {liability.notes}
          </p>
        </div>

        {liability.imageUrls.length > 0 && (
          <div>
            <p className="text-gray-500 font-medium text-sm mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {liability.imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="attachment" className="h-24 w-24 object-cover rounded border border-gray-200" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {liability.comments.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Notes</h2>
          {liability.comments.map((c) => (
            <div
              key={c.id}
              className={`border rounded-lg p-4 text-sm space-y-2 ${commentColors[c.type] ?? "bg-gray-50 border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {c.author.name ?? c.author.id} —{" "}
                  <span className="text-gray-500 font-normal">{commentTypeLabel[c.type]}</span>
                </span>
                <span className="text-gray-400 text-xs">
                  {format(new Date(c.createdAt), "MMM d, yyyy h:mm a")}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
              {c.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {c.imageUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="attachment" className="h-20 w-20 object-cover rounded border border-gray-200" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LiabilityActions
        liabilityId={liability.id}
        status={liability.status}
        isRep={isRep}
        isManager={isManager}
        isSubmitter={isSubmitter}
      />
    </div>
  );
}
