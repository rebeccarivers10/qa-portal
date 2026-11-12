import { auth } from "@/lib/auth";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { SignOutButton } from "./SignOutButton";

export async function Navbar() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role as string;

  return (
    <nav className="h-14 flex items-center justify-between px-6 sticky top-0 z-40" style={{ backgroundColor: "var(--lp-navy)" }}>
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center font-black text-xs" style={{ backgroundColor: "var(--lp-blue)", color: "white" }}>
            LP
          </div>
          <span className="font-bold text-white text-sm tracking-widest uppercase">QA Portal</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="text-blue-200 hover:text-white transition-colors font-medium">
            Dashboard
          </Link>
          <Link href="/dashboard/qa-reviews" className="text-blue-200 hover:text-white transition-colors font-medium">
            QA Reviews
          </Link>
          {(role === "SUBMITTER" || role === "ADMIN") && (
            <Link href="/dashboard/submit" className="text-blue-200 hover:text-white transition-colors font-medium">
              Submit Liability
            </Link>
          )}
          {(role === "SUBMITTER" || role === "ADMIN") && (
            <Link href="/dashboard/import" className="text-blue-200 hover:text-white transition-colors font-medium">
              Import CSV
            </Link>
          )}
          {role === "ADMIN" && (
            <Link href="/dashboard/admin" className="text-blue-200 hover:text-white transition-colors font-medium">
              Admin
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <span className="text-blue-200 text-sm">{session.user.name ?? session.user.email}</span>
        <SignOutButton />
      </div>
    </nav>
  );
}
