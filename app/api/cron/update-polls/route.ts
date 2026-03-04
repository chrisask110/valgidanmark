/**
 * Vercel Cron Job — runs every 6 hours.
 * Fetches polls from a public CSV, inserts new rows, and revalidates pages.
 *
 * Required env vars:
 *   CRON_SECRET         – set automatically by Vercel for cron authentication
 *   POLLS_CSV_URL       – raw CSV URL (e.g. Erik Gahner's dataset)
 *   SLACK_WEBHOOK_URL   – (optional) Slack incoming webhook for new-poll alerts
 *
 * CSV format expected (Erik Gahner / erikgahner/polls):
 *   https://raw.githubusercontent.com/erikgahner/polls/master/polls.csv
 *   Columns: id, source, date, company, n, party_a, party_b, party_c, party_d,
 *            party_f, party_i, party_k, party_m, party_o, party_oe, party_v,
 *            party_aa, party_ae, ...
 *
 * Adjust PARTY_MAP below if the CSV uses different column names.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { pollExists, insertPoll } from "@/lib/db";
import type { Poll } from "@/app/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds — Vercel Pro allows up to 300s

// ─── CSV column name → our party key ─────────────────────────────────────────
// Adjust to match whichever CSV source you configure in POLLS_CSV_URL.
const PARTY_MAP: Record<string, string> = {
  party_a:   "A",
  party_b:   "B",
  party_c:   "C",
  party_f:   "F",
  party_i:   "I",
  party_m:   "M",
  party_o:   "O",
  party_oe:  "Ø",   // "oe" = Ø
  party_v:   "V",
  party_aa:  "Å",   // "aa" = Å
  party_ae:  "Æ",   // "ae" = Æ
  party_h:   "H",   // Borgernes Parti (may not be in older CSVs)
};

// ─── Pollster name normalisation ──────────────────────────────────────────────
// Map raw CSV company names to the canonical names used in our POLLSTERS object.
const POLLSTER_MAP: Record<string, string> = {
  "Verian":   "Verian",
  "Gallup":   "Verian",   // Kantar Gallup renamed to Verian
  "Kantar":   "Verian",
  "Epinion":  "Epinion",
  "Megafon":  "Megafon",
  "Voxmeter": "Voxmeter",
  "YouGov":   "YouGov",   // keep in DB even if not in POLLSTERS
};

// ─── Types ────────────────────────────────────────────────────────────────────

type CronResult = {
  ok: boolean;
  newPolls: number;
  skipped: number;
  errors: string[];
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const csvUrl = process.env.POLLS_CSV_URL;
  if (!csvUrl) {
    console.warn("[cron] POLLS_CSV_URL is not set — nothing to do");
    return NextResponse.json({ ok: true, message: "POLLS_CSV_URL not configured" });
  }

  const result: CronResult = { ok: true, newPolls: 0, skipped: 0, errors: [] };

  try {
    // 1. Fetch the CSV
    const res = await fetch(csvUrl, {
      cache: "no-store",
      headers: { "User-Agent": "valgidanmark-cron/1.0" },
    });
    if (!res.ok) throw new Error(`CSV fetch failed: HTTP ${res.status}`);

    const csvText = await res.text();

    // 2. Parse
    const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    if (parseErrors.length) {
      parseErrors.slice(0, 5).forEach(e => result.errors.push(`Parse: ${e.message}`));
    }

    // 3. Process rows — newest first so we can break early
    const sourceUrl = csvUrl;
    for (const row of data.reverse()) {
      try {
        const poll = parseCsvRow(row);
        if (!poll) { result.skipped++; continue; }

        const exists = await pollExists(poll.date, poll.pollster);
        if (exists) { result.skipped++; continue; }

        await insertPoll(poll, sourceUrl);
        result.newPolls++;

        await notifySlack(poll);
      } catch (rowErr) {
        result.errors.push(String(rowErr));
      }
    }

    // 4. Revalidate pages if anything changed
    if (result.newPolls > 0) {
      revalidatePath("/");
      revalidatePath("/statsminister");
      console.log(`[cron] Added ${result.newPolls} new polls → pages revalidated`);
    }
  } catch (topErr) {
    result.ok = false;
    result.errors.push(String(topErr));
    console.error("[cron] Fatal error:", topErr);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// ─── CSV row parser ───────────────────────────────────────────────────────────

function parseCsvRow(row: Record<string, string>): Poll | null {
  // Date
  const date = row["date"]?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  // Only include polls from 2025 onwards
  if (date < "2025-01-01") return null;

  // Pollster
  const rawCompany = row["company"]?.trim() ?? "";
  const pollster = POLLSTER_MAP[rawCompany] ?? rawCompany;
  if (!pollster) return null;

  // Sample size
  const n = parseInt(row["n"] ?? "0") || 0;

  // Party percentages
  const parties: Record<string, number> = {};
  for (const [col, key] of Object.entries(PARTY_MAP)) {
    const raw = row[col];
    if (raw != null && raw !== "" && raw !== "NA") {
      const val = parseFloat(raw);
      if (!isNaN(val)) parties[key] = val;
    }
  }

  // Need at least some party data
  if (Object.keys(parties).length < 5) return null;

  return { date, pollster, n, ...parties };
}

// ─── Slack notification ───────────────────────────────────────────────────────

async function notifySlack(poll: Poll): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📊 *Ny måling tilføjet*\n*${poll.pollster}* · ${poll.date} · n=${poll.n}\nA: ${poll["A"] ?? "–"}% · V: ${poll["V"] ?? "–"}% · F: ${poll["F"] ?? "–"}%`,
      }),
    });
  } catch {
    // Non-critical — never crash the cron for a notification failure
  }
}
