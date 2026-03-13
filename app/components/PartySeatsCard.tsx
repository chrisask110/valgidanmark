"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import Image from "next/image";

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

function PartySeatsPanel({ entry, currentSeats }: { entry: PartySeatsEntry; currentSeats?: number }) {
  const party = PARTIES[entry.partyKey];
  if (!party) return null;
  return (
    <div className="space-y-2 py-3">
      {currentSeats != null && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-mono text-muted-foreground">
            ValgiDanmarks model: <span className="font-bold text-foreground">~{currentSeats} mandater</span>
          </span>
        </div>
      )}
      {entry.ranges.map(r => {
        const pct      = Math.round(r.probability * 100);
        const barWidth = r.probability * 100;
        return (
          <a key={r.label} href={PARTY_URLS[entry.partyKey as PartyTab]} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 group rounded-lg px-2 py-1 hover:bg-muted/30 transition-colors">
            <div className="w-10 text-right shrink-0">
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{r.label}</span>
            </div>
            <div className="flex-1 h-5 rounded bg-muted/60 overflow-hidden relative">
              <div className="h-full rounded transition-all duration-500"
                style={{ width: `${barWidth}%`, background: party.color }} />
            </div>
            <span className="text-xs font-mono tabular-nums w-9 text-right shrink-0 font-semibold"
              style={{ color: party.color }}>
              {pct > 0 ? `${pct}%` : "–"}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export function PartySeatsCard({ currentSeats }: { currentSeats: Record<string, number> }) {
  const [data, setData]     = useState<PMData | null>(null);
  const [active, setActive] = useState<PartyTab>("A");

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
        <div className="flex items-center gap-2">
          <Image src="/Polymarket.png" alt="Polymarket" width={16} height={16} className="rounded-sm opacity-90" />
          <div>
            <p className="text-xs font-bold font-mono uppercase tracking-wider">Mandattal per parti</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Polymarket · Implicit sandsynlighed per interval</p>
          </div>
        </div>
        <a href={PARTY_URLS[active]} target="_blank" rel="noopener noreferrer"
          className="text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0">
          Se på Polymarket →
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {PARTY_TABS.map(key => {
          const party    = PARTIES[key];
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-mono font-medium transition-colors ${
                isActive ? "bg-card border-b-2 text-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
              style={{ borderBottomColor: isActive ? party?.color : "transparent" }}>
              <span className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
                style={{ width: 16, height: 16, fontSize: 8, background: party?.color }}>
                {party?.short}
              </span>
              <span className="hidden sm:inline truncate">{party?.name.split("–")[0].trim().split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-2">
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
