/**
 * Part 2 — Daily sync job.
 *
 * Usage (standalone):
 *   npx tsx integrations/zra/sync.ts
 *   npx tsx integrations/zra/sync.ts --dry-run
 *
 * What it does:
 *   1. Reads the last successful run timestamp from state.
 *   2. Fetches conversations from ZRA since that timestamp.
 *   3. Filters to those where a watched indicator fired.
 *   4. Skips any whose ZRA conversation ID already exists in the QA Reviews API.
 *   5. Maps each to a QA Review payload and POSTs it.
 *   6. Logs the run summary and updates state on success.
 *
 * --dry-run: prints what would be created without calling the QA API.
 *
 * This function is also called by the Vercel cron route at
 * src/app/api/cron/zra-sync/route.ts.
 */

import { getZRAClient } from "./index.js";
import {
  INDICATOR_IDS_TO_WATCH,
  CALL_TYPE_MAP,
  QA_API_BASE_URL,
} from "./config.js";
import { readState, writeState, getSyncFrom } from "./state.js";
import type { ZRAConversation, ZRAConversationAnalysis } from "./client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncResult {
  conversationsChecked: number;
  reviewsCreated: number;
  reviewsSkipped: number;
  errors: string[];
  dryRun: boolean;
}

interface QAReviewPayload {
  repId: string;
  submitterId: string;
  callDate: string;
  callTypeId: string | null;
  recordingUrl: string | null;
  recordingSource: "ZRA";
  feedbackTypes: ["LIABILITY"];
  liabilityReason: string;
  region: null;
  notes: string;
  externalId: string; // ZRA conversation ID stored in notes for dedup
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveCallTypeName(topic: string): string {
  const lower = topic.toLowerCase();
  for (const [key, val] of Object.entries(CALL_TYPE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "Cold Call";
}

function buildNotes(
  conv: ZRAConversation,
  analysis: ZRAConversationAnalysis
): string {
  const firedIndicators = analysis.indicators
    .filter((i) => INDICATOR_IDS_TO_WATCH.includes(i.indicatorId) && i.fired)
    .map((i) => `${i.indicatorName} (${i.occurrences}x)`)
    .join(", ");

  return (
    `Auto-imported from ZRA. Conversation ID: ${conv.id}\n` +
    `Topic: ${conv.topic}\n` +
    `Indicators fired: ${firedIndicators}`
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchExistingExternalIds(apiKey: string): Promise<Set<string>> {
  const res = await fetch(`${QA_API_BASE_URL}/api/qa-reviews`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch existing reviews: ${res.status}`);
  }

  const reviews = (await res.json()) as Array<{ notes?: string }>;
  const ids = new Set<string>();
  for (const r of reviews) {
    const match = r.notes?.match(/Conversation ID: (\S+)/);
    if (match) ids.add(match[1]);
  }
  return ids;
}

async function fetchCallTypeId(
  name: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(`${QA_API_BASE_URL}/api/call-types`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) return null;
  const types = (await res.json()) as Array<{ id: string; name: string; active: boolean }>;
  return types.find((t) => t.active && t.name === name)?.id ?? null;
}

async function fetchRepIdByEmail(
  email: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(
    `${QA_API_BASE_URL}/api/users?email=${encodeURIComponent(email)}`,
    { headers: { "x-api-key": apiKey } }
  );
  if (!res.ok) return null;
  const users = (await res.json()) as Array<{ id: string; email: string; role: string }>;
  return users.find((u) => u.email === email)?.id ?? null;
}

async function postReview(
  payload: Omit<QAReviewPayload, "externalId"> & { notes: string },
  apiKey: string,
  submitterId: string
): Promise<void> {
  const res = await fetch(`${QA_API_BASE_URL}/api/qa-reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ ...payload, submitterId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /api/qa-reviews failed (${res.status}): ${text}`);
  }
}

// ── Core sync function ────────────────────────────────────────────────────────

export async function runSync(options: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const { dryRun = false } = options;
  const result: SyncResult = {
    conversationsChecked: 0,
    reviewsCreated: 0,
    reviewsSkipped: 0,
    errors: [],
    dryRun,
  };

  const apiKey = process.env.QA_REVIEW_API_KEY;
  const submitterId = process.env.ZRA_SUBMITTER_ID;

  if (!apiKey) {
    throw new Error("QA_REVIEW_API_KEY env variable is required for the sync job.");
  }
  if (!submitterId) {
    throw new Error("ZRA_SUBMITTER_ID env variable is required (the user ID of the submitter account).");
  }

  const client = getZRAClient();
  const state = readState();
  const from = getSyncFrom(state);
  const to = new Date();

  console.log(
    `[zra-sync] ${dryRun ? "DRY RUN — " : ""}Fetching conversations from ${from.toISOString()} to ${to.toISOString()}`
  );

  // Load existing conversation IDs to skip duplicates
  let existingIds: Set<string>;
  try {
    existingIds = dryRun ? new Set() : await fetchExistingExternalIds(apiKey);
    console.log(`[zra-sync] ${existingIds.size} existing conversation IDs loaded.`);
  } catch (err) {
    throw new Error(`Could not fetch existing reviews: ${(err as Error).message}`);
  }

  // CallType ID cache
  const callTypeIdCache = new Map<string, string | null>();

  for await (const conv of client.listConversations({ from, to })) {
    result.conversationsChecked++;

    // Skip if already synced
    if (!dryRun && existingIds.has(conv.id)) {
      result.reviewsSkipped++;
      console.log(`[zra-sync] SKIP ${conv.id} — already exists`);
      continue;
    }

    // Get analysis
    let analysis: ZRAConversationAnalysis;
    try {
      analysis = await client.getConversationAnalysis(conv.id);
    } catch (err) {
      const msg = `Failed to get analysis for ${conv.id}: ${(err as Error).message}`;
      result.errors.push(msg);
      console.error(`[zra-sync] ERROR ${msg}`);
      continue;
    }

    // Check if any watched indicator fired
    const watchedFired = analysis.indicators.filter(
      (i) => INDICATOR_IDS_TO_WATCH.includes(i.indicatorId) && i.fired
    );
    if (watchedFired.length === 0) {
      console.log(`[zra-sync] SKIP ${conv.id} — no watched indicators fired`);
      result.reviewsSkipped++;
      continue;
    }

    // Map to QA Review payload
    const callTypeName = resolveCallTypeName(conv.topic);

    if (!callTypeIdCache.has(callTypeName)) {
      callTypeIdCache.set(callTypeName, dryRun ? "dry-run-id" : await fetchCallTypeId(callTypeName, apiKey));
    }
    const callTypeId = callTypeIdCache.get(callTypeName) ?? null;

    let repId: string | null = null;
    if (!dryRun) {
      try {
        repId = await fetchRepIdByEmail(conv.hostEmail, apiKey);
      } catch {
        // non-fatal — log and skip
      }
      if (!repId) {
        const msg = `Rep not found for email ${conv.hostEmail} (conv ${conv.id}) — skipping`;
        result.errors.push(msg);
        console.warn(`[zra-sync] WARN ${msg}`);
        result.reviewsSkipped++;
        continue;
      }
    }

    const notes = buildNotes(conv, analysis);
    const liabilityReason = watchedFired.map((i) => i.indicatorName).join("; ");

    if (dryRun) {
      console.log(`[zra-sync] DRY RUN would create:`, {
        conversationId: conv.id,
        host: conv.hostEmail,
        topic: conv.topic,
        callDate: conv.startTime.split("T")[0],
        callTypeName,
        indicatorsFired: watchedFired.map((i) => i.indicatorName),
        notes,
      });
      result.reviewsCreated++;
      continue;
    }

    try {
      await postReview(
        {
          repId: repId!,
          submitterId,
          callDate: conv.startTime,
          callTypeId,
          recordingUrl: conv.recordingUrl,
          recordingSource: "ZRA",
          feedbackTypes: ["LIABILITY"],
          liabilityReason,
          region: null,
          notes,
        },
        apiKey,
        submitterId
      );
      result.reviewsCreated++;
      console.log(`[zra-sync] CREATED review for ${conv.id} (${conv.hostEmail})`);
    } catch (err) {
      const msg = `Failed to create review for ${conv.id}: ${(err as Error).message}`;
      result.errors.push(msg);
      console.error(`[zra-sync] ERROR ${msg}`);
    }
  }

  // Update state only on successful runs (even partial)
  if (!dryRun) {
    writeState({
      lastSuccessfulRun: to.toISOString(),
      lastRunAt: new Date().toISOString(),
      lastConversationsChecked: result.conversationsChecked,
      lastReviewsCreated: result.reviewsCreated,
    });
  }

  return result;
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].includes("sync")) {
  const dryRun = process.argv.includes("--dry-run");

  runSync({ dryRun })
    .then((result) => {
      console.log("\n── Sync summary ─────────────────────────────────────");
      console.log(`  Dry run              : ${result.dryRun}`);
      console.log(`  Conversations checked: ${result.conversationsChecked}`);
      console.log(`  Reviews created      : ${result.reviewsCreated}`);
      console.log(`  Reviews skipped      : ${result.reviewsSkipped}`);
      console.log(`  Errors               : ${result.errors.length}`);
      if (result.errors.length) {
        for (const e of result.errors) console.error(`    - ${e}`);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("\n[zra-sync] Fatal:", err.message);
      process.exit(1);
    });
}
