/**
 * ZRA integration configuration — the one place to change behaviour.
 *
 * INDICATOR_IDS_TO_WATCH: conversations where ANY of these indicators fire
 * will be synced to the QA Review API as feedback type = "LIABILITY".
 * Add or remove IDs to change which indicators trigger a review.
 *
 * To find the right IDs: run the exploration script (explore.ts) and inspect
 * indicators.json. Use the `id` field, not the display name, because display
 * names can change without notice.
 */
export const INDICATOR_IDS_TO_WATCH: string[] = [
  "recording-disclosure",    // Rep failed to disclose that the call was recorded
  "unauthorized-promise",    // Rep made pricing guarantees or unauthorized commitments
  "third-party-consent",     // Third party on the call without proper consent
  "competitor-disparagement",// Rep disparaged a competitor (legal / brand risk)
];

/**
 * ZRA call type name → QA Portal CallType name mapping.
 * Keys are the `topic` or conversation type strings ZRA returns;
 * values are the display names seeded in the CallType lookup table.
 * Unmatched conversations default to "Cold Call".
 */
export const CALL_TYPE_MAP: Record<string, string> = {
  "follow-up": "Follow-Up Call",
  "followup":  "Follow-Up Call",
  "follow up": "Follow-Up Call",
  "audit":     "Audit/Review",
  "review":    "Audit/Review",
};

/** Base URL for the QA Review API (no trailing slash). */
export const QA_API_BASE_URL =
  process.env.QA_API_BASE_URL ?? "http://localhost:3000";

/**
 * State file path — records the timestamp of the last successful sync run.
 * Keep it outside the integrations folder if you want it to persist across
 * deployments; for a Vercel cron, store in a database or KV store instead.
 */
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const _configDir = dirname(fileURLToPath(import.meta.url));
export const STATE_FILE_PATH = resolve(_configDir, "../../.zra-sync-state.json");

/** How many days back the exploration script fetches when no --from is given. */
export const EXPLORE_DEFAULT_LOOKBACK_DAYS = 14;

/** Delay in ms between paginated ZRA API calls to stay within rate limits. */
export const RATE_LIMIT_DELAY_MS = 300;
