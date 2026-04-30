"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  liabilityId: string;
  status: string;
  isRep: boolean;
  isManager: boolean;
  isSubmitter: boolean;
}

export function LiabilityActions({ liabilityId, status, isRep, isManager, isSubmitter }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const canComment = isRep || isManager || isSubmitter;
  const canAcknowledge = isRep && status === "PENDING";

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

  async function submitComment() {
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/liabilities/${liabilityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", commentBody: body, commentImageUrls: [] }),
    });
    setBody("");
    router.refresh();
    setLoading(false);
  }

  if (!canAcknowledge && !canComment) return null;

  return (
    <div className="space-y-4">
      {canAcknowledge && (
        <Button onClick={acknowledge} disabled={loading} size="lg">
          Acknowledge Liability
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
