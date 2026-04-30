import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminUserTable } from "./AdminUserTable";

export default async function AdminPage() {
  const session = await auth();
  if ((session?.user?.role as string) !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    include: { manager: { select: { id: true, name: true, email: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign roles and managers. New users signing in default to Rep role.
        </p>
      </div>
      <AdminUserTable users={users} />
    </div>
  );
}
