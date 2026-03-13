import { unstable_cache } from "next/cache";
import { PageClient } from "./components/PageClient";
import { getPolls } from "@/lib/db";
import {
  FALLBACK_POLLS, PARTY_KEYS, ANNOUNCEMENT_DATE, calcWeightedAverage, calcPartySeats,
} from "./lib/data";
import { runMonteCarlo } from "./lib/monte-carlo";
import type { ModelData } from "./components/PageClient";

const getModelData = unstable_cache(
  async (): Promise<ModelData> => {
    let polls = FALLBACK_POLLS;
    try {
      const dbPolls = await getPolls();
      if (dbPolls.length > 0) polls = dbPolls;
    } catch { /* use fallback */ }

    const today   = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const partyPct: Record<string, number> = {};
    const partyPctAnnouncement: Record<string, number> = {};
    const partyPctWeekAgo: Record<string, number> = {};
    for (const pk of PARTY_KEYS) {
      partyPct[pk]             = calcWeightedAverage(polls, pk, today)             ?? 0;
      partyPctAnnouncement[pk] = calcWeightedAverage(polls, pk, ANNOUNCEMENT_DATE) ?? 0;
      partyPctWeekAgo[pk]      = calcWeightedAverage(polls, pk, weekAgo)           ?? 0;
    }
    const seats             = calcPartySeats(partyPct);
    const seatsAnnouncement = calcPartySeats(partyPctAnnouncement);
    const seatsWeekAgo      = calcPartySeats(partyPctWeekAgo);
    const forecast = runMonteCarlo(partyPct);
    return { polls, partyPct, seats, forecast, seatsAnnouncement, seatsWeekAgo };
  },
  ["model-data"],
  { revalidate: 600 },
);

export default async function Page() {
  const model = await getModelData();
  return <PageClient initialModel={model} />;
}
