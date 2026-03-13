import { NextResponse } from "next/server";
import { getPolls } from "@/lib/db";
import {
  FALLBACK_POLLS,
  PARTY_KEYS,
  calcWeightedAverage,
  calcPartySeats,
} from "@/app/lib/data";
import { runMonteCarlo } from "@/app/lib/monte-carlo";

export const dynamic = "force-dynamic";

export async function GET() {
  let polls = FALLBACK_POLLS;
  try {
    const dbPolls = await getPolls();
    if (dbPolls.length > 0) polls = dbPolls;
  } catch { /* use fallback */ }

  const today = new Date().toISOString().slice(0, 10);
  const partyPct: Record<string, number> = {};
  for (const pk of PARTY_KEYS) {
    partyPct[pk] = calcWeightedAverage(polls, pk, today) ?? 0;
  }

  const seats    = calcPartySeats(partyPct);
  const forecast = runMonteCarlo(partyPct);

  return NextResponse.json(
    { polls, partyPct, seats, forecast },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" } },
  );
}
