"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import { useLanguage } from "./LanguageContext";

interface MarketEntry {
  candidate: string;
  partyKey: string | null;
  probability: number;
  url: string;
}

const POLYMARKET_EVENT_URL =
  "https://polymarket.com/event/next-prime-minister-of-denmark-after-parliamentary-election";

function getColor(partyKey: string | null, fallback = "#64748b"): string {
  if (partyKey && PARTIES[partyKey]) return PARTIES[partyKey].color;
  return fallback;
}

function CandidatePhoto({
  partyKey,
  candidate,
  size,
  color,
}: {
  partyKey: string | null;
  candidate: string;
  size: number;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = candidate.split(" ").map(w => w[0]).slice(0, 2).join("");

  if (!partyKey || failed) {
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0 font-mono font-bold text-white"
        style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, border: `2px solid ${color}55`, background: color }}
    >
      <img
        src={`/Leaders/${partyKey}.jpg`}
        alt={candidate}
        className="w-full h-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </div>
  );
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

  const [top, ...rest] = markets ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col min-h-[260px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              {t("pm.title")}
            </h2>
            {/* Polymarket logo */}
            <a
              href={POLYMARKET_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Polymarket"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#0072F5"/>
                <path d="M10 28V12h9.2c2.1 0 3.7.5 4.9 1.6 1.2 1 1.8 2.5 1.8 4.3 0 1.8-.6 3.2-1.8 4.3-1.2 1-2.8 1.6-4.9 1.6H14v4.2H10zm4-7.5h4.8c1 0 1.8-.3 2.3-.8.6-.5.8-1.2.8-2.1 0-.9-.3-1.6-.8-2.1-.5-.5-1.3-.8-2.3-.8H14v5.8z" fill="white"/>
              </svg>
            </a>
          </div>
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

      {/* Loading / error */}
      {!markets && !error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm font-mono text-muted-foreground">{t("pm.loading")}</p>
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm font-mono text-muted-foreground">{t("pm.error")}</p>
        </div>
      )}

      {markets && (
        <div className="flex-1 flex flex-col gap-3">
          {/* Hero — #1 candidate */}
          {top && (() => {
            const color = getColor(top.partyKey);
            const pct = Math.round(top.probability * 100);
            return (
              <a
                href={POLYMARKET_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg p-3 group transition-colors"
                style={{ background: `${color}10`, border: `1px solid ${color}30` }}
              >
                <CandidatePhoto
                  partyKey={top.partyKey}
                  candidate={top.candidate}
                  size={52}
                  color={color}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold font-mono truncate group-hover:underline">
                      {top.candidate}
                    </span>
                    <span
                      className="text-xl font-black font-mono tabular-nums flex-shrink-0"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </div>
                  {top.partyKey && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {PARTIES[top.partyKey]?.short} · {PARTIES[top.partyKey]?.name.split("–")[0].trim()}
                    </span>
                  )}
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                      }}
                    />
                  </div>
                </div>
              </a>
            );
          })()}

          {/* Compact rows — #2–4 */}
          <div className="space-y-2">
            {rest.map((m, i) => {
              const color = getColor(m.partyKey);
              const pct = Math.round(m.probability * 100);
              return (
                <a
                  key={m.candidate}
                  href={POLYMARKET_EVENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <span className="text-[10px] font-mono text-muted-foreground/60 w-3 flex-shrink-0 text-right">
                    {i + 2}
                  </span>
                  <CandidatePhoto
                    partyKey={m.partyKey}
                    candidate={m.candidate}
                    size={32}
                    color={color}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-mono truncate text-foreground group-hover:underline">
                        {m.candidate}
                      </span>
                      <span
                        className="text-xs font-bold font-mono tabular-nums flex-shrink-0"
                        style={{ color }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `${color}99` }}
                      />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
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
