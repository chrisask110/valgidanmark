import { unstable_cache } from "next/cache";
import { PageClient } from "./components/PageClient";
import { getPolls } from "@/lib/db";
import {
  FALLBACK_POLLS, PARTY_KEYS, calcWeightedAverage, calcPartySeats,
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

    const today = new Date().toISOString().slice(0, 10);
    const partyPct: Record<string, number> = {};
    for (const pk of PARTY_KEYS) {
      partyPct[pk] = calcWeightedAverage(polls, pk, today) ?? 0;
    }
    const seats    = calcPartySeats(partyPct);
    const forecast = runMonteCarlo(partyPct);
    return { polls, partyPct, seats, forecast };
  },
  ["model-data"],
  { revalidate: 600 },
);

export default async function Page() {
  const model = await getModelData();
  return <PageClient initialModel={model} />;
}
