import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  const session = await auth();
  const role = session?.user?.role as string;
  if (role !== "SUBMITTER" && role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Historical Data</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV from Quickbase. Required columns:{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">email, contactDate, notes</code>
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
