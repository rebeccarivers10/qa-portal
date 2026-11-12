/**
 * Mock ZRA client — used when ZOOM_* env variables are not set.
 *
 * Returns realistic sample conversations and indicator results so the
 * exploration script, sync job, and --dry-run can be tested end-to-end
 * without real Zoom credentials.
 *
 * Sample set includes:
 *   - 3 conversations where compliance indicators fired (LIABILITY)
 *   - 2 conversations with coaching indicators only (no liability)
 *   - 2 fully clean conversations (NO_QA_LIABILITIES)
 */

import type {
  ZRAClient,
  ZRAConversation,
  ZRAConversationAnalysis,
  ZRAIndicator,
} from "./client.js";
import { RATE_LIMIT_DELAY_MS } from "./config.js";

// ── Shared indicator catalogue ────────────────────────────────────────────────

const MOCK_INDICATORS: ZRAIndicator[] = [
  {
    id: "recording-disclosure",
    name: "Recording Disclosure",
    description: "Rep failed to disclose at the start of the call that the conversation was being recorded.",
    enabled: true,
    category: "Compliance",
  },
  {
    id: "unauthorized-promise",
    name: "Unauthorized Promise",
    description: "Rep made pricing guarantees, committed to SLAs, or offered discounts outside approved guidelines.",
    enabled: true,
    category: "Compliance",
  },
  {
    id: "third-party-consent",
    name: "Third-Party Consent",
    description: "A third party was present on the call and proper recording consent was not obtained.",
    enabled: true,
    category: "Compliance",
  },
  {
    id: "competitor-disparagement",
    name: "Competitor Disparagement",
    description: "Rep made negative or disparaging statements about a named competitor.",
    enabled: true,
    category: "Compliance",
  },
  {
    id: "next-steps-defined",
    name: "Next Steps Defined",
    description: "Rep clearly summarized agreed-upon next steps before ending the call.",
    enabled: true,
    category: "Coaching",
  },
  {
    id: "discovery-questions",
    name: "Discovery Questions",
    description: "Rep asked open-ended discovery questions to understand the customer's needs.",
    enabled: true,
    category: "Coaching",
  },
  {
    id: "talk-listen-ratio",
    name: "Talk-to-Listen Ratio",
    description: "Rep spoke more than 70% of the call duration.",
    enabled: true,
    category: "Coaching",
  },
];

// ── Sample conversations ───────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

const MOCK_CONVERSATIONS: ZRAConversation[] = [
  // ── Compliance issues ────────────────────────────────────────────────────────

  {
    id: "conv-001",
    startTime: daysAgo(1),
    durationSeconds: 1842,
    hostEmail: "tamirica.epting@company.com",
    hostName: "Tamirica Epting",
    topic: "Discovery Call – Westbrook Marketing",
    recordingUrl: "https://zoom.us/rec/mock/conv-001",
    participantEmails: ["buyer@westbrookmarketing.com"],
  },
  {
    id: "conv-002",
    startTime: daysAgo(3),
    durationSeconds: 2271,
    hostEmail: "malono.jones@company.com",
    hostName: "Malono Jones",
    topic: "Proposal Call – Sunrise Dental Group",
    recordingUrl: "https://zoom.us/rec/mock/conv-002",
    participantEmails: ["owner@sunrisedental.com", "accountant@sunrisedental.com"],
  },
  {
    id: "conv-003",
    startTime: daysAgo(5),
    durationSeconds: 1134,
    hostEmail: "brett.calloway@company.com",
    hostName: "Brett Calloway",
    topic: "Follow Up – Summit Ridge Realty",
    recordingUrl: "https://zoom.us/rec/mock/conv-003",
    participantEmails: ["jsmith@summitridge.com"],
  },

  // ── Coaching only (no compliance) ───────────────────────────────────────────

  {
    id: "conv-004",
    startTime: daysAgo(7),
    durationSeconds: 2640,
    hostEmail: "priya.nandakumar@company.com",
    hostName: "Priya Nandakumar",
    topic: "Discovery Call – Evergreen Landscaping",
    recordingUrl: "https://zoom.us/rec/mock/conv-004",
    participantEmails: ["owner@evergreenlandscaping.com"],
  },
  {
    id: "conv-005",
    startTime: daysAgo(9),
    durationSeconds: 1980,
    hostEmail: "derek.winslow@company.com",
    hostName: "Derek Winslow",
    topic: "Cold Call – Pacific Coast Plumbing",
    recordingUrl: "https://zoom.us/rec/mock/conv-005",
    participantEmails: ["manager@pacificcoastplumbing.com"],
  },

  // ── Clean calls (no indicators) ─────────────────────────────────────────────

  {
    id: "conv-006",
    startTime: daysAgo(11),
    durationSeconds: 1560,
    hostEmail: "alicia.fontaine@company.com",
    hostName: "Alicia Fontaine",
    topic: "Follow-Up – Blue Ridge Auto Group",
    recordingUrl: "https://zoom.us/rec/mock/conv-006",
    participantEmails: ["sales@blueridgeauto.com"],
  },
  {
    id: "conv-007",
    startTime: daysAgo(13),
    durationSeconds: 2100,
    hostEmail: "tamirica.epting@company.com",
    hostName: "Tamirica Epting",
    topic: "Discovery Call – Harbor View Hotels",
    recordingUrl: "https://zoom.us/rec/mock/conv-007",
    participantEmails: ["mktg@harborviewhotels.com"],
  },
];

// ── Analysis results per conversation ────────────────────────────────────────

function allClean(conversationId: string): ZRAConversationAnalysis {
  return {
    conversationId,
    indicators: MOCK_INDICATORS.map((ind) => ({
      indicatorId: ind.id,
      indicatorName: ind.name,
      fired: false,
      occurrences: 0,
      timestamps: [],
    })),
  };
}

const MOCK_ANALYSIS: Record<string, ZRAConversationAnalysis> = {
  // conv-001: Rep forgot recording disclosure
  "conv-001": {
    conversationId: "conv-001",
    indicators: MOCK_INDICATORS.map((ind) => ({
      indicatorId: ind.id,
      indicatorName: ind.name,
      fired: ind.id === "recording-disclosure",
      occurrences: ind.id === "recording-disclosure" ? 1 : 0,
      timestamps: ind.id === "recording-disclosure" ? [0] : [],
    })),
  },

  // conv-002: Third party on the call without consent + rep promised a price
  "conv-002": {
    conversationId: "conv-002",
    indicators: MOCK_INDICATORS.map((ind) => {
      const firedIds = ["third-party-consent", "unauthorized-promise"];
      return {
        indicatorId: ind.id,
        indicatorName: ind.name,
        fired: firedIds.includes(ind.id),
        occurrences: firedIds.includes(ind.id) ? (ind.id === "unauthorized-promise" ? 2 : 1) : 0,
        timestamps: firedIds.includes(ind.id)
          ? ind.id === "unauthorized-promise"
            ? [487, 1203]
            : [112]
          : [],
      };
    }),
  },

  // conv-003: Competitor disparagement
  "conv-003": {
    conversationId: "conv-003",
    indicators: MOCK_INDICATORS.map((ind) => ({
      indicatorId: ind.id,
      indicatorName: ind.name,
      fired: ind.id === "competitor-disparagement",
      occurrences: ind.id === "competitor-disparagement" ? 1 : 0,
      timestamps: ind.id === "competitor-disparagement" ? [634] : [],
    })),
  },

  // conv-004: Coaching — talk-to-listen ratio off, no discovery questions
  "conv-004": {
    conversationId: "conv-004",
    indicators: MOCK_INDICATORS.map((ind) => {
      const firedIds = ["talk-listen-ratio"];
      return {
        indicatorId: ind.id,
        indicatorName: ind.name,
        fired: firedIds.includes(ind.id),
        occurrences: firedIds.includes(ind.id) ? 1 : 0,
        timestamps: [],
      };
    }),
  },

  // conv-005: Coaching — no next steps defined
  "conv-005": {
    conversationId: "conv-005",
    indicators: MOCK_INDICATORS.map((ind) => ({
      indicatorId: ind.id,
      indicatorName: ind.name,
      fired: ind.id === "next-steps-defined",
      occurrences: ind.id === "next-steps-defined" ? 1 : 0,
      timestamps: [],
    })),
  },

  "conv-006": allClean("conv-006"),
  "conv-007": allClean("conv-007"),
};

// ── Mock client implementation ────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export class MockZRAClient implements ZRAClient {
  async getIndicators() {
    await sleep(50);
    return MOCK_INDICATORS;
  }

  async *listConversations({
    from,
    to,
    pageSize = 10,
  }: {
    from: Date;
    to: Date;
    pageSize?: number;
  }): AsyncGenerator<ZRAConversation> {
    const filtered = MOCK_CONVERSATIONS.filter((c) => {
      const t = new Date(c.startTime);
      return t >= from && t <= to;
    });

    // Simulate two pages
    for (let i = 0; i < filtered.length; i += pageSize) {
      const page = filtered.slice(i, i + pageSize);
      for (const conv of page) {
        yield conv;
      }
      if (i + pageSize < filtered.length) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }
  }

  async getConversationAnalysis(conversationId: string): Promise<ZRAConversationAnalysis> {
    await sleep(50);
    return (
      MOCK_ANALYSIS[conversationId] ?? {
        conversationId,
        indicators: MOCK_INDICATORS.map((ind) => ({
          indicatorId: ind.id,
          indicatorName: ind.name,
          fired: false,
          occurrences: 0,
          timestamps: [],
        })),
      }
    );
  }
}
