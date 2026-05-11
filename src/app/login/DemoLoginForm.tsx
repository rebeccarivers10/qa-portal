"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  SUBMITTER: "QA Submitter",
  MANAGER: "Manager",
  REP: "User",
  ADMIN: "Admin",
};

const roleColors: Record<string, string> = {
  SUBMITTER: "bg-blue-100 text-blue-700",
  MANAGER: "bg-purple-100 text-purple-700",
  REP: "bg-gray-100 text-gray-600",
  ADMIN: "bg-red-100 text-red-700",
};

export function DemoLoginForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function login(userId: string) {
    setLoading(userId);
    await signIn("credentials", { userId, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  const grouped = users.reduce<Record<string, User[]>>((acc, u) => {
    acc[u.role] = acc[u.role] ?? [];
    acc[u.role].push(u);
    return acc;
  }, {});

  const order = ["SUBMITTER", "MANAGER", "REP"];

  return (
    <div className="space-y-5">
      {order.filter((r) => grouped[r]).map((role) => (
        <div key={role}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            {roleLabels[role]}
          </p>
          <div className="space-y-1.5">
            {grouped[role].map((u) => (
              <button
                key={u.id}
                onClick={() => login(u.id)}
                disabled={!!loading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 text-left group"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {u.name ?? u.email}
                  </p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${roleColors[role]}`}>
                  {loading === u.id ? "…" : roleLabels[role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
