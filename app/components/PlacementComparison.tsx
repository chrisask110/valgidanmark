"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import Image from "next/image";

interface PlacementEntry { partyKey: string; probability: number; }
interface KalshiEntry    { label: string; partyKey: string | null; probability: number; }
interface KalshiData     { secondPlace: KalshiEntry[]; thirdPlace: KalshiEntry[]; }
interface PMData         { secondPlace: PlacementEntry[]; thirdPlace: PlacementEntry[]; }

function PartyBadge({ partyKey, size = 20 }: { partyKey: string; size?: number }) {
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
  title, subtitle, kalshi, polymarket, pmUrl, kalshiUrl,
}: {
  title: string; subtitle: string;
  kalshi: KalshiEntry[]; polymarket: PlacementEntry[];
  pmUrl: string; kalshiUrl: string;
}) {
  const kalshiMap = Object.fromEntries(kalshi.map(e => [e.partyKey ?? e.label, e.probability]));
  const pmMap     = Object.fromEntries(polymarket.map(e => [e.partyKey, e.probability]));
  const allKeys   = Array.from(new Set([
    ...kalshi.map(e => e.partyKey ?? e.label),
    ...polymarket.map(e => e.partyKey),
  ]));

  // Sort by average; if only one platform has the party, use that value
  const rows = allKeys
    .map(k => {
      const pm  = pmMap[k]  ?? null;
      const kal = kalshiMap[k] ?? null;
      const avg = pm != null && kal != null
        ? (pm + kal) / 2
        : (pm ?? kal ?? 0);
      return { key: k, pm, kal, avg };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden">
      {/* Header with logos */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-xs font-bold font-mono uppercase tracking-wider">{title}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <a href={pmUrl} target="_blank" rel="noopener noreferrer"
            className="w-12 flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity">
            <Image src="/Polymarket.png" alt="Polymarket" width={14} height={14} className="rounded-sm" />
            <span className="text-[8px] font-mono text-muted-foreground">PM</span>
          </a>
          <a href={kalshiUrl} target="_blank" rel="noopener noreferrer"
            className="w-12 flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity">
            <Image src="/Kalshi.png" alt="Kalshi" width={14} height={14} className="rounded-sm" />
            <span className="text-[8px] font-mono text-muted-foreground">Kal</span>
          </a>
        </div>
      </div>

      {/* Rows */}
      <div className="px-3 pt-2 pb-3 space-y-2">
        {rows.map(({ key, pm, kal }) => {
          const party = PARTIES[key];
          if (!party) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-0.5">
                <PartyBadge partyKey={key} />
                <span className="text-[11px] font-mono font-medium truncate flex-1 min-w-0">{party.name}</span>
                <div className="flex gap-1 shrink-0">
                  <span className="text-[11px] font-mono w-12 text-center tabular-nums" style={{ color: "#7c3aed" }}>
                    {pm != null ? `${(pm * 100).toFixed(0)}%` : "–"}
                  </span>
                  <span className="text-[11px] font-mono w-12 text-center tabular-nums text-orange-500">
                    {kal != null ? `${(kal * 100).toFixed(0)}%` : "–"}
                  </span>
                </div>
              </div>
              {/* Dual bar */}
              <div className="ml-[28px] space-y-0.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-violet-600 transition-all duration-500"
                    style={{ width: pm != null ? `${pm * 100}%` : "0%" }} />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400 transition-all duration-500"
                    style={{ width: kal != null ? `${kal * 100}%` : "0%" }} />
                </div>
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
          <div key={i} className="rounded-xl border border-border bg-card h-52 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <PlacementColumn
        title="Andenplads"
        subtitle="Flest stemmer efter Socialdemokraterne"
        kalshi={kalshi.secondPlace}
        polymarket={pm.secondPlace}
        pmUrl="https://polymarket.com/event/denmark-parliamentary-election-2nd-place"
        kalshiUrl="https://kalshi.com/markets/kxdenmark2nd/denmark-general-election-second-place/KXDENMARK2ND-26MAR24-2"
      />
      <PlacementColumn
        title="Tredjeplads"
        subtitle="Tredje flest stemmer ved valget"
        kalshi={kalshi.thirdPlace}
        polymarket={pm.thirdPlace}
        pmUrl="https://polymarket.com/event/denmark-parliamentary-election-3rd-place"
        kalshiUrl="https://kalshi.com/markets/kxdenmark3rd/denmark-general-election-third-place/KXDENMARK3RD-26MAR24-3"
      />
    </div>
  );
}
