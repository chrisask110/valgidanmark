import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

const POLYMARKET_EVENT_SLUG = "next-prime-minister-of-denmark-after-parliamentary-election";
const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`;
const POLYMARKET_EVENT_URL = `https://polymarket.com/event/${POLYMARKET_EVENT_SLUG}`;

const SNAPSHOT_FILE = "/tmp/pm-snapshot.json";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface Snapshot {
  // "dayAgo" snapshot: the probabilities ~24h ago, used for delta calculation
  dayAgo: { timestamp: number; probs: Record<string, number> } | null;
  // "recent" snapshot: the last fetched probabilities (promoted to dayAgo after 24h)
  recent: { timestamp: number; probs: Record<string, number> } | null;
}

function loadSnapshot(): Snapshot {
  try {
    return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8"));
  } catch {
    return { dayAgo: null, recent: null };
  }
}

function saveSnapshot(s: Snapshot) {
  try { writeFileSync(SNAPSHOT_FILE, JSON.stringify(s)); } catch { /* no-op */ }
}

export interface PredictionMarketEntry {
  candidate: string;
  partyKey: string | null;
  probability: number;
  change: number | null; // probability change vs ~24h ago (0–1 scale), null if unknown
  url: string;
}

// Maps candidate full name → party key (for photo + color lookup)
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
      headers: {
        "Accept": "application/json",
        "User-Agent": "valgidanmark/1.0",
      },
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

    // Build current probabilities map
    const currentProbs: Record<string, number> = {};
    for (const m of event.markets) {
      if (!m.outcomePrices) continue;
      const candidate = extractCandidate(m.question);
      currentProbs[candidate] = parseOutcomePrice(m.outcomePrices);
    }

    // Load snapshot and compute deltas
    const now = Date.now();
    const snapshot = loadSnapshot();

    // Determine what to use as "24h ago" reference
    let dayAgoProbs: Record<string, number> | null = snapshot.dayAgo?.probs ?? null;

    // If the dayAgo snapshot is older than 24h, promote "recent" to "dayAgo"
    if (snapshot.dayAgo && now - snapshot.dayAgo.timestamp > ONE_DAY_MS) {
      dayAgoProbs = snapshot.recent?.probs ?? snapshot.dayAgo.probs;
      saveSnapshot({
        dayAgo: snapshot.recent
          ? { timestamp: snapshot.recent.timestamp, probs: snapshot.recent.probs }
          : { timestamp: now, probs: currentProbs },
        recent: { timestamp: now, probs: currentProbs },
      });
    } else if (!snapshot.dayAgo) {
      // First boot: seed both with current, delta will be null
      saveSnapshot({
        dayAgo: { timestamp: now, probs: currentProbs },
        recent: { timestamp: now, probs: currentProbs },
      });
    } else if (!snapshot.recent || now - snapshot.recent.timestamp > ONE_HOUR_MS) {
      // Update "recent" every hour
      saveSnapshot({ dayAgo: snapshot.dayAgo, recent: { timestamp: now, probs: currentProbs } });
    }

    // Only show delta if dayAgo is at least 1 hour old (avoid showing 0 on first boot)
    const dayAgoAge = snapshot.dayAgo ? now - snapshot.dayAgo.timestamp : 0;
    const showDelta = dayAgoAge > ONE_HOUR_MS;

    const markets: PredictionMarketEntry[] = event.markets
      .filter((m: { outcomePrices?: string | string[] }) => !!m.outcomePrices)
      .map((m: { question: string; outcomePrices?: string | string[] }) => {
        const candidate = extractCandidate(m.question);
        const probability = parseOutcomePrice(m.outcomePrices);
        const prev = dayAgoProbs?.[candidate];
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
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[prediction-markets] fetch failed:", err);
    return NextResponse.json({ markets: [] });
  }
}
