/**
 * Vercel Cron endpoint — ZRA daily sync.
 *
 * Schedule is defined in vercel.json (currently disabled — set
 * ZRA_CRON_ENABLED=true in Vercel environment variables to activate it).
 *
 * Vercel calls this route via GET with the Authorization header set to
 * Bearer CRON_SECRET. We verify that before running the sync.
 *
 * Required env variables:
 *   CRON_SECRET        — Vercel sets this automatically for cron jobs
 *   QA_REVIEW_API_KEY  — API key for the QA Review endpoint
 *   ZRA_SUBMITTER_ID   — User ID of the system submitter account
 *   ZRA_CRON_ENABLED   — Set to "true" to enable the job (safety flag)
 *
 * Optional (activate real Zoom client):
 *   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "../../../../../integrations/zra/sync.js";

export const runtime = "nodejs"; // needs fs for state file (swap to edge + KV in production)
export const maxDuration = 300;  // 5 minutes — cron jobs can run longer than normal routes

export async function GET(req: NextRequest) {
  // Guard: disabled by default
  if (process.env.ZRA_CRON_ENABLED !== "true") {
    return NextResponse.json(
      { message: "ZRA sync is disabled. Set ZRA_CRON_ENABLED=true to enable." },
      { status: 200 }
    );
  }

  // Guard: Vercel cron auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync({ dryRun: false });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/zra-sync] Fatal error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
