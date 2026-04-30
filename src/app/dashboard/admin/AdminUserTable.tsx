"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Role = "REP" | "MANAGER" | "SUBMITTER" | "ADMIN";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  manager: { id: string; name: string | null; email: string } | null;
}

export function AdminUserTable({ users }: { users: User[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, Role>>({});
  const [managerMap, setManagerMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const managers = users.filter((u) => u.role === "MANAGER" || u.role === "ADMIN");

  async function save(userId: string) {
    setSaving(true);
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        userRole: roleMap[userId],
        managerId: managerMap[userId] ?? null,
      }),
    });
    setSaving(false);
    setEditing(null);
    window.location.reload();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="px-6 py-3">User</th>
            <th className="px-6 py-3">Role</th>
            <th className="px-6 py-3">Manager</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-3">
                <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
                {u.name && <p className="text-gray-400 text-xs">{u.email}</p>}
              </td>
              <td className="px-6 py-3">
                {editing === u.id ? (
                  <select
                    value={roleMap[u.id] ?? u.role}
                    onChange={(e) => setRoleMap((m) => ({ ...m, [u.id]: e.target.value as Role }))}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    {(["REP", "MANAGER", "SUBMITTER", "ADMIN"] as Role[]).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-700">{u.role}</span>
                )}
              </td>
              <td className="px-6 py-3">
                {editing === u.id ? (
                  <select
                    value={managerMap[u.id] ?? u.manager?.id ?? ""}
                    onChange={(e) => setManagerMap((m) => ({ ...m, [u.id]: e.target.value }))}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="">— None —</option>
                    {managers
                      .filter((m) => m.id !== u.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                      ))}
                  </select>
                ) : (
                  <span className="text-gray-500">
                    {u.manager?.name ?? u.manager?.email ?? "—"}
                  </span>
                )}
              </td>
              <td className="px-6 py-3 text-right">
                {editing === u.id ? (
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => save(u.id)} disabled={saving}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(u.id);
                      setRoleMap((m) => ({ ...m, [u.id]: u.role }));
                      setManagerMap((m) => ({ ...m, [u.id]: u.manager?.id ?? "" }));
                    }}
                  >
                    Edit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
