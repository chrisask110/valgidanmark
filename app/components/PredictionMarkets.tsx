"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageContext";

interface MarketEntry {
  candidate: string;
  probability: number;
  url: string;
}

const POLYMARKET_EVENT_URL =
  "https://polymarket.com/event/next-prime-minister-of-denmark-after-parliamentary-election";

// Known candidate → approximate party color mapping
const CANDIDATE_COLORS: Record<string, string> = {
  "Mette Frederiksen": "#E3515A",    // A – Socialdemokratiet
  "Troels Lund Poulsen": "#003F87",  // V – Venstre
  "Lars Løkke Rasmussen": "#7B3FA0", // M – Moderaterne
  "Alex Vanopslagh": "#00AAFF",      // I – Liberal Alliance
  "Jakob Ellemann-Jensen": "#003F87",
  "Søren Pape Poulsen": "#E5851B",   // C
  "Inger Støjberg": "#C0392B",       // Æ – Danmarksdemokraterne
};

function getColor(candidate: string): string {
  for (const [name, color] of Object.entries(CANDIDATE_COLORS)) {
    if (candidate.toLowerCase().includes(name.toLowerCase().split(" ")[0].toLowerCase())) {
      return color;
    }
  }
  return "#64748b";
}

export function PredictionMarkets() {
  const { t } = useLanguage();
  const [markets, setMarkets] = useState<MarketEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/prediction-markets")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.markets) && data.markets.length > 0) {
          setMarkets(data.markets);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            {t("pm.title")}
          </h2>
          <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">
            {t("pm.subtitle")}
          </p>
        </div>
        <a
          href={POLYMARKET_EVENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("pm.viewall")}
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        {!markets && !error && (
          <p className="text-sm font-mono text-muted-foreground text-center">
            {t("pm.loading")}
          </p>
        )}

        {error && (
          <p className="text-sm font-mono text-muted-foreground text-center">
            {t("pm.error")}
          </p>
        )}

        {markets && (
          <div className="space-y-4">
            {markets.map((m, i) => {
              const pct = Math.round(m.probability * 100);
              const color = getColor(m.candidate);
              const isTop = i === 0;
              return (
                <a
                  key={m.candidate}
                  href={POLYMARKET_EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {/* Rank badge */}
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                        style={{
                          background: isTop ? `${color}22` : "transparent",
                          color: isTop ? color : "var(--muted-foreground)",
                          border: `1px solid ${isTop ? color + "44" : "transparent"}`,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm font-mono font-semibold group-hover:underline transition-colors"
                        style={{ color: isTop ? color : undefined }}
                      >
                        {m.candidate}
                      </span>
                    </div>
                    <span
                      className="text-sm font-mono font-bold tabular-nums"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: isTop
                          ? `linear-gradient(90deg, ${color}88, ${color})`
                          : `${color}88`,
                      }}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {t("pm.source")}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {t("pm.implied")}
        </span>
      </div>
    </div>
  );
}
