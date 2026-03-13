import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Placement markets (2nd / 3rd place) — Polymarket binary markets per party
// ---------------------------------------------------------------------------
const SECOND_PLACE_CONDITIONS: Record<string, string> = {
  V:  "0x69f8e4dd1ce271adb39d705b3167329b6c10666bc55e0e0fa8ffd637bb7e4727",
  F:  "0x3295f2c43edab04909fcfcb8e6368f0cf8caa120ebfe92794751273494dbe7d2",
  M:  "0xc0eb2d1a9e4f51cd9be207cc5e6789df6d186a2fcc694bdbcefae390826edd6a",
  Ø:  "0x18af6c77626be130410fa28fd8b4535b72d40e0e970c25da822329cdb6a73959",
  C:  "0x1795d7ba5c3eaadf9c5a3650f4f72db88f617c680e6ff7da4714e71083974ea0",
  B:  "0x530fc85326dc55b08286dd3ba54e6cb2daf4307923fe54ce11b1150794e26e51",
  O:  "0x5c1c9093f8ddeacce6fbc37796787a225c343659c7062f69024b289b82aa1a9b",
  Å:  "0x569e2e09aec5a89c8971d9e4db02fa57cb7a9387dee684d412341229cd77fb1c",
};
const THIRD_PLACE_CONDITIONS: Record<string, string> = {
  A:  "0x249107134e41ac7b60521fb2a7749f323d94393a62066f7547d4c53f1a9743c6",
  Æ:  "0x5131e71a3e2f029811b8de99c9b8536d78fc8c5dde99156f1ed997fcf2cb77f3",
  I:  "0x3354870a288bf1cea099876ea37ac39f46913db16197ef14404ccb65875fa341",
  V:  "0x17a419d9fb33090bec9da9bd6a5c47ac48877b51458b85c42d4e244494e53b09",
  F:  "0xbb15ae7934eac7ee3916efae49bfb74a5418c0e1cf4824a15b5719d6b531bcc5",
  M:  "0x65ee29bfb59a93f9247d114ec08ddc4f2c35735bb56c971b9f6f0d711c48d62d",
  Ø:  "0xb9a490ae46a9e69cf8ecd31689282cbbfd1d30719c3e9327c53dd3dd65807e19",
  B:  "0xe2970aebd7feba8a9f97dd0a1becc2bf9281eca18d9ad2c221fdd7c84ea035ff",
};

// ---------------------------------------------------------------------------
// Party seat markets — Polymarket range markets per party
// ---------------------------------------------------------------------------
const PARTY_SEATS_CONDITIONS: Record<string, { label: string; conditionId: string }[]> = {
  A: [
    { label: "<35",   conditionId: "0x82235d0e34b8b96e761871385bf61eab785d93fcc50907583cecdb1da91586b1" },
    { label: "35–39", conditionId: "0x93ad176648db81450d68a74aa352e55d04aeab5cd50cc897345740b94ae5ed5c" },
    { label: "40–44", conditionId: "0xea3c705f9010481c2070b4ac77adb1f50c0b0baa86ccc026ebcaab8d5d72f721" },
    { label: "45–49", conditionId: "0xc832f2e7fcb2eda3c6ba0840c16eacedad29588da299c8dbc0e84d5245a075a7" },
    { label: "50+",   conditionId: "0x1bac4b795abaf473552e3c19f732f306d3c1f74a8dc9e947d9242d7b24736351" },
  ],
  V: [
    { label: "<15",   conditionId: "0xe295a072cfe942597e058d84b19df67caa5bfe0fa141ae6d9d7e4b33f7b3747a" },
    { label: "15–19", conditionId: "0x1f90f59ed029c573e4dec7d1e2c3a8a6a8ee8f68aa50ccfe63ae88b6e942b9e2" },
    { label: "20–24", conditionId: "0x722facead68c141b5863e21e2abf07024412bd67db686bff38a42e3b12ead9df" },
    { label: "25–29", conditionId: "0xe59f76f1b7ce66eb1af1a03f02c02068a9fa12d00094cf44a670a5d9995b61e2" },
    { label: "30+",   conditionId: "0xbac3c127674a25a3d2ea36f854796649baa832c7d3546bc835b4ca31cc5c62a3" },
  ],
  I: [
    { label: "<15",   conditionId: "0x197da42f1ef7453f64130b398bcec34a58151cfcbb266367fb5520c486e61fa7" },
    { label: "15–19", conditionId: "0x14b62e8c67735fb5c34a8190fdf202f14367339edda5d1103e92a7c8e2e8990a" },
    { label: "20–24", conditionId: "0x520da60cfabfa2e344c166443c5aecc5ba3c079e663caa0d3d9e2456e2bf4c51" },
    { label: "25–29", conditionId: "0xb7449350644a5450993e1f6a926b33343dd897a8f6139eec5fa588d6688f0aca" },
    { label: "30+",   conditionId: "0x6468f1a7f4970de0cb9cc92e379509830b1acf4a85efbfc3e263d0b01a719a4c" },
  ],
  F: [
    { label: "<20",   conditionId: "0xb1c55630b184a96a1a980381f1ed5860f3b64a721cead87eea8a751dc25bdd61" },
    { label: "20–24", conditionId: "0xec2bbb6059d6b21481c7c42229aba4cb50b83eae9abebd6ea54089f8c96829d5" },
    { label: "25–29", conditionId: "0xb4497608912444dbc7eaa41929989122e1c05f13b74c638d44ad80293a2e2840" },
    { label: "30–34", conditionId: "0x3040cd92c3fae24a098e2daaec177e28c6a1784f5bc6daf1d2c495f2bbc818b7" },
    { label: "35+",   conditionId: "0x62bc29df96d3bed84ea1300839cabf3ccfe7ff98ac20a4a67803b2f6f4e6ae72" },
  ],
};

// Batch-fetch Polymarket binary markets by conditionId → { conditionId → yes_probability }
async function fetchConditionPrices(conditionIds: string[]): Promise<Record<string, number>> {
  if (conditionIds.length === 0) return {};
  const url = `https://gamma-api.polymarket.com/markets?conditionIds=${conditionIds.join(",")}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "valgidanmark/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return {};
  const markets: { conditionId: string; outcomePrices?: string | string[] }[] = await res.json();
  const result: Record<string, number> = {};
  for (const m of markets) {
    if (!m.outcomePrices) continue;
    const arr: string[] = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices;
    result[m.conditionId] = parseFloat(arr[0] ?? "0");
  }
  return result;
}

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
  change: number | null;
  url: string;
}
export interface PlacementEntry { partyKey: string; probability: number; }
export interface SeatRangeEntry { label: string; probability: number; }
export interface PartySeatsEntry { partyKey: string; ranges: SeatRangeEntry[]; }

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
    const allIds = [
      ...Object.values(SECOND_PLACE_CONDITIONS),
      ...Object.values(THIRD_PLACE_CONDITIONS),
      ...Object.values(PARTY_SEATS_CONDITIONS).flatMap(rs => rs.map(r => r.conditionId)),
    ];

    const [pmRes, prices] = await Promise.all([
      fetch(POLYMARKET_API_URL, {
        headers: { "Accept": "application/json", "User-Agent": "valgidanmark/1.0" },
        cache: "no-store",
      }),
      fetchConditionPrices(allIds),
    ]);

    if (!pmRes.ok) {
      console.error("[prediction-markets] Polymarket API error:", pmRes.status);
      return NextResponse.json({ markets: [], secondPlace: [], thirdPlace: [], partySeats: [] });
    }

    const data = await pmRes.json();
    const events = Array.isArray(data) ? data : [data];
    const event = events[0];

    if (!event?.markets?.length) {
      return NextResponse.json({ markets: [], secondPlace: [], thirdPlace: [], partySeats: [] });
    }

    // --- PM race (existing logic) ---
    const currentProbs: Record<string, number> = {};
    for (const m of event.markets) {
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

    const refAge = reference ? now - reference.timestamp : 0;
    const showDelta = refAge > ONE_HOUR_MS;

    const markets: PredictionMarketEntry[] = event.markets
      .filter((m: { outcomePrices?: string | string[] }) => !!m.outcomePrices)
      .map((m: { question: string; outcomePrices?: string | string[] }) => {
        const candidate = extractCandidate(m.question);
        const probability = parseOutcomePrice(m.outcomePrices);
        const prev = reference?.probs[candidate];
        const change = showDelta && prev != null ? probability - prev : null;
        return { candidate, partyKey: CANDIDATE_TO_PARTY[candidate] ?? null, probability, change, url: POLYMARKET_EVENT_URL };
      })
      .filter((m: PredictionMarketEntry) => m.probability > 0.001)
      .sort((a: PredictionMarketEntry, b: PredictionMarketEntry) => b.probability - a.probability)
      .slice(0, 4);

    // --- Placement markets ---
    const toPlacement = (conditions: Record<string, string>): PlacementEntry[] =>
      Object.entries(conditions)
        .map(([partyKey, id]) => ({ partyKey, probability: prices[id] ?? 0 }))
        .filter(e => e.probability > 0)
        .sort((a, b) => b.probability - a.probability);

    const secondPlace = toPlacement(SECOND_PLACE_CONDITIONS);
    const thirdPlace  = toPlacement(THIRD_PLACE_CONDITIONS);

    // --- Party seat markets ---
    const partySeats: PartySeatsEntry[] = Object.entries(PARTY_SEATS_CONDITIONS).map(([partyKey, ranges]) => ({
      partyKey,
      ranges: ranges.map(r => ({ label: r.label, probability: prices[r.conditionId] ?? 0 })),
    }));

    return NextResponse.json(
      { markets, secondPlace, thirdPlace, partySeats },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[prediction-markets] fetch failed:", err);
    return NextResponse.json({ markets: [], secondPlace: [], thirdPlace: [], partySeats: [] });
  }
}
