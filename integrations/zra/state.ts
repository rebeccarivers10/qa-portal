/**
 * Lightweight run-state persistence.
 *
 * Records the timestamp of the last successful sync so each run only fetches
 * conversations it hasn't seen yet. Falls back to 24 hours ago on first run.
 *
 * For production on Vercel: replace readState/writeState with a database or
 * Vercel KV call, since the filesystem is ephemeral in serverless functions.
 */

import { readFileSync, writeFileSync } from "fs";
import { STATE_FILE_PATH } from "./config.js";

interface SyncState {
  lastSuccessfulRun: string | null; // ISO 8601
  lastConversationsChecked: number;
  lastReviewsCreated: number;
  lastRunAt: string | null;
}

const DEFAULT_STATE: SyncState = {
  lastSuccessfulRun: null,
  lastConversationsChecked: 0,
  lastReviewsCreated: 0,
  lastRunAt: null,
};

export function readState(): SyncState {
  try {
    const raw = readFileSync(STATE_FILE_PATH, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(patch: Partial<SyncState>): void {
  const current = readState();
  const next = { ...current, ...patch };
  writeFileSync(STATE_FILE_PATH, JSON.stringify(next, null, 2), "utf-8");
}

/**
 * Returns the Date to use as the `from` parameter for the next sync.
 * Defaults to 24 hours ago if no prior successful run exists.
 */
export function getSyncFrom(state: SyncState): Date {
  if (state.lastSuccessfulRun) {
    return new Date(state.lastSuccessfulRun);
  }
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  return yesterday;
}
