import type { Metadata } from "next";
import { InstitutterClient } from "@/app/components/InstitutterClient";
import { getPolls } from "@/lib/db";
import { FALLBACK_POLLS, calcHouseEffects, calcPollsterWeightShares } from "@/app/lib/data";

export const metadata: Metadata = {
  title: "Institutter",
  description: "Bedømmelse af danske meningsmålingsinstitutter — nøjagtighed, metode og vægtning i ValgiDanmarks model.",
};

export default async function InstitutterPage() {
  let polls = FALLBACK_POLLS;
  try {
    const dbPolls = await getPolls();
    if (dbPolls.length > 0) polls = dbPolls;
  } catch { /* use fallback */ }

  const houseEffects   = calcHouseEffects(polls);
  const weightShares   = calcPollsterWeightShares(polls);

  return <InstitutterClient houseEffects={houseEffects} weightShares={weightShares} />;
}
