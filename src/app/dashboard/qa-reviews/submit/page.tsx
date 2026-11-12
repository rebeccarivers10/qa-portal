import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QAReviewForm } from "./QAReviewForm";

export default async function SubmitQAReviewPage() {
  const session = await auth();
  const role = session?.user?.role as string;
  if (role !== "SUBMITTER" && role !== "ADMIN") redirect("/dashboard/qa-reviews");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: "var(--lp-navy)" }}>
          Submit QA Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Notifications fire when Feedback Type includes Liability or Coaching Opportunity.
        </p>
      </div>
      <QAReviewForm />
    </div>
  );
}
