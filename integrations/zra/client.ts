/**
 * ZRA client interface and shared types.
 *
 * Both the mock and the real Zoom client implement ZRAClient.
 * Nothing outside this folder should import from real-client or mock-client
 * directly — import from index.ts instead.
 */

export interface ZRAIndicator {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

export interface ZRAConversation {
  id: string;
  /** ISO 8601 date-time of the call start */
  startTime: string;
  /** Duration in seconds */
  durationSeconds: number;
  hostEmail: string;
  hostName: string;
  /** Call topic / meeting name */
  topic: string;
  recordingUrl: string | null;
  /** Participant emails other than the host (customers, third parties) */
  participantEmails: string[];
}

export interface ZRAIndicatorResult {
  indicatorId: string;
  indicatorName: string;
  /** true = the indicator fired on this conversation */
  fired: boolean;
  /** Number of occurrences detected (0 when fired = false) */
  occurrences: number;
  /** Timestamps in seconds from call start where the indicator was detected */
  timestamps: number[];
}

export interface ZRAConversationAnalysis {
  conversationId: string;
  indicators: ZRAIndicatorResult[];
}

/**
 * ZRAClient — the shape every implementation must satisfy.
 *
 * All methods are read-only. This integration never writes to ZRA.
 */
export interface ZRAClient {
  /**
   * Returns all indicator definitions configured for the account.
   * Save the result as indicators.json (exploration script).
   */
  getIndicators(): Promise<ZRAIndicator[]>;

  /**
   * Async generator that yields conversations page by page.
   * Callers should use `for await (const c of client.listConversations(...))`.
   * Handles pagination and rate limiting internally.
   */
  listConversations(params: {
    from: Date;
    to: Date;
    pageSize?: number;
  }): AsyncGenerator<ZRAConversation>;

  /**
   * Returns the content-analysis result for one conversation,
   * including which indicators fired and how many times.
   */
  getConversationAnalysis(
    conversationId: string
  ): Promise<ZRAConversationAnalysis>;
}
