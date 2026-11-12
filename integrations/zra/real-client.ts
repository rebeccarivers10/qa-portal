/**
 * Real Zoom ZRA API client.
 *
 * Requires these environment variables:
 *   ZOOM_ACCOUNT_ID     — Server-to-Server OAuth account ID
 *   ZOOM_CLIENT_ID      — OAuth client ID
 *   ZOOM_CLIENT_SECRET  — OAuth client secret
 *
 * Docs: https://developers.zoom.us/docs/zoom-revenue-accelerator/
 * Auth: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 *
 * Required OAuth scopes:
 *   zra:read:list_conversations:admin
 *   zra:read:conversation:admin
 *   zra:read:indicator:admin
 *
 * All endpoints are read-only. This client never writes to ZRA.
 */

import type {
  ZRAClient,
  ZRAConversation,
  ZRAConversationAnalysis,
  ZRAIndicator,
  ZRAIndicatorResult,
} from "./client.js";
import { RATE_LIMIT_DELAY_MS } from "./config.js";

const TOKEN_URL = "https://zoom.us/oauth/token";
const API_BASE = "https://api.zoom.us/v2";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface ZRAConversationRaw {
  conversation_id: string;
  start_time: string;
  duration: number; // seconds
  host_email: string;
  host_name: string;
  topic: string;
  share_url?: string;
  participants?: Array<{ email?: string }>;
}

interface ZRAConversationListResponse {
  conversations: ZRAConversationRaw[];
  next_page_token?: string;
  page_size: number;
  total_records: number;
}

interface ZRAIndicatorRaw {
  indicator_id: string;
  name: string;
  description?: string;
  status: "enabled" | "disabled";
  category?: string;
}

interface ZRAIndicatorListResponse {
  indicators: ZRAIndicatorRaw[];
}

interface ZRAAnalysisRaw {
  conversation_id: string;
  indicators?: Array<{
    indicator_id: string;
    name: string;
    is_triggered: boolean;
    occurrences?: number;
    timestamps?: number[];
  }>;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export class RealZRAClient implements ZRAClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt - 10_000) {
      return this.token;
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID!;
    const clientId = process.env.ZOOM_CLIENT_ID!;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch(
      `${TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zoom token request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as TokenResponse;
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.token;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 429) {
      // Rate limited — back off and retry once
      const retryAfter = Number(res.headers.get("Retry-After") ?? 1);
      await sleep(retryAfter * 1000);
      return this.request<T>(path, params);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ZRA API ${path} failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async getIndicators(): Promise<ZRAIndicator[]> {
    const data = await this.request<ZRAIndicatorListResponse>("/zra/indicators");
    return (data.indicators ?? []).map((ind) => ({
      id: ind.indicator_id,
      name: ind.name,
      description: ind.description ?? "",
      enabled: ind.status === "enabled",
      category: ind.category ?? "General",
    }));
  }

  async *listConversations({
    from,
    to,
    pageSize = 30,
  }: {
    from: Date;
    to: Date;
    pageSize?: number;
  }): AsyncGenerator<ZRAConversation> {
    let nextPageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
        page_size: String(Math.min(pageSize, 30)),
      };
      if (nextPageToken) {
        params["next_page_token"] = nextPageToken;
      }

      const data = await this.request<ZRAConversationListResponse>(
        "/zra/conversations",
        params
      );

      for (const c of data.conversations ?? []) {
        yield {
          id: c.conversation_id,
          startTime: c.start_time,
          durationSeconds: c.duration,
          hostEmail: c.host_email,
          hostName: c.host_name,
          topic: c.topic,
          recordingUrl: c.share_url ?? null,
          participantEmails: (c.participants ?? [])
            .map((p) => p.email)
            .filter((e): e is string => !!e),
        };
      }

      nextPageToken = data.next_page_token;

      if (nextPageToken) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    } while (nextPageToken);
  }

  async getConversationAnalysis(
    conversationId: string
  ): Promise<ZRAConversationAnalysis> {
    const data = await this.request<ZRAAnalysisRaw>(
      `/zra/conversations/${encodeURIComponent(conversationId)}/analysis`
    );

    const indicators: ZRAIndicatorResult[] = (data.indicators ?? []).map((ind) => ({
      indicatorId: ind.indicator_id,
      indicatorName: ind.name,
      fired: ind.is_triggered,
      occurrences: ind.occurrences ?? (ind.is_triggered ? 1 : 0),
      timestamps: ind.timestamps ?? [],
    }));

    return { conversationId, indicators };
  }
}
