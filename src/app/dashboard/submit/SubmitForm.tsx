"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface User {
  id: string;
  name: string | null;
  email: string;
}

export function SubmitForm() {
  const router = useRouter();
  const [reps, setReps] = useState<User[]>([]);
  const [repId, setRepId] = useState("");
  const [repSearch, setRepSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [contactDate, setContactDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users?role=REP")
      .then((r) => r.json())
      .then(setReps);
  }, []);

  const filtered = reps.filter((r) => {
    const q = repSearch.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const selectedRep = reps.find((r) => r.id === repId);

  function selectRep(rep: User) {
    setRepId(rep.id);
    setRepSearch(rep.name ?? rep.email);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repId || !contactDate || !notes.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repId, contactDate, notes, imageUrls: [] }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Sales Rep *</label>
        <div className="relative">
          <input
            type="text"
            value={repSearch}
            onChange={(e) => { setRepSearch(e.target.value); setRepId(""); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search by name or email…"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          {showDropdown && repSearch && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1 max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No reps found</p>
              ) : (
                filtered.map((rep) => (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => selectRep(rep)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{rep.name ?? rep.email}</span>
                    {rep.name && <span className="text-gray-400 ml-2">{rep.email}</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedRep && (
          <p className="text-xs text-green-600">Selected: {selectedRep.name ?? selectedRep.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Contact Date *</label>
        <input
          type="date"
          value={contactDate}
          onChange={(e) => setContactDate(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Notes *</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Describe the liability…"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Submitting…" : "Submit Liability"}
        </Button>
      </div>
    </form>
  );
}
