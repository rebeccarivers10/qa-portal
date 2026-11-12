"use client";

import { useState } from "react";

interface LookupItem { id: string; name: string; active: boolean; }

interface Props {
  title: string;
  endpoint: string;
  items: LookupItem[];
}

export function LookupManager({ title, endpoint, items: initial }: Props) {
  const [items, setItems] = useState<LookupItem[]>(initial);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!newName.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add.");
    }
    setAdding(false);
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, active } : item));
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm text-gray-800">{title}</h3>

      <div className="space-y-1 max-h-56 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1.5 text-sm">
            <span className={item.active ? "text-gray-800" : "text-gray-400 line-through"}>
              {item.name}
            </span>
            <button
              onClick={() => toggleActive(item.id, !item.active)}
              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                item.active
                  ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                  : "bg-green-50 text-green-600 hover:bg-green-100"
              }`}
            >
              {item.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400">No items yet.</p>}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add new…"
          className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
        />
        <button
          onClick={add}
          disabled={adding || !newName.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white rounded-md disabled:opacity-50"
          style={{ backgroundColor: "var(--lp-blue)" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
