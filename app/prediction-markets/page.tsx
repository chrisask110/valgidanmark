import type { Metadata } from "next";
import { PredictionMarkets } from "@/app/components/PredictionMarkets";
import { KalshiMarkets } from "@/app/components/KalshiMarkets";
import { FALLBACK_POLLS, PARTIES, PARTY_KEYS, calcWeightedAverage, calcPartySeats } from "@/app/lib/data";
import { getPolls } from "@/app/lib/db";

export const metadata: Metadata = {
  title: "Prediction Markets",
  description:
    "Implicitte sandsynligheder fra Polymarket og Kalshi for det danske Folketingsvalg 24. marts 2026.",
};

export default async function PredictionMarketsPage() {
  // Compute current projected seats from polls
  let polls = FALLBACK_POLLS;
  try {
    const dbPolls = await getPolls();
    if (dbPolls.length > 0) polls = dbPolls;
  } catch { /* use fallback */ }

  const partyPct: Record<string, number> = {};
  for (const key of PARTY_KEYS) {
    partyPct[key] = calcWeightedAverage(polls, key) ?? 0;
  }
  const currentSeats = calcPartySeats(partyPct);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 pb-24 sm:pb-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans tracking-tight">Prediction Markets</h1>
        <p className="text-sm font-mono text-muted-foreground mt-1 max-w-xl">
          Hvad forventer markederne at der sker ved Folketingsvalget 24. marts 2026?
          Implicitte sandsynligheder fra Polymarket og Kalshi.
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Næste statsminister", sub: "Polymarket", href: "/prediction-markets#pm" },
          { label: "Hvilke partier vinder mandater?", sub: "Kalshi", href: "/prediction-markets#gain" },
          { label: "Andenplads & tredjeplads", sub: "Kalshi", href: "/prediction-markets#place" },
          { label: "Socialdemokraternes mandattal", sub: "Kalshi", href: "/prediction-markets#socdem" },
        ].map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors group"
          >
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{s.sub}</p>
            <p className="text-xs font-semibold font-mono mt-1 group-hover:underline leading-tight">{s.label}</p>
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {/* Polymarket — Next PM */}
        <section id="pm">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Polymarket · Næste statsminister</h2>
          </div>
          <PredictionMarkets />
        </section>

        {/* Kalshi markets */}
        <section id="gain">
          <KalshiMarkets currentSeats={currentSeats} />
        </section>
      </div>
    </main>
  );
}
