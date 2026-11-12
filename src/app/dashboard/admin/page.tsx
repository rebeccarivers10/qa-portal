import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminUserTable } from "./AdminUserTable";
import { LookupManager } from "./LookupManager";

export default async function AdminPage() {
  const session = await auth();
  if ((session?.user?.role as string) !== "ADMIN") redirect("/dashboard");

  const [users, callTypes, playlists, products] = await Promise.all([
    prisma.user.findMany({
      include: { manager: { select: { id: true, name: true, email: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.callType.findMany({ orderBy: { name: "asc" } }),
    prisma.playlist.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
      </div>

      {/* User Management */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">User Management</h2>
        <p className="text-sm text-gray-500">Assign roles and managers. New users signing in default to Rep role.</p>
        <AdminUserTable users={users} />
      </section>

      {/* Lookup Tables */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Lookup Lists</h2>
        <p className="text-sm text-gray-500">
          Manage the options available in QA Review forms. Deactivating an item hides it from new reviews without deleting historical data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LookupManager
            title="Call Types"
            endpoint="/api/call-types"
            items={callTypes}
          />
          <LookupManager
            title="Playlists"
            endpoint="/api/playlists"
            items={playlists}
          />
          <LookupManager
            title="Products"
            endpoint="/api/products"
            items={products}
          />
        </div>
      </section>
    </div>
  );
}
