import { prisma } from "@/lib/prisma";
import { DemoLoginForm } from "./DemoLoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--lp-navy)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ backgroundColor: "var(--lp-navy-dark)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center font-black text-sm text-white" style={{ backgroundColor: "var(--lp-blue)" }}>
            LP
          </div>
          <span className="font-bold text-white text-sm tracking-widest uppercase">Logical Position</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white uppercase leading-tight tracking-tight">
            QA Portal
          </h1>
          <p className="text-blue-300 text-lg leading-relaxed">
            Quality assurance liability tracking for your sales team.
          </p>
        </div>
        <p className="text-blue-400 text-sm">© {new Date().getFullYear()} Logical Position</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: "var(--lp-navy)" }}>
              Sign In
            </h2>
            <p className="text-sm text-gray-500 mt-1">Select your account to continue</p>
          </div>
          <DemoLoginForm users={users} />
        </div>
      </div>
    </div>
  );
}
