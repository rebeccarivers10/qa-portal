# QA Review Feature — Handoff Notes

Branch: `qa-review-log`  
Date: November 2026  
Built by: Claude (prototype), to be rebuilt inside Sales HQ by Aidan Tucker-Calkins.

---

## What Was Built

A second record type — **QA Review** — alongside the existing Liability flow. QA Reviews log *all* QA-reviewed sales calls, not just calls with liabilities. The existing Liability table and workflow are untouched.

---

## Data Model

### New models

**`QAReview`**
| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `repId` | String | FK → User |
| `submitterId` | String | FK → User (who submitted) |
| `callDate` | DateTime | Date the call occurred |
| `callTypeId` | String? | FK → CallType lookup |
| `recordingUrl` | String? | URL to call recording |
| `recordingSource` | RecordingSource? | ZRA / ZOOM / HUBSPOT / UPLOAD |
| `feedbackTypes` | FeedbackType[] | Array enum: NO_QA_LIABILITIES, COACHING_OPPORTUNITY, LIABILITY |
| `liabilityReason` | String? | Only populated when feedbackTypes includes LIABILITY |
| `region` | Region? | Only populated when feedbackTypes includes LIABILITY |
| `notes` | String? | QA notes |
| `imageUrls` | String[] | Base64 screenshot attachments |
| `createdAt` / `updatedAt` | DateTime | |

**`CallType`** — Lookup table (id, name, active boolean). Seeded: Cold Call, Follow-Up Call, Audit/Review.

**`Playlist`** — Lookup table (id, name, active boolean). Seeded: Successful Outcome, Meetings Booked, Good Discovery, Successful Budget Objection.

**`Product`** — Lookup table (id, name, active boolean). Seeded: PPC E-Commerce, PPC Lead Generation, SEO, Email Marketing, Web Development, Paid Social.

**`QAReviewPlaylist`** / **`QAReviewProduct`** — Join tables (many-to-many).

### Updated models

**`Notification`** — `liabilityId` changed from required to optional. Added `qaReviewId String?` with optional relation to QAReview.

---

## Key Decisions

### Notification trigger rule
Notifications (in-app + email) fire only when `feedbackTypes` includes `LIABILITY` or `COACHING_OPPORTUNITY` — not for `NO_QA_LIABILITIES`. This rule lives in one place:

```
src/lib/review-config.ts
```

Change `NOTIFY_FEEDBACK_TYPES` there if the business rule changes. No other file needs updating.

### Recording storage
The form accepts a URL + source (ZRA / Zoom / HubSpot / Upload). For the UPLOAD source, the UI shows a placeholder — **no actual file upload is wired up in this prototype**. In production, this should be replaced with an upload handler that stores the file in S3 (or similar) and writes the URL back to `recordingUrl`. The `recordingSource` field is already in the schema to distinguish upload-sourced recordings from external links.

### API key authentication
The POST `/api/qa-reviews` endpoint supports both session auth (SUBMITTER/ADMIN role) and API key auth via the `x-api-key` request header. The key is read from the `QA_REVIEW_API_KEY` environment variable — never hardcoded. For API key requests, `submitterId` must be provided in the request body.

### Image storage
Screenshots pasted via Ctrl+V are stored as base64 strings in the `imageUrls` array field. This works for a prototype but is not suitable for production (large payloads, no CDN). Replace with S3 upload in the production build.

### Liability migration
`prisma/migrate-liabilities.ts` is a standalone script that creates QAReview records from existing Liability records (feedbackTypes = ["LIABILITY"]). It is idempotent — safe to run multiple times. It does not delete the original Liability records.

---

## Role Visibility

| Role | QA Reviews visible |
|---|---|
| REP | Own reviews only |
| MANAGER | Reviews for their direct reports |
| SUBMITTER | All reviews |
| ADMIN | All reviews |

---

## ZRA Integration (`integrations/zra/`)

### How it works

The integration lives entirely in `integrations/zra/` and is decoupled from the Next.js app — it can be lifted out or replaced without touching the portal.

**Client interface + implementations**
- `client.ts` — TypeScript interface (`ZRAClient`) and shared types. Neither the app nor the scripts import any concrete implementation directly.
- `index.ts` — factory that returns the real client when `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, and `ZOOM_CLIENT_SECRET` are all set, and the mock client otherwise.
- `mock-client.ts` — realistic sample data for local dev and testing: 3 conversations with compliance indicators fired, 2 coaching-only, 2 fully clean.
- `real-client.ts` — Server-to-Server OAuth against `https://api.zoom.us/v2/zra/*`. Handles token caching, pagination, and rate-limit backoff (`Retry-After`).

**Part 1 — Exploration script**
```bash
npx tsx integrations/zra/explore.ts
npx tsx integrations/zra/explore.ts --from 2026-10-01 --to 2026-10-31
```
Writes `indicators.json` (all account indicator definitions) and `conversations.csv` (one row per conversation, one column per indicator showing YES/no). Read-only.

**Part 2 — Daily sync job**
```bash
npx tsx integrations/zra/sync.ts
npx tsx integrations/zra/sync.ts --dry-run
```
Fetches conversations since the last successful run, filters to those where a watched indicator fired, skips already-synced conversation IDs, and POSTs each as a QA Review (feedbackType = LIABILITY, recordingSource = ZRA). `--dry-run` prints what would be created without calling the API. Run summary is logged and state is updated on success.

**Vercel cron**
Defined in `vercel.json` at `0 6 * * *` (06:00 UTC daily). **Disabled by default** — set `ZRA_CRON_ENABLED=true` in Vercel environment variables to activate. The cron calls `GET /api/cron/zra-sync` (authenticated with `CRON_SECRET`, which Vercel sets automatically).

### Which indicators it uses

Watched indicators are configured in `integrations/zra/config.ts` → `INDICATOR_IDS_TO_WATCH`. Default set:

| Indicator ID | Display Name | Reason |
|---|---|---|
| `recording-disclosure` | Recording Disclosure | Rep failed to disclose the call was recorded |
| `unauthorized-promise` | Unauthorized Promise | Pricing guarantee or commitment outside guidelines |
| `third-party-consent` | Third-Party Consent | Third party present without proper consent |
| `competitor-disparagement` | Competitor Disparagement | Disparaged a named competitor |

To change which indicators trigger a sync, edit `INDICATOR_IDS_TO_WATCH` in `config.ts`. Run the exploration script first and check `indicators.json` for the exact `id` strings your ZRA account uses.

### Required API scopes (Zoom Server-to-Server OAuth app)

| Scope | Purpose |
|---|---|
| `zra:read:list_conversations:admin` | List conversations |
| `zra:read:conversation:admin` | Get conversation details |
| `zra:read:indicator:admin` | Get indicator definitions and analysis |

### Required environment variables

| Variable | Description |
|---|---|
| `ZOOM_ACCOUNT_ID` | Server-to-Server OAuth account ID |
| `ZOOM_CLIENT_ID` | OAuth client ID |
| `ZOOM_CLIENT_SECRET` | OAuth client secret |
| `QA_REVIEW_API_KEY` | API key for the QA Review POST endpoint |
| `ZRA_SUBMITTER_ID` | User ID of the system account used as submitter |
| `ZRA_CRON_ENABLED` | Set to `"true"` to activate the daily cron job |
| `QA_API_BASE_URL` | Base URL of the QA portal (defaults to `http://localhost:3000`) |

### What changes if you replace ZRA

1. Implement the `ZRAClient` interface from `client.ts` for the new provider.
2. Update the factory in `index.ts` to instantiate your new client when the new provider's env vars are set.
3. Update `INDICATOR_IDS_TO_WATCH` in `config.ts` to the new indicator IDs.
4. Update `CALL_TYPE_MAP` in `config.ts` if the new provider uses different call type strings.
5. The sync job (`sync.ts`), explore script (`explore.ts`), and cron route are all unchanged — they consume only the interface.

The `recordingSource` enum in the Prisma schema has a `ZRA` variant. Add the new provider's name there if needed.

---

## Open Questions for Production Rebuild

1. **Recording storage**: What storage service should be used for UPLOAD recordings? S3? Azure Blob? This determines how `recordingUrl` and `recordingSource` get populated for uploaded files.

2. **Full playlist list**: The seeded playlists (Successful Outcome, Meetings Booked, Good Discovery, Successful Budget Objection) are a starting set. What is the full list of playlists used by the QA team?

3. **Notification channels**: Currently notifies via in-app bell + Resend email. Should Slack or Teams notifications be added for the COACHING_OPPORTUNITY or LIABILITY types?

4. **Liability migration timing**: When does the one-time migration (`migrate-liabilities.ts`) run relative to go-live? Run it once, then deprecate the script.

5. **API key rotation**: Who manages `QA_REVIEW_API_KEY`? It should be rotated on a schedule and stored in the org's secret manager, not just the .env file.

6. **ZRA indicator IDs**: The indicator IDs in `config.ts` (`recording-disclosure`, `unauthorized-promise`, etc.) are based on ZRA documentation. Run `npx tsx integrations/zra/explore.ts` with real credentials and check `indicators.json` to confirm the actual IDs your account exposes — they may differ.

7. **ZRA sync state storage**: The sync job stores last-run state in `.zra-sync-state.json` on the filesystem, which is ephemeral on Vercel. For production, replace `readState`/`writeState` in `integrations/zra/state.ts` with a database or Vercel KV call.

8. **ZRA_SUBMITTER_ID**: The sync job posts reviews under a system user account. Create a dedicated "ZRA Automation" user in the portal with SUBMITTER role and put its ID here.

---

## Running Locally

```bash
# Apply schema
npx prisma db push

# Seed lookup tables + sample data
npx tsx prisma/seed.ts

# (Optional) Migrate existing liabilities to QAReview records
npx tsx prisma/migrate-liabilities.ts

# Start dev server
npm run dev
```

Requires `.env.local` with `DATABASE_URL` (get from team via Teams/Slack DM — never committed to GitHub).

---

## Files Added/Changed on This Branch

### New files (ZRA integration)
- `integrations/zra/client.ts` — ZRAClient interface + types
- `integrations/zra/index.ts` — factory (mock vs real)
- `integrations/zra/mock-client.ts` — mock with 7 sample conversations
- `integrations/zra/real-client.ts` — real Zoom ZRA API client (S2S OAuth)
- `integrations/zra/config.ts` — watched indicators, call type map, env defaults
- `integrations/zra/state.ts` — sync state read/write (last successful run)
- `integrations/zra/explore.ts` — Part 1 exploration script
- `integrations/zra/sync.ts` — Part 2 daily sync job
- `src/app/api/cron/zra-sync/route.ts` — Vercel cron endpoint
- `vercel.json` — cron schedule (disabled by default)

### New files (QA Review feature)
- `prisma/migrate-liabilities.ts` — migration script
- `src/lib/review-config.ts` — notification trigger config
- `src/app/api/qa-reviews/route.ts` — GET + POST endpoint
- `src/app/api/call-types/route.ts`
- `src/app/api/playlists/route.ts`
- `src/app/api/products/route.ts`
- `src/app/dashboard/qa-reviews/page.tsx` — reviews dashboard
- `src/app/dashboard/qa-reviews/submit/page.tsx`
- `src/app/dashboard/qa-reviews/submit/QAReviewForm.tsx`
- `src/app/dashboard/qa-reviews/[id]/page.tsx` — detail page
- `src/app/dashboard/admin/LookupManager.tsx`

### Modified files
- `prisma/schema.prisma` — new models + updated Notification model
- `prisma/seed.ts` — includes lookup tables + sample QA Reviews
- `src/lib/notifications.ts` — added `notifyQAReviewSubmitted()`
- `src/app/dashboard/admin/page.tsx` — added lookup table management UI
- `src/components/Navbar.tsx` — added QA Reviews link
- `src/components/NotificationBell.tsx` — routes to QA Review detail pages
