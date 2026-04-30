import { auth } from "@/lib/auth";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { SignOutButton } from "./SignOutButton";

export async function Navbar() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role as string;

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-blue-700 text-lg tracking-tight">
          QA Portal
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          {(role === "SUBMITTER" || role === "ADMIN") && (
            <Link href="/dashboard/submit" className="hover:text-blue-600 transition-colors">
              Submit Liability
            </Link>
          )}
          {(role === "SUBMITTER" || role === "ADMIN") && (
            <Link href="/dashboard/import" className="hover:text-blue-600 transition-colors">
              Import CSV
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
              Admin
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="text-sm text-gray-500">{session.user.name ?? session.user.email}</span>
        <SignOutButton />
      </div>
    </nav>
  );
}
