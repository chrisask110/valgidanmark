import { NextResponse } from "next/server";

const POLYMARKET_EVENT_SLUG = "next-prime-minister-of-denmark-after-parliamentary-election";
const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`;
const POLYMARKET_EVENT_URL = `https://polymarket.com/event/${POLYMARKET_EVENT_SLUG}`;

export interface PredictionMarketEntry {
  candidate: string;
  probability: number;
  url: string;
}

function extractCandidate(question: string): string {
  const m = question.match(/^Will (.+?) be the next/i);
  return m ? m[1] : question;
}

function parseOutcomePrice(outcomePrices: string | string[] | undefined): number {
  // The API returns outcomePrices as a JSON-encoded string, e.g. '["0.765","0.235"]'
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
      .map((m: { question: string; outcomePrices?: string | string[] }) => ({
        candidate: extractCandidate(m.question),
        probability: parseOutcomePrice(m.outcomePrices),
        url: POLYMARKET_EVENT_URL,
      }))
      .filter((m: PredictionMarketEntry) => m.probability > 0.001)
      .sort((a: PredictionMarketEntry, b: PredictionMarketEntry) => b.probability - a.probability)
      .slice(0, 3);

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
