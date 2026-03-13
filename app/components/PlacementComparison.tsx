"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import Image from "next/image";

interface PlacementEntry { partyKey: string; probability: number; }
interface KalshiEntry    { label: string; partyKey: string | null; probability: number; }
interface KalshiData     { secondPlace: KalshiEntry[]; thirdPlace: KalshiEntry[]; }
interface PMData         { secondPlace: PlacementEntry[]; thirdPlace: PlacementEntry[]; }

function PartyBadge({ partyKey, size = 22 }: { partyKey: string; size?: number }) {
  const party = PARTIES[partyKey];
  if (!party) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold font-mono shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42, background: party.color }}
    >
      {party.short}
    </span>
  );
}

function PlacementColumn({
  title,
  subtitle,
  kalshi,
  polymarket,
  url,
}: {
  title: string;
  subtitle: string;
  kalshi: KalshiEntry[];
  polymarket: PlacementEntry[];
  url: string;
}) {
  // Merge all party keys from both platforms
  const kalshiMap  = Object.fromEntries(kalshi.map(e => [e.partyKey ?? e.label, e.probability]));
  const pmMap      = Object.fromEntries(polymarket.map(e => [e.partyKey, e.probability]));
  const allKeys    = Array.from(new Set([
    ...kalshi.map(e => e.partyKey ?? e.label),
    ...polymarket.map(e => e.partyKey),
  ]));

  // Sort by best probability across both platforms
  const sorted = allKeys
    .map(k => ({ key: k, pm: pmMap[k] ?? null, kal: kalshiMap[k] ?? null }))
    .sort((a, b) => Math.max(b.pm ?? 0, b.kal ?? 0) - Math.max(a.pm ?? 0, a.kal ?? 0));

  const maxProb = Math.max(...sorted.map(r => Math.max(r.pm ?? 0, r.kal ?? 0)), 0.01);

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-xs font-bold font-mono uppercase tracking-wider">{title}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0">
          Se på Polymarket →
        </a>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-[9px] font-mono text-muted-foreground">Polymarket</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Image src="/Kalshi.png" alt="Kalshi" width={10} height={10} className="rounded-full opacity-80" />
          <span className="text-[9px] font-mono text-muted-foreground">Kalshi</span>
        </div>
      </div>

      {/* Rows */}
      <div className="px-3 pb-3 space-y-1.5">
        {sorted.map(({ key, pm, kal }) => {
          const party = PARTIES[key];
          if (!party) return null;
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <PartyBadge partyKey={key} size={20} />
                <span className="text-[11px] font-mono font-medium truncate flex-1">{party.name}</span>
                <div className="flex gap-2 shrink-0">
                  <span className="text-[11px] font-mono w-9 text-right" style={{ color: "#8b5cf6" }}>
                    {pm != null ? `${(pm * 100).toFixed(0)}%` : "–"}
                  </span>
                  <span className="text-[11px] font-mono w-9 text-right text-muted-foreground">
                    {kal != null ? `${(kal * 100).toFixed(0)}%` : "–"}
                  </span>
                </div>
              </div>
              {/* Dual bar */}
              <div className="ml-[28px] space-y-0.5">
                {pm != null && (
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(pm / maxProb) * 100}%` }} />
                  </div>
                )}
                {kal != null && (
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-orange-400" style={{ width: `${(kal / maxProb) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[9px] font-mono text-muted-foreground">Kilde: Polymarket · Kalshi · Implicit sandsynlighed</p>
      </div>
    </div>
  );
}

export function PlacementComparison() {
  const [pm, setPm]         = useState<PMData | null>(null);
  const [kalshi, setKalshi] = useState<KalshiData | null>(null);

  useEffect(() => {
    const load = () => Promise.all([
      fetch("/api/prediction-markets").then(r => r.json()).then(d => setPm(d)).catch(() => {}),
      fetch("/api/kalshi").then(r => r.json()).then(d => setKalshi(d)).catch(() => {}),
    ]);
    load();
    const id = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!pm || !kalshi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <PlacementColumn
        title="Andenplads"
        subtitle="Hvilke parti får flest stemmer efter Socialdemokraterne?"
        kalshi={kalshi.secondPlace}
        polymarket={pm.secondPlace}
        url="https://polymarket.com/event/denmark-parliamentary-election-2nd-place"
      />
      <PlacementColumn
        title="Tredjeplads"
        subtitle="Hvilke parti får den tredjehøjeste stemmeprocent?"
        kalshi={kalshi.thirdPlace}
        polymarket={pm.thirdPlace}
        url="https://polymarket.com/event/denmark-parliamentary-election-3rd-place"
      />
    </div>
  );
}
