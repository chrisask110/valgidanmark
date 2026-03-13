import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

export const dynamic = "force-dynamic";

const GAMMA = "https://gamma-api.polymarket.com/events?slug=";
const HEADERS = { Accept: "application/json", "User-Agent": "valgidanmark/1.0" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseOutcomePrice(outcomePrices: string | string[] | undefined): number {
  if (!outcomePrices) return 0;
  const arr: string[] = typeof outcomePrices === "string" ? JSON.parse(outcomePrices) : outcomePrices;
  return parseFloat(arr[0] ?? "0");
}

async function fetchEvent(slug: string) {
  const res = await fetch(`${GAMMA}${slug}`, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const events = Array.isArray(data) ? data : [data];
  return events[0] ?? null;
}

// Map Polymarket English party names (groupItemTitle) → our party keys
const PARTY_TITLE_MAP: Record<string, string> = {
  "Venstre":                       "V",
  "Green Left":                    "F",
  "SF":                            "F",
  "Moderates":                     "M",
  "Red–Green Alliance":            "Ø",
  "Red-Green Alliance":            "Ø",
  "Conservative People's Party":   "C",
  "Danish Social Liberal Party":   "B",
  "Danish People's Party":         "O",
  "The Alternative":               "Å",
  "Social Democrats":              "A",
  "Social Democratic Party":       "A",
  "Denmark Democrats":             "Æ",
  "Liberal Alliance":              "I",
  "Citizens' Party":               "H",
};

// Normalise a seat-range label: "45-49" → "45–49", keep "<35", "50+" as-is
function normRange(s: string) { return s.replace(/-(?=\d)/g, "–"); }

// ---------------------------------------------------------------------------
// PM race snapshot history
// ---------------------------------------------------------------------------
const SNAPSHOT_FILE = "/tmp/pm-history.json";
const ONE_HOUR_MS   =       60 * 60 * 1000;
const TARGET_AGE_MS = 24 * 60 * 60 * 1000;
const KEEP_FOR_MS   = 26 * 60 * 60 * 1000;

interface SnapshotEntry { timestamp: number; probs: Record<string, number>; }

function loadHistory(): SnapshotEntry[] {
  try { return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8")); } catch { return []; }
}
function saveHistory(entries: SnapshotEntry[]) {
  try { writeFileSync(SNAPSHOT_FILE, JSON.stringify(entries)); } catch { /* no-op */ }
}

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------
export interface PredictionMarketEntry {
  candidate: string;
  partyKey: string | null;
  probability: number;
  change: number | null;
  url: string;
}
export interface PlacementEntry  { partyKey: string; probability: number; }
export interface SeatRangeEntry  { label: string; probability: number; }
export interface PartySeatsEntry { partyKey: string; ranges: SeatRangeEntry[]; }

const CANDIDATE_TO_PARTY: Record<string, string> = {
  "Mette Frederiksen":    "A",
  "Troels Lund Poulsen":  "V",
  "Alex Vanopslagh":      "I",
  "Lars Løkke Rasmussen": "M",
  "Inger Støjberg":       "Æ",
  "Mona Juul":            "C",
  "Pelle Dragsted":       "Ø",
  "Martin Lidegaard":     "B",
  "Morten Messerschmidt": "O",
  "Franciska Rosenkilde": "Å",
  "Pia Olsen Dyhr":       "F",
  "Lars Boje Mathiesen":  "H",
};

function extractCandidate(question: string): string {
  const m = question.match(/^Will (.+?) be the next/i);
  return m ? m[1] : question;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const [pmEvent, secondEvent, thirdEvent, socdemEvent, venstreEvent, laEvent, sfEvent] =
      await Promise.all([
        fetchEvent("next-prime-minister-of-denmark-after-parliamentary-election"),
        fetchEvent("denmark-parliamentary-election-2nd-place"),
        fetchEvent("denmark-parliamentary-election-3rd-place"),
        fetchEvent("of-seats-won-by-social-democrats-in-denmark-parliamentary-election"),
        fetchEvent("of-seats-won-by-venstre-in-denmark-parliamentary-election"),
        fetchEvent("of-seats-won-by-liberal-alliance-in-denmark-parliamentary-election"),
        fetchEvent("of-seats-won-by-green-left-in-denmark-parliamentary-election"),
      ]);

    // --- PM race ---
    const currentProbs: Record<string, number> = {};
    for (const m of pmEvent?.markets ?? []) {
      if (!m.outcomePrices) continue;
      currentProbs[extractCandidate(m.question)] = parseOutcomePrice(m.outcomePrices);
    }

    const now = Date.now();
    let history = loadHistory();
    history = history.filter(e => now - e.timestamp < KEEP_FOR_MS);
    const lastEntry = history[history.length - 1];
    if (!lastEntry || now - lastEntry.timestamp > ONE_HOUR_MS) {
      history.push({ timestamp: now, probs: currentProbs });
      saveHistory(history);
    }

    const targetTs = now - TARGET_AGE_MS;
    const reference = history.reduce<SnapshotEntry | null>((best, entry) => {
      if (!best) return entry;
      return Math.abs(entry.timestamp - targetTs) < Math.abs(best.timestamp - targetTs) ? entry : best;
    }, null);

    const refAge    = reference ? now - reference.timestamp : 0;
    const showDelta = refAge > ONE_HOUR_MS;
    const pmUrl     = `https://polymarket.com/event/next-prime-minister-of-denmark-after-parliamentary-election`;

    const markets: PredictionMarketEntry[] = (pmEvent?.markets ?? [])
      .filter((m: { outcomePrices?: string | string[] }) => !!m.outcomePrices)
      .map((m: { question: string; outcomePrices?: string | string[] }) => {
        const candidate  = extractCandidate(m.question);
        const probability = parseOutcomePrice(m.outcomePrices);
        const prev        = reference?.probs[candidate];
        const change      = showDelta && prev != null ? probability - prev : null;
        return { candidate, partyKey: CANDIDATE_TO_PARTY[candidate] ?? null, probability, change, url: pmUrl };
      })
      .filter((m: PredictionMarketEntry) => m.probability > 0.001)
      .sort((a: PredictionMarketEntry, b: PredictionMarketEntry) => b.probability - a.probability)
      .slice(0, 4);

    // --- Placement markets (2nd / 3rd place) ---
    function parsePlacement(event: { markets?: { groupItemTitle?: string; outcomePrices?: string | string[] }[] } | null): PlacementEntry[] {
      return (event?.markets ?? [])
        .map((m) => ({
          partyKey:    PARTY_TITLE_MAP[m.groupItemTitle ?? ""] ?? null,
          probability: parseOutcomePrice(m.outcomePrices),
        }))
        .filter((e): e is PlacementEntry => e.partyKey != null && e.probability > 0)
        .sort((a, b) => b.probability - a.probability);
    }

    const secondPlace = parsePlacement(secondEvent);
    const thirdPlace  = parsePlacement(thirdEvent);

    // --- Party seat markets ---
    function parseSeats(
      event: { markets?: { groupItemTitle?: string; outcomePrices?: string | string[]; groupItemThreshold?: string }[] } | null,
      partyKey: string,
    ): PartySeatsEntry {
      const ranges: SeatRangeEntry[] = (event?.markets ?? [])
        .map(m => ({
          label:       normRange(m.groupItemTitle ?? ""),
          probability: parseOutcomePrice(m.outcomePrices),
          _order:      parseInt(m.groupItemThreshold ?? "0", 10),
        }))
        .filter(r => r.label)
        .sort((a, b) => a._order - b._order)
        .map(({ label, probability }) => ({ label, probability }));
      return { partyKey, ranges };
    }

    const partySeats: PartySeatsEntry[] = [
      parseSeats(socdemEvent,  "A"),
      parseSeats(venstreEvent, "V"),
      parseSeats(laEvent,      "I"),
      parseSeats(sfEvent,      "F"),
    ];

    return NextResponse.json(
      { markets, secondPlace, thirdPlace, partySeats },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[prediction-markets] fetch failed:", err);
    return NextResponse.json({ markets: [], secondPlace: [], thirdPlace: [], partySeats: [] });
  }
}
