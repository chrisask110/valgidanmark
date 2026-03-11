import type { Metadata } from "next";
import { PredictionMarkets } from "@/app/components/PredictionMarkets";
import { KalshiMarkets } from "@/app/components/KalshiMarkets";

export const metadata: Metadata = {
  title: "Prediction Markets",
  description:
    "Implicitte sandsynligheder fra Polymarket og Kalshi for det danske Folketingsvalg 24. marts 2026.",
};

export default function PredictionMarketsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans tracking-tight">Prediction Markets</h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          Implicitte sandsynligheder fra Polymarket og Kalshi for Folketingsvalget 2026
        </p>
      </div>

      <div className="space-y-6">
        {/* Polymarket — Next PM */}
        <section>
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Polymarket
          </h2>
          <PredictionMarkets />
        </section>

        {/* Kalshi markets */}
        <section>
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Kalshi
          </h2>
          <KalshiMarkets />
        </section>
      </div>
    </main>
  );
}
