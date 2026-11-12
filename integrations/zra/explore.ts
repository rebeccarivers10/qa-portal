/**
 * Part 1 — Exploration script.
 *
 * Usage:
 *   npx tsx integrations/zra/explore.ts
 *   npx tsx integrations/zra/explore.ts --from 2026-10-01 --to 2026-10-31
 *
 * What it does (read-only — never writes to ZRA):
 *   1. Fetches all indicator definitions and writes indicators.json
 *   2. Fetches all conversations in the window (default: last 14 days)
 *   3. For each conversation, fetches its content analysis
 *   4. Writes conversations.csv with one column per indicator
 *
 * Output files land next to this script:
 *   integrations/zra/indicators.json
 *   integrations/zra/conversations.csv
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getZRAClient } from "./index.js";
import { EXPLORE_DEFAULT_LOOKBACK_DAYS } from "./config.js";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const toDate = new Date();
const fromDate = (() => {
  const fromArg = getArg("from");
  if (fromArg) return new Date(fromArg);
  const d = new Date();
  d.setDate(d.getDate() - EXPLORE_DEFAULT_LOOKBACK_DAYS);
  return d;
})();

if (getArg("to")) {
  toDate.setTime(new Date(getArg("to")!).getTime());
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = getZRAClient();

  console.log(
    `\nFetching conversations from ${fromDate.toISOString().split("T")[0]} to ${toDate.toISOString().split("T")[0]}\n`
  );

  // 1. Indicators
  console.log("→ Fetching indicator definitions…");
  const indicators = await client.getIndicators();
  const indicatorsPath = join(__dir, "indicators.json");
  writeFileSync(indicatorsPath, JSON.stringify(indicators, null, 2), "utf-8");
  console.log(`  ✓ ${indicators.length} indicators written to indicators.json`);

  // 2. Conversations + analysis
  console.log("→ Fetching conversations and analysis…");

  const rows: Record<string, string>[] = [];
  let conversationCount = 0;
  let analysisErrors = 0;

  for await (const conv of client.listConversations({ from: fromDate, to: toDate })) {
    conversationCount++;
    process.stdout.write(`  [${conversationCount}] ${conv.id} — ${conv.topic} … `);

    let analysis;
    try {
      analysis = await client.getConversationAnalysis(conv.id);
    } catch (err) {
      analysisErrors++;
      process.stdout.write(`ERROR: ${(err as Error).message}\n`);
      continue;
    }

    const row: Record<string, string> = {
      conversation_id: conv.id,
      date: conv.startTime.split("T")[0],
      host_email: conv.hostEmail,
      host_name: conv.hostName,
      topic: conv.topic,
      duration_seconds: String(conv.durationSeconds),
      recording_url: conv.recordingUrl ?? "",
    };

    // One column per indicator
    for (const ind of analysis.indicators) {
      const col = `ind:${ind.indicatorId}`;
      row[col] = ind.fired ? `YES (${ind.occurrences}x)` : "no";
    }

    // Also flag which indicators fired, comma-separated
    const fired = analysis.indicators
      .filter((i) => i.fired)
      .map((i) => i.indicatorName);
    row["fired_indicators"] = fired.join("; ");

    rows.push(row);
    process.stdout.write(
      fired.length > 0 ? `FIRED: ${fired.join(", ")}\n` : `clean\n`
    );
  }

  if (rows.length === 0) {
    console.log("\n  No conversations found in this date range.");
    return;
  }

  // 3. Write CSV
  const allColumns = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)))
  );

  function csvEscape(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const csvLines = [
    allColumns.map(csvEscape).join(","),
    ...rows.map((r) => allColumns.map((col) => csvEscape(r[col] ?? "")).join(",")),
  ];

  const csvPath = join(__dir, "conversations.csv");
  writeFileSync(csvPath, csvLines.join("\n"), "utf-8");

  console.log(`\n✓ Done.`);
  console.log(`  Conversations checked : ${conversationCount}`);
  console.log(`  Analysis errors       : ${analysisErrors}`);
  console.log(`  Rows in CSV           : ${rows.length}`);
  console.log(`  Output files          : indicators.json, conversations.csv`);

  if (analysisErrors > 0) {
    console.warn(`\n  ⚠ ${analysisErrors} conversations could not be analyzed. Check output above.`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
