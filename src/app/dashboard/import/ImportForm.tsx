"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Row {
  email: string;
  contactDate: string;
  notes: string;
}

export function ImportForm() {
  const [rows, setRows] = useState<Row[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function parseCSV(text: string): Row[] {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const emailIdx = headers.indexOf("email");
    const dateIdx = headers.indexOf("contactdate");
    const notesIdx = headers.indexOf("notes");

    if (emailIdx === -1 || dateIdx === -1 || notesIdx === -1) {
      setError("CSV must have columns: email, contactDate, notes");
      return [];
    }

    return lines.slice(1).map((line) => {
      const cols = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) =>
        c.trim().replace(/^"|"$/g, "")
      );
      return {
        email: cols[emailIdx] ?? "",
        contactDate: cols[dateIdx] ?? "",
        notes: cols[notesIdx] ?? "",
      };
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(data);
      setRows([]);
    } else {
      setError(data.error ?? "Import failed.");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-md px-4 py-3 space-y-1">
          <p className="font-medium">Import complete</p>
          <p>{result.imported} liabilities imported.</p>
          {result.skipped.length > 0 && (
            <p className="text-yellow-700">
              Skipped (email not found): {result.skipped.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Upload CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{rows.length} rows ready to import.</p>
          <div className="border border-gray-200 rounded-md overflow-auto max-h-64">
            <table className="text-xs w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500">Email</th>
                  <th className="px-3 py-2 text-left text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-700">{r.email}</td>
                    <td className="px-3 py-2 text-gray-700">{r.contactDate}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="px-3 py-2 text-xs text-gray-400">…and {rows.length - 20} more rows</p>
            )}
          </div>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importing…" : `Import ${rows.length} records`}
          </Button>
        </div>
      )}
    </div>
  );
}
