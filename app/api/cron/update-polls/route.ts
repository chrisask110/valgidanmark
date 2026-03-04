/**
 * Vercel Cron Job — runs once per day (Hobby plan limit).
 *
 * Data source priority:
 *   1. POLLS_CSV_URL env var (if set) — fetch & parse a CSV
 *   2. Wikipedia — scrape the 2026 Danish election polling table automatically
 *
 * Required env vars:
 *   CRON_SECRET        – set automatically by Vercel for cron authentication
 *   POLLS_CSV_URL      – (optional) override CSV URL
 *   SLACK_WEBHOOK_URL  – (optional) Slack incoming webhook for new-poll alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { pollExists, insertPoll } from "@/lib/db";
import type { Poll } from "@/app/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Party / pollster maps ────────────────────────────────────────────────────

const CSV_PARTY_MAP: Record<string, string> = {
  party_a: "A", party_b: "B", party_c: "C", party_f: "F", party_i: "I",
  party_m: "M", party_o: "O", party_oe: "Ø", party_v: "V",
  party_aa: "Å", party_ae: "Æ", party_h: "H",
};

const POLLSTER_MAP: Record<string, string> = {
  "Verian": "Verian", "Gallup": "Verian", "Kantar": "Verian",
  "Epinion": "Epinion", "Megafon": "Megafon", "Voxmeter": "Voxmeter",
  "YouGov": "YouGov",
};

// Party letters we recognise as column headers in Wikipedia tables
const KNOWN_PARTIES = new Set(["A", "B", "C", "F", "H", "I", "M", "O", "V", "Æ", "Ø", "Å"]);

// ─── Types ────────────────────────────────────────────────────────────────────

type CronResult = { ok: boolean; source: string; newPolls: number; skipped: number; errors: string[] };

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result: CronResult = { ok: true, source: "", newPolls: 0, skipped: 0, errors: [] };

  try {
    const polls: Poll[] = process.env.POLLS_CSV_URL
      ? await fetchFromCsv(process.env.POLLS_CSV_URL, result)
      : await fetchFromWikipedia(result);

    for (const poll of polls) {
      try {
        const exists = await pollExists(poll.date, poll.pollster);
        if (exists) { result.skipped++; continue; }
        await insertPoll(poll, result.source);
        result.newPolls++;
        await notifySlack(poll);
      } catch (err) {
        result.errors.push(String(err));
      }
    }

    if (result.newPolls > 0) {
      revalidatePath("/");
      revalidatePath("/statsminister");
      console.log(`[cron] Added ${result.newPolls} new polls from ${result.source}`);
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(String(err));
    console.error("[cron] Fatal error:", err);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

// ─── CSV source ───────────────────────────────────────────────────────────────

async function fetchFromCsv(csvUrl: string, result: CronResult): Promise<Poll[]> {
  result.source = csvUrl;
  const res = await fetch(csvUrl, { cache: "no-store", headers: { "User-Agent": "valgidanmark-cron/1.0" } });
  if (!res.ok) throw new Error(`CSV fetch failed: HTTP ${res.status}`);
  const { data, errors } = Papa.parse<Record<string, string>>(await res.text(), { header: true, skipEmptyLines: true });
  errors.slice(0, 3).forEach(e => result.errors.push(`CSV parse: ${e.message}`));
  return data.reverse().flatMap(row => parseCsvRow(row) ?? []);
}

function parseCsvRow(row: Record<string, string>): Poll | null {
  const date = row["date"]?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "2025-01-01") return null;
  const pollster = POLLSTER_MAP[row["company"]?.trim() ?? ""] ?? row["company"]?.trim();
  if (!pollster) return null;
  const n = parseInt(row["n"] ?? "0") || 0;
  const parties: Record<string, number> = {};
  for (const [col, key] of Object.entries(CSV_PARTY_MAP)) {
    const val = parseFloat(row[col]);
    if (!isNaN(val)) parties[key] = val;
  }
  return Object.keys(parties).length >= 5 ? { date, pollster, n, ...parties } : null;
}

// ─── Wikipedia source ─────────────────────────────────────────────────────────

const WIKI_PAGE = "Opinion_polling_for_the_2026_Danish_general_election";

async function fetchFromWikipedia(result: CronResult): Promise<Poll[]> {
  result.source = `wikipedia:${WIKI_PAGE}`;
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${WIKI_PAGE}&prop=revisions&rvprop=content&format=json&rvslots=main&formatversion=2`;
  const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "valgidanmark-cron/1.0 (https://valgidanmark.dk)" } });
  if (!res.ok) throw new Error(`Wikipedia API failed: HTTP ${res.status}`);
  const json = await res.json();
  const wikitext: string = json?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? "";
  if (!wikitext) throw new Error("Wikipedia: empty wikitext");
  const polls = parseWikiPolls(wikitext);
  console.log(`[cron] Wikipedia: parsed ${polls.length} candidate polls`);
  return polls;
}

// ─── Wikipedia wikitext parser ────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function stripWiki(s: string): string {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{dts\|(\d{4})\|(\d{1,2})\|(\d{1,2})\}\}/gi, (_, y, m, d) =>
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .trim();
}

function parseEndDate(s: string): string | null {
  // Already ISO from {{dts}} expansion
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Find all "D Mon YYYY" patterns and take the last (= end date of fieldwork)
  const matches = [...s.matchAll(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/g)];
  if (matches.length) {
    const [, d, mon, y] = matches[matches.length - 1];
    const m = MONTH_MAP[mon.toLowerCase()];
    if (m) return `${y}-${m}-${d.padStart(2, "0")}`;
  }

  // "D – D Mon YYYY" (only last day has month+year)
  const m2 = s.match(/\d+\s*[–\-]\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (m2) {
    const m = MONTH_MAP[m2[2].toLowerCase()];
    if (m) return `${m2[3]}-${m}-${m2[1].padStart(2, "0")}`;
  }

  return null;
}

function parseWikiPolls(wikitext: string): Poll[] {
  const polls: Poll[] = [];

  // Find all tables
  const tableRegex = /\{\|[^\n]*\n([\s\S]*?)\n\|\}/g;
  let tableMatch: RegExpExecArray | null;

  while ((tableMatch = tableRegex.exec(wikitext)) !== null) {
    const rows = tableMatch[1].split(/\n\|-/).map(r => r.trim()).filter(Boolean);

    const partyColIdx: Record<number, string> = {};
    let fieldworkIdx = -1, pollsterIdx = -1, nIdx = -1;
    let headerFound = false;

    for (const row of rows) {
      if (row.startsWith("|+")) continue; // caption

      // ── Header row ────────────────────────────────────────────────────────
      if (!headerFound && (row.startsWith("!") || row.includes("\n!"))) {
        const cells = row
          .split(/!!|\n!+/)
          .map(c => stripWiki(c.replace(/^!+/, "").replace(/^[^|]*\|/, "").trim()));

        cells.forEach((cell, i) => {
          // Exact match for single party letter
          if (KNOWN_PARTIES.has(cell)) { partyColIdx[i] = cell; return; }
          // Extract party letter from template like "{{party...|A|...}}"
          const templateParty = cell.match(/\bparty[^|]*\|([A-ZÆØÅ])\|/)?.[1];
          if (templateParty && KNOWN_PARTIES.has(templateParty)) { partyColIdx[i] = templateParty; return; }
          if (/fieldwork|dates?/i.test(cell)) fieldworkIdx = i;
          if (/polling\s*firm|pollster|company|institut/i.test(cell)) pollsterIdx = i;
          if (/sample|n\s*$|\bn\b/i.test(cell)) nIdx = i;
        });

        if (Object.keys(partyColIdx).length >= 5) headerFound = true;
        continue;
      }

      if (!headerFound) continue;

      // ── Data row ──────────────────────────────────────────────────────────
      const cells = row
        .split(/\|\||\n\|+/)
        .map(c => stripWiki(c.replace(/^\|+/, "").replace(/^[^|]*\|/, "").trim()));

      if (cells.length < 6) continue;

      // Date
      const dateRaw = cells[fieldworkIdx >= 0 ? fieldworkIdx : 0] ?? "";
      const date = parseEndDate(dateRaw);
      if (!date || date < "2025-01-01") continue;

      // Pollster
      const rawPollster = (cells[pollsterIdx >= 0 ? pollsterIdx : 2] ?? "").trim();
      if (!rawPollster || /average|election|result|valg/i.test(rawPollster)) continue;
      const pollster = POLLSTER_MAP[rawPollster] ?? rawPollster;

      // Sample size
      const nRaw = cells[nIdx >= 0 ? nIdx : 4] ?? "";
      const n = parseInt(nRaw.replace(/[\s,.]/g, "")) || 0;

      // Party percentages
      const parties: Record<string, number> = {};
      for (const [idxStr, key] of Object.entries(partyColIdx)) {
        const val = parseFloat((cells[+idxStr] ?? "").replace(",", "."));
        if (!isNaN(val) && val > 0 && val <= 100) parties[key] = val;
      }

      if (Object.keys(parties).length < 5) continue;

      polls.push({ date, pollster, n, ...parties });
    }
  }

  return polls;
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
  } catch { /* non-critical */ }
}
