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

## Open Questions for Production Rebuild

1. **Recording storage**: What storage service should be used for UPLOAD recordings? S3? Azure Blob? This determines how `recordingUrl` and `recordingSource` get populated for uploaded files.

2. **Full playlist list**: The seeded playlists (Successful Outcome, Meetings Booked, Good Discovery, Successful Budget Objection) are a starting set. What is the full list of playlists used by the QA team?

3. **Notification channels**: Currently notifies via in-app bell + Resend email. Should Slack or Teams notifications be added for the COACHING_OPPORTUNITY or LIABILITY types?

4. **Liability migration timing**: When does the one-time migration (`migrate-liabilities.ts`) run relative to go-live? Run it once, then deprecate the script.

5. **API key rotation**: Who manages `QA_REVIEW_API_KEY`? It should be rotated on a schedule and stored in the org's secret manager, not just the .env file.

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

### New files
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
