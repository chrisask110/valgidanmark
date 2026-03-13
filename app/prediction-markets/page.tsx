import type { Metadata } from "next";
import { PredictionMarkets } from "@/app/components/PredictionMarkets";
import { KalshiMarkets } from "@/app/components/KalshiMarkets";
import { PlacementComparison } from "@/app/components/PlacementComparison";
import { PartySeatsCard } from "@/app/components/PartySeatsCard";
import { FALLBACK_POLLS, PARTY_KEYS, calcWeightedAverage, calcPartySeats } from "@/app/lib/data";
import { getPolls } from "@/lib/db";

export const metadata: Metadata = {
  title: "Prediction Markets",
  description:
    "Implicitte sandsynligheder fra Polymarket og Kalshi for det danske Folketingsvalg 24. marts 2026.",
};

export default async function PredictionMarketsPage() {
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
          { label: "Næste statsminister", sub: "Polymarket", href: "#pm" },
          { label: "Hvilke partier vinder mandater?", sub: "Kalshi", href: "#gain" },
          { label: "Andenplads & tredjeplads", sub: "Polymarket · Kalshi", href: "#place" },
          { label: "Mandattal per parti", sub: "Polymarket · Kalshi", href: "#seats" },
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

        {/* Kalshi — gain seats */}
        <section id="gain">
          <KalshiMarkets currentSeats={currentSeats} />
        </section>

        {/* 2nd + 3rd place — Polymarket & Kalshi side by side */}
        <section id="place">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Polymarket · Kalshi · Andenplads & tredjeplads</h2>
          </div>
          <PlacementComparison />
        </section>

        {/* Party seats — Polymarket tabbed + Kalshi socdem */}
        <section id="seats">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Polymarket · Mandattal per parti</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PartySeatsCard currentSeats={currentSeats} />
            {/* Kalshi — Social Democrats seats (separate section) */}
            <div>
              <KalshiMarkets currentSeats={currentSeats} socdemOnly />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
