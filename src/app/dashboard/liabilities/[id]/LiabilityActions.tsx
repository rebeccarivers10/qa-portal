"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  liabilityId: string;
  status: string;
  managerAcknowledgedAt: string | null;
  isRep: boolean;
  isManager: boolean;
  isSubmitter: boolean;
}

export function LiabilityActions({ liabilityId, status, managerAcknowledgedAt, isRep, isManager, isSubmitter }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const canAcknowledge = isRep && status === "NEEDS_REVIEW";
  const canManagerAcknowledge = isManager && !managerAcknowledgedAt;
  // Reps can no longer leave notes — only managers and submitters
  const canComment = isManager || isSubmitter;

  async function acknowledge() {
    setLoading(true);
    await fetch(`/api/liabilities/${liabilityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge" }),
    });
    router.refresh();
    setLoading(false);
  }

  async function managerAcknowledge() {
    setLoading(true);
    await fetch(`/api/liabilities/${liabilityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "manager_acknowledge" }),
    });
    router.refresh();
    setLoading(false);
  }

  async function submitComment() {
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/liabilities/${liabilityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", commentBody: body }),
    });
    setBody("");
    router.refresh();
    setLoading(false);
  }

  if (!canAcknowledge && !canManagerAcknowledge && !canComment) return null;

  return (
    <div className="space-y-4">
      {canAcknowledge && (
        <Button onClick={acknowledge} disabled={loading} size="lg">
          Acknowledge Liability
        </Button>
      )}

      {canManagerAcknowledge && (
        <Button onClick={managerAcknowledge} disabled={loading} size="lg" variant="secondary">
          Mark as Reviewed (Manager Acknowledge)
        </Button>
      )}

      {canComment && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Leave a Note</h3>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Type your note here…"
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end">
            <Button onClick={submitComment} disabled={loading || !body.trim()} size="sm">
              Submit Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
