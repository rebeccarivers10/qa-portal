"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageAttacher } from "@/components/ImageAttacher";

interface User { id: string; name: string | null; email: string; }

const LIABILITY_REASONS = [
  "Sales- Third-Party Consent for Call Recordings Policy",
  "User Locations",
  "Other - See Notes",
  "Ongoing Support",
  "AM- Impatience with the Client (Extreme)",
];

const REGIONS = [
  { value: "EAST", label: "East" },
  { value: "WEST", label: "West" },
  { value: "CENTRAL", label: "Central" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SubmitForm() {
  const router = useRouter();
  const [reps, setReps] = useState<User[]>([]);
  const [repId, setRepId] = useState("");
  const [repSearch, setRepSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [contactName, setContactName] = useState("");
  const [callDate, setCallDate] = useState("");

  const [liabilityReason, setLiabilityReason] = useState("");
  const [notes, setNotes] = useState("");
  const [region, setRegion] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users?role=REP").then((r) => r.json()).then(setReps);
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

  // Paste screenshots directly into the notes field
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const newImages = await Promise.all(
      imageItems.map((item) => {
        const file = item.getAsFile();
        return file ? fileToBase64(file) : Promise.resolve(null);
      })
    );
    setImages((prev) => [...prev, ...(newImages.filter(Boolean) as string[])]);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repId || !contactName || !callDate || !liabilityReason || !notes.trim() || !region) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId, customerName: contactName, callDate,
        liabilityReason, notes, region, imageUrls: images,
      }),
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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 shadow-sm">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">{error}</div>}

      {/* User Selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">User *</label>
        <div className="relative">
          <input type="text" value={repSearch}
            onChange={(e) => { setRepSearch(e.target.value); setRepId(""); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search by name or email…"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "var(--lp-blue)" } as React.CSSProperties}
            autoComplete="off"
          />
          {showDropdown && repSearch && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-md mt-1 max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <p className="px-4 py-3 text-sm text-gray-400">No users found</p>
                : filtered.map((rep) => (
                  <button key={rep.id} type="button" onClick={() => selectRep(rep)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors">
                    <span className="font-medium text-gray-800">{rep.name ?? rep.email}</span>
                    {rep.name && <span className="text-gray-400 ml-2 text-xs">{rep.email}</span>}
                  </button>
                ))}
            </div>
          )}
        </div>
        {selectedRep && <p className="text-xs text-green-600">✓ Selected: {selectedRep.name ?? selectedRep.email}</p>}
      </div>

      {/* Contact Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Contact Name *</label>
        <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
          placeholder="e.g. John Smith"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" required />
      </div>

      {/* Call Date */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Call Date *</label>
        <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" required />
      </div>

      {/* Liability Reason */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Liability Reason *</label>
        <select value={liabilityReason} onChange={(e) => setLiabilityReason(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white" required>
          <option value="">Select a reason…</option>
          {LIABILITY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Region */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Region *</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white" required>
          <option value="">Select a region…</option>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Notes *</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          onPaste={handlePaste}
          rows={5}
          placeholder="Describe the liability… paste screenshots directly into this field with Ctrl+V"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2" required />
      </div>

      {/* Screenshots */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Screenshots / Proof</label>
        <ImageAttacher images={images} onChange={setImages} />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Submitting…" : "Submit Liability"}
        </Button>
      </div>
    </form>
  );
}
