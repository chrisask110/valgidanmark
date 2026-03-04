import { NextResponse } from "next/server";

const POLYMARKET_EVENT_SLUG = "next-prime-minister-of-denmark-after-parliamentary-election";
const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`;
const POLYMARKET_EVENT_URL = `https://polymarket.com/event/${POLYMARKET_EVENT_SLUG}`;

export interface PredictionMarketEntry {
  candidate: string;
  partyKey: string | null;
  probability: number;
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

    const markets: PredictionMarketEntry[] = event.markets
      .filter((m: { outcomePrices?: string | string[] }) => !!m.outcomePrices)
      .map((m: { question: string; outcomePrices?: string | string[] }) => {
        const candidate = extractCandidate(m.question);
        return {
          candidate,
          partyKey: CANDIDATE_TO_PARTY[candidate] ?? null,
          probability: parseOutcomePrice(m.outcomePrices),
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
