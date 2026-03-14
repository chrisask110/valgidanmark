import type { Metadata } from "next";
import { InstitutterClient } from "@/app/components/InstitutterClient";
import { getPolls } from "@/lib/db";
import { FALLBACK_POLLS, calcHouseEffects, calcPollsterWeightShares } from "@/app/lib/data";

export const metadata: Metadata = {
  title: "Institutter – Bedømmelse af Verian, Epinion, Megafon & Voxmeter",
  description:
    "Sammenligning og bedømmelse af de fire danske meningsmålingsinstitutter: Verian, Epinion, Megafon og Voxmeter. Historisk nøjagtighed, huseffekter og vægtning i ValgiDanmarks model.",
  keywords: [
    "verian meningsmåling", "epinion meningsmåling", "megafon meningsmåling", "voxmeter meningsmåling",
    "bedste meningsmålingsinstitut", "huseffekter meningsmålinger", "institutter folketing",
    "meningsmåling nøjagtighed", "valgmåling sammenligning",
  ],
  alternates: {
    canonical: "https://valgidanmark.dk/institutter",
  },
  openGraph: {
    title: "Institutter – Verian, Epinion, Megafon & Voxmeter | ValgiDanmark",
    description:
      "Bedømmelse af de fire danske meningsmålingsinstitutter med historisk nøjagtighed og huseffekter.",
    url: "https://valgidanmark.dk/institutter",
    images: [{ url: "/opengraph-image", alt: "ValgiDanmark logo", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
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
