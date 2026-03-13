"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";

interface SeatRangeEntry  { label: string; probability: number; }
interface PartySeatsEntry { partyKey: string; ranges: SeatRangeEntry[]; }
interface PMData          { partySeats: PartySeatsEntry[]; }

const PARTY_TABS = ["A", "V", "I", "F"] as const;
type PartyTab = typeof PARTY_TABS[number];

const PARTY_URLS: Record<PartyTab, string> = {
  A: "https://polymarket.com/event/of-seats-won-by-social-democrats-in-denmark-parliamentary-election",
  V: "https://polymarket.com/event/of-seats-won-by-venstre-in-denmark-parliamentary-election",
  I: "https://polymarket.com/event/of-seats-won-by-liberal-alliance-in-denmark-parliamentary-election",
  F: "https://polymarket.com/event/of-seats-won-by-green-left-in-denmark-parliamentary-election",
};

function SeatBar({ label, probability, color, max }: {
  label: string; probability: number; color: string; max: number;
}) {
  const pct = probability * 100;
  const barWidth = max > 0 ? (probability / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono text-muted-foreground w-12 text-right shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${barWidth}%`, background: color }}
        />
        <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] font-mono font-bold"
          style={{ color: barWidth > 50 ? "white" : "currentColor" }}>
          {pct > 0 ? `${pct.toFixed(0)}%` : "–"}
        </span>
      </div>
    </div>
  );
}

function PartySeatsPanel({ entry, currentSeats }: { entry: PartySeatsEntry; currentSeats?: number }) {
  const party = PARTIES[entry.partyKey];
  if (!party) return null;
  const max = Math.max(...entry.ranges.map(r => r.probability), 0.01);

  return (
    <div className="space-y-2 py-3">
      {currentSeats != null && (
        <p className="text-[10px] font-mono text-muted-foreground px-1 mb-3">
          ValgiDanmarks model: <span className="font-bold text-foreground">~{currentSeats} mandater</span>
        </p>
      )}
      {entry.ranges.map(r => (
        <SeatBar
          key={r.label}
          label={r.label}
          probability={r.probability}
          color={party.color}
          max={max}
        />
      ))}
    </div>
  );
}

export function PartySeatsCard({ currentSeats }: { currentSeats: Record<string, number> }) {
  const [data, setData]       = useState<PMData | null>(null);
  const [active, setActive]   = useState<PartyTab>("A");

  useEffect(() => {
    const load = () =>
      fetch("/api/prediction-markets")
        .then(r => r.json())
        .then(d => setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const seatsMap: Record<string, PartySeatsEntry> = Object.fromEntries(
    (data?.partySeats ?? []).map(e => [e.partyKey, e])
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-xs font-bold font-mono uppercase tracking-wider">Mandattal per parti</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Polymarket · Implicit sandsynlighed per mandatinterval</p>
        </div>
        {PARTY_URLS[active] && (
          <a href={PARTY_URLS[active]} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0">
            Se på Polymarket →
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {PARTY_TABS.map(key => {
          const party = PARTIES[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono font-medium transition-colors ${
                isActive ? "bg-card border-b-2 text-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
              style={{ borderBottomColor: isActive ? party?.color : "transparent" }}
            >
              <span
                className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
                style={{ width: 16, height: 16, fontSize: 8, background: party?.color }}
              >
                {party?.short}
              </span>
              <span className="hidden sm:inline truncate">{party?.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-4">
        {!data ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-pulse text-[11px] font-mono text-muted-foreground">Henter data…</div>
          </div>
        ) : seatsMap[active] ? (
          <PartySeatsPanel
            entry={seatsMap[active]}
            currentSeats={currentSeats[active] != null ? Math.round(currentSeats[active]) : undefined}
          />
        ) : (
          <p className="py-8 text-center text-[11px] font-mono text-muted-foreground">Ingen data tilgængelig</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[9px] font-mono text-muted-foreground">Kilde: Polymarket · Implicit sandsynlighed</p>
      </div>
    </div>
  );
}
