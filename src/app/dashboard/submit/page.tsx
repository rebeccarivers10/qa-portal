import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubmitForm } from "./SubmitForm";

export default async function SubmitPage() {
  const session = await auth();
  const role = session?.user?.role as string;

  if (role !== "SUBMITTER" && role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: "var(--lp-navy)" }}>Submit Liability</h1>
        <p className="text-sm text-gray-500 mt-1">
          The user and their manager will be notified in-app.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
