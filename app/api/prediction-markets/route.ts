import { NextResponse } from "next/server";

const POLYMARKET_EVENT_SLUG = "next-prime-minister-of-denmark-after-parliamentary-election";
const POLYMARKET_EVENT_URL = `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`;

export interface PredictionMarketEntry {
  question: string;
  candidate: string;  // extracted from question
  probability: number; // 0–1
  url: string;
}

function extractCandidate(question: string): string {
  // "Will X be the next prime minister..." → X
  const m = question.match(/^Will (.+?) be the next/i);
  return m ? m[1] : question;
}

export async function GET() {
  try {
    const res = await fetch(POLYMARKET_EVENT_URL, {
      next: { revalidate: 300 }, // cache 5 minutes
    });

    if (!res.ok) throw new Error(`Polymarket API returned ${res.status}`);

    const data = await res.json();
    const events = Array.isArray(data) ? data : [data];
    const event = events[0];

    if (!event?.markets?.length) {
      return NextResponse.json({ markets: [] });
    }

    const markets: PredictionMarketEntry[] = event.markets
      .map((m: { question: string; outcomePrices?: string[]; conditionId?: string }) => ({
        question: m.question,
        candidate: extractCandidate(m.question),
        probability: parseFloat(m.outcomePrices?.[0] ?? "0"),
        url: `https://polymarket.com/event/${POLYMARKET_EVENT_SLUG}`,
      }))
      .filter((m: PredictionMarketEntry) => !isNaN(m.probability) && m.probability > 0)
      .sort((a: PredictionMarketEntry, b: PredictionMarketEntry) => b.probability - a.probability)
      .slice(0, 3);

    return NextResponse.json({ markets });
  } catch {
    return NextResponse.json({ markets: [] }, { status: 200 });
  }
}
