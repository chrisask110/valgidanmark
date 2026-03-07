import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

const POLYMARKET_EVENT_SLUG = "next-prime-minister-of-denmark-after-parliamentary-election";
const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`;
const POLYMARKET_EVENT_URL = `https://polymarket.com/event/${POLYMARKET_EVENT_SLUG}`;

const SNAPSHOT_FILE = "/tmp/pm-history.json";
const ONE_HOUR_MS  =       60 * 60 * 1000;
const TARGET_AGE_MS = 24 * 60 * 60 * 1000; // compare against snapshot ~24h old
const KEEP_FOR_MS  = 26 * 60 * 60 * 1000;  // discard snapshots older than 26h

interface SnapshotEntry {
  timestamp: number;
  probs: Record<string, number>;
}

function loadHistory(): SnapshotEntry[] {
  try { return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8")); }
  catch { return []; }
}

function saveHistory(entries: SnapshotEntry[]) {
  try { writeFileSync(SNAPSHOT_FILE, JSON.stringify(entries)); } catch { /* no-op */ }
}

export interface PredictionMarketEntry {
  candidate: string;
  partyKey: string | null;
  probability: number;
  change: number | null; // delta vs ~24h ago (0–1 scale), null if not enough history
  url: string;
}

const CANDIDATE_TO_PARTY: Record<string, string> = {
  "Mette Frederiksen":     "A",
  "Troels Lund Poulsen":   "V",
  "Alex Vanopslagh":       "I",
  "Lars Løkke Rasmussen":  "M",
  "Inger Støjberg":        "Æ",
  "Mona Juul":             "C",
  "Pelle Dragsted":        "Ø",
  "Martin Lidegaard":      "B",
  "Morten Messerschmidt":  "O",
  "Franciska Rosenkilde":  "Å",
  "Pia Olsen Dyhr":        "F",
  "Lars Boje Mathiesen":   "H",
};

function extractCandidate(question: string): string {
  const m = question.match(/^Will (.+?) be the next/i);
  return m ? m[1] : question;
}

function parseOutcomePrice(outcomePrices: string | string[] | undefined): number {
  if (!outcomePrices) return 0;
  const arr: string[] = typeof outcomePrices === "string"
    ? JSON.parse(outcomePrices)
    : outcomePrices;
  return parseFloat(arr[0] ?? "0");
}

export async function GET() {
  try {
    const res = await fetch(POLYMARKET_API_URL, {
      headers: { "Accept": "application/json", "User-Agent": "valgidanmark/1.0" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[prediction-markets] Polymarket API error:", res.status);
      return NextResponse.json({ markets: [] });
    }

    const data = await res.json();
    const events = Array.isArray(data) ? data : [data];
    const event = events[0];

    if (!event?.markets?.length) {
      console.error("[prediction-markets] No markets in response");
      return NextResponse.json({ markets: [] });
    }

    // Build current probability map
    const currentProbs: Record<string, number> = {};
    for (const m of event.markets) {
      if (!m.outcomePrices) continue;
      currentProbs[extractCandidate(m.question)] = parseOutcomePrice(m.outcomePrices);
    }

    const now = Date.now();

    // Load history, drop old entries, append current if >1h since last entry
    let history = loadHistory();
    history = history.filter(e => now - e.timestamp < KEEP_FOR_MS);
    const lastEntry = history[history.length - 1];
    if (!lastEntry || now - lastEntry.timestamp > ONE_HOUR_MS) {
      history.push({ timestamp: now, probs: currentProbs });
      saveHistory(history);
    }

    // Find the entry closest to 24h ago for the delta reference
    const targetTs = now - TARGET_AGE_MS;
    const reference = history.reduce<SnapshotEntry | null>((best, entry) => {
      if (!best) return entry;
      return Math.abs(entry.timestamp - targetTs) < Math.abs(best.timestamp - targetTs)
        ? entry : best;
    }, null);

    // Only show delta if our best reference is at least 1h old (avoids showing 0 on fresh boot)
    const refAge = reference ? now - reference.timestamp : 0;
    const showDelta = refAge > ONE_HOUR_MS;

    const markets: PredictionMarketEntry[] = event.markets
      .filter((m: { outcomePrices?: string | string[] }) => !!m.outcomePrices)
      .map((m: { question: string; outcomePrices?: string | string[] }) => {
        const candidate = extractCandidate(m.question);
        const probability = parseOutcomePrice(m.outcomePrices);
        const prev = reference?.probs[candidate];
        const change = showDelta && prev != null ? probability - prev : null;
        return {
          candidate,
          partyKey: CANDIDATE_TO_PARTY[candidate] ?? null,
          probability,
          change,
          url: POLYMARKET_EVENT_URL,
        };
      })
      .filter((m: PredictionMarketEntry) => m.probability > 0.001)
      .sort((a: PredictionMarketEntry, b: PredictionMarketEntry) => b.probability - a.probability)
      .slice(0, 4);

    return NextResponse.json(
      { markets },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[prediction-markets] fetch failed:", err);
    return NextResponse.json({ markets: [] });
  }
}
