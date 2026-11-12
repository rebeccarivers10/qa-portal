"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageAttacher } from "@/components/ImageAttacher";

interface User { id: string; name: string | null; email: string; manager?: { id: string; name: string | null } | null; }
interface LookupItem { id: string; name: string; }

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

const FEEDBACK_OPTIONS = [
  { value: "NO_QA_LIABILITIES", label: "No QA Liabilities" },
  { value: "COACHING_OPPORTUNITY", label: "Coaching Opportunity" },
  { value: "LIABILITY", label: "Liability" },
];

const RECORDING_SOURCES = [
  { value: "ZRA", label: "ZRA" },
  { value: "ZOOM", label: "Zoom" },
  { value: "HUBSPOT", label: "HubSpot" },
  { value: "UPLOAD", label: "Upload" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Searchable multi-select checkbox list
function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string;
  options: LookupItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type="text"
        placeholder={`Search ${label.toLowerCase()}…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
      />
      <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-400">No results</p>
        ) : (
          filtered.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="rounded"
              />
              {o.name}
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500">{selected.length} selected</p>
      )}
    </div>
  );
}

export function QAReviewForm() {
  const router = useRouter();

  // Rep selector
  const [reps, setReps] = useState<User[]>([]);
  const [repId, setRepId] = useState("");
  const [repSearch, setRepSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [managerName, setManagerName] = useState("");

  // Lookup data
  const [callTypes, setCallTypes] = useState<LookupItem[]>([]);
  const [playlists, setPlaylists] = useState<LookupItem[]>([]);
  const [products, setProducts] = useState<LookupItem[]>([]);

  // Form state
  const [callDate, setCallDate] = useState("");
  const [callTypeId, setCallTypeId] = useState("");
  const [recordingSource, setRecordingSource] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
  const [feedbackTypes, setFeedbackTypes] = useState<string[]>([]);
  const [liabilityReason, setLiabilityReason] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const needsLiabilityFields = feedbackTypes.includes("LIABILITY");

  useEffect(() => {
    fetch("/api/users?role=REP").then((r) => r.json()).then(setReps);
    fetch("/api/call-types").then((r) => r.json()).then(setCallTypes);
    fetch("/api/playlists").then((r) => r.json()).then(setPlaylists);
    fetch("/api/products").then((r) => r.json()).then(setProducts);
  }, []);

  const filtered = reps.filter((r) => {
    const q = repSearch.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const selectedRep = reps.find((r) => r.id === repId);

  function selectRep(rep: User) {
    setRepId(rep.id);
    setRepSearch(rep.name ?? rep.email);
    setManagerName(rep.manager?.name ?? "—");
    setShowDropdown(false);
  }

  function toggleFeedback(value: string) {
    setFeedbackTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

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
    if (!repId || !callDate || !callTypeId || feedbackTypes.length === 0 || !notes.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (needsLiabilityFields && (!liabilityReason || !region)) {
      setError("Liability Reason and Region are required when Liability is selected.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/qa-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        callDate,
        callTypeId,
        recordingUrl: recordingUrl || null,
        recordingSource: recordingSource || null,
        feedbackTypes,
        liabilityReason: needsLiabilityFields ? liabilityReason : null,
        region: needsLiabilityFields ? region : null,
        notes,
        playlistIds: selectedPlaylists,
        productIds: selectedProducts,
        imageUrls: images,
      }),
    });

    if (res.ok) {
      router.push("/dashboard/qa-reviews");
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

      {/* Rep selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">User *</label>
        <div className="relative">
          <input type="text" value={repSearch}
            onChange={(e) => { setRepSearch(e.target.value); setRepId(""); setManagerName(""); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search by name or email…"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
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

      {/* Manager (read-only) */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Manager</label>
        <input type="text" value={managerName || "—"} readOnly
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
      </div>

      {/* Call Date */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Call Date *</label>
        <input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" required />
      </div>

      {/* Call Type */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Call Type *</label>
        <select value={callTypeId} onChange={(e) => setCallTypeId(e.target.value)}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white" required>
          <option value="">Select a call type…</option>
          {callTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
        </select>
      </div>

      {/* Call Recording */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">
          Call Recording <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <select value={recordingSource} onChange={(e) => { setRecordingSource(e.target.value); setRecordingUrl(""); }}
            className="col-span-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white">
            <option value="">Source…</option>
            {RECORDING_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {recordingSource && recordingSource !== "UPLOAD" && (
            <input type="url" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="Paste recording URL…"
              className="col-span-2 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" />
          )}
          {recordingSource === "UPLOAD" && (
            <div className="col-span-2 border border-dashed border-gray-300 rounded-md px-3 py-2 text-xs text-gray-400">
              {/* File storage not configured — swap this component for an upload handler */}
              File upload storage not yet configured. Paste a URL after uploading manually.
            </div>
          )}
        </div>
      </div>

      {/* Feedback Type */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Feedback Type *</label>
        <div className="space-y-2">
          {FEEDBACK_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={feedbackTypes.includes(opt.value)}
                onChange={() => toggleFeedback(opt.value)} className="rounded" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Liability fields — conditional */}
      {needsLiabilityFields && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Liability Details</p>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Liability Reason *</label>
            <select value={liabilityReason} onChange={(e) => setLiabilityReason(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white">
              <option value="">Select a reason…</option>
              {LIABILITY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Region *</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white">
              <option value="">Select a region…</option>
              {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* QA Notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">QA Notes *</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          onPaste={handlePaste}
          rows={5}
          placeholder="Enter QA notes… paste screenshots directly with Ctrl+V"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2" required />
      </div>

      {/* Playlists */}
      <MultiSelect
        label="Playlists"
        options={playlists}
        selected={selectedPlaylists}
        onChange={setSelectedPlaylists}
      />

      {/* Products */}
      <MultiSelect
        label="Products"
        options={products}
        selected={selectedProducts}
        onChange={setSelectedProducts}
      />

      {/* Screenshots */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Screenshots / Proof</label>
        <ImageAttacher images={images} onChange={setImages} />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Submitting…" : "Submit QA Review"}
        </Button>
      </div>
    </form>
  );
}
