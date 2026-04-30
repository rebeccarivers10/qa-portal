import { prisma } from "@/lib/prisma";
import { DemoLoginForm } from "./DemoLoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">QA Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Select a user to preview the app</p>
        </div>
        <DemoLoginForm users={users} />
      </div>
    </div>
  );
}
