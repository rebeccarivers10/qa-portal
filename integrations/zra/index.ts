/**
 * Returns the right ZRA client implementation based on environment variables.
 *
 * - Real client: when ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET
 *   are all set.
 * - Mock client: everything else (local dev, CI, missing credentials).
 *
 * Import from here — never import mock-client or real-client directly.
 */

import type { ZRAClient } from "./client.js";
import { MockZRAClient } from "./mock-client.js";
import { RealZRAClient } from "./real-client.js";

export type { ZRAClient, ZRAConversation, ZRAConversationAnalysis, ZRAIndicator, ZRAIndicatorResult } from "./client.js";

function hasZoomCredentials(): boolean {
  return !!(
    process.env.ZOOM_ACCOUNT_ID &&
    process.env.ZOOM_CLIENT_ID &&
    process.env.ZOOM_CLIENT_SECRET
  );
}

export function getZRAClient(): ZRAClient {
  if (hasZoomCredentials()) {
    console.log("[zra] Using real Zoom ZRA client.");
    return new RealZRAClient();
  }
  console.log("[zra] ZOOM_* env variables not set — using mock ZRA client.");
  return new MockZRAClient();
}
