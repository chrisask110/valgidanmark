"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dynamic from "next/dynamic";
import ResultsTable from "./ResultsTable";

const DenmarkMap = dynamic(() => import("./DenmarkMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Indlæser kort...
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface AfstemningsomraadeResult {
  nummer: number;
  navn: string;
  dagiId: number;
  resultatart: string;
  afgivneStemmer: number;
  stemmeberettigede: number;
  partier: Array<{ bogstav: string; stemmer: number; stemmeProcent: number }>;
}

interface KommuneData {
  navn: string;
  kommunekode: number;
  storkreds: string;
  afgivneStemmer: number;
  gyldigeStemmer: number;
  stemmeberettigede: number;
  optalteAfstemningsomraader: number;
  partier: Array<{ bogstav: string; navn: string; stemmer: number; stemmeProcent: number }>;
  afstemningsomraader: AfstemningsomraadeResult[];
}

interface PartiResult {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmeProcent: number;
  antalMandater: number | null;
  diffFraForrigeValg: number | null;
}

interface AggregatedResults {
  lastUpdated: string;
  totalAfstemningsomraader: number;
  optalteAfstemningsomraader: number;
  optaltProcent: number;
  national: {
    afgivneStemmer: number;
    gyldigeStemmer: number;
    stemmeberettigede: number;
    valgdeltagelse: number;
    partier: PartiResult[];
    udenforParti: Array<{ navn: string; stemmer: number }>;
  };
  perStorkreds: Record<string, any>;
  perKommune: Record<string, KommuneData>;
}

interface PMMarket {
  candidate: string;
  partyKey: string | null;
  probability: number;
  change: number | null;
  url: string;
}

interface PMData {
  markets: PMMarket[];
  secondPlace: Array<{ partyKey: string; probability: number }>;
  thirdPlace: Array<{ partyKey: string; probability: number }>;
  partySeats: Array<{ partyKey: string; ranges: Array<{ label: string; probability: number }> }>;
}

interface Election2022Party {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmePct: number;
  mandater: number;
}

interface Kommune2022Summary {
  kommunekode: string;
  kommune_navn: string;
  storkreds: string;
  winner: string;
  partier: { bogstav: string; navn: string; stemmePct: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLLS_CLOSE = new Date("2026-03-24T20:00:00+01:00");

const PARTIES: Record<string, { name: string; color: string; bloc: "red" | "blue" }> = {
  A: { name: "Socialdemokraterne",           color: "#C8102E", bloc: "red"  },
  F: { name: "SF – Socialistisk Folkeparti", color: "#E4007C", bloc: "red"  },
  V: { name: "Venstre",                      color: "#254B8E", bloc: "blue" },
  I: { name: "Liberal Alliance",             color: "#00B0CA", bloc: "blue" },
  Æ: { name: "Danmarksdemokraterne",         color: "#005F6B", bloc: "blue" },
  C: { name: "Det Konservative Folkeparti",  color: "#00583C", bloc: "blue" },
  Ø: { name: "Enhedslisten",                color: "#991B1E", bloc: "red"  },
  B: { name: "Radikale Venstre",            color: "#733280", bloc: "red"  },
  O: { name: "Dansk Folkeparti",            color: "#E4B828", bloc: "blue" },
  Å: { name: "Alternativet",               color: "#2ECC71", bloc: "red"  },
  M: { name: "Moderaterne",                color: "#8B5CF6", bloc: "blue" },
  H: { name: "Borgernes Parti",            color: "#0084FF", bloc: "blue" },
  D: { name: "Nye Borgerlige",             color: "#FF6B35", bloc: "blue" },
};

const FORECAST: Record<string, number> = {
  A: 21.6, F: 13.5, V: 10.8, I: 10.0, Æ: 8.5,
  M: 5.8,  C: 6.8,  Ø: 6.8,  B: 4.8,  O: 6.9,
  Å: 2.2,  H: 1.8,
};

const RED_BLOC   = ["A", "F", "Ø", "B", "Å"];
const BLUE_BLOC  = ["V", "I", "Æ", "C", "O", "M", "H", "D"];
const FO_GL_SEATS = 4;
const MAJORITY    = 90;
const TOTAL_SEATS = 179;

// Hardcoded North Atlantic — update manually via git commit
const NORDATLANTISK = {
  FO: {
    navn: "Færøerne",
    mandater: 2,
    resultater: [
      { parti: "Javnaðarflokkurin", bogstav: "JF",    stemmer: null as number | null, pct: null as number | null },
      { parti: "Sambandsflokkurin", bogstav: "SF_FO",  stemmer: null as number | null, pct: null as number | null },
    ],
  },
  GL: {
    navn: "Grønland",
    mandater: 2,
    resultater: [
      { parti: "Siumut",              bogstav: "SIU", stemmer: null as number | null, pct: null as number | null },
      { parti: "Inuit Ataqatigiit",   bogstav: "IA",  stemmer: null as number | null, pct: null as number | null },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString("da-DK");
}

function sign(n: number, decimals = 1): string {
  return n > 0 ? `+${n.toFixed(decimals)}` : n.toFixed(decimals);
}

function getBlocSeats(partier: PartiResult[], bloc: "red" | "blue"): number {
  const keys = bloc === "red" ? RED_BLOC : BLUE_BLOC;
  return partier
    .filter((p) => keys.includes(p.bogstav) && p.antalMandater !== null)
    .reduce((sum, p) => sum + (p.antalMandater ?? 0), 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PartyDot({ bogstav }: { bogstav: string }) {
  const color = PARTIES[bogstav]?.color ?? "#888";
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

// STICKY STATUS BAR
function StickyStatusBar({
  data,
  isComplete,
}: {
  data: AggregatedResults;
  isComplete: boolean;
}) {
  const isLive = !isComplete && data.optaltProcent > 0;
  return (
    <div
      className="bg-background/95 backdrop-blur border-b border-border"
      style={{ position: "sticky", top: 0, zIndex: 40 }}
    >
      <div className="max-w-5xl mx-auto px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-1.5">
          {isLive && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 font-semibold text-xs">LIVE</span>
            </span>
          )}
          {isComplete && (
            <span className="bg-primary/10 border border-primary/30 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
              Endeligt resultat
            </span>
          )}
          <span className="text-muted-foreground">
            {data.optalteAfstemningsomraader} af {data.totalAfstemningsomraader} afstemningsområder optalt
          </span>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <span className="text-muted-foreground hidden sm:inline">
            Senest opdateret kl. {formatTime(data.lastUpdated)}
          </span>
          <span className="font-semibold text-foreground ml-auto">
            {data.optaltProcent.toFixed(1)}% optalt
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${Math.min(data.optaltProcent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// BLOC BAROMETER
function BlocBarometer({
  partier,
  isComplete,
}: {
  partier: PartiResult[];
  isComplete: boolean;
}) {
  const [view, setView] = useState<"nu" | "2022">("nu");

  const redSeatsBase  = getBlocSeats(partier, "red");
  const blueSeatsBase = getBlocSeats(partier, "blue");
  const redSeats      = redSeatsBase + FO_GL_SEATS;
  const blueSeats     = blueSeatsBase;
  const totalUsed     = redSeats + blueSeats;
  const redPct        = (redSeats  / TOTAL_SEATS) * 100;
  const bluePct       = (blueSeats / TOTAL_SEATS) * 100;
  const majorityPct   = (MAJORITY / TOTAL_SEATS) * 100;
  const redWins       = redSeats  >= MAJORITY;
  const blueWins      = blueSeats >= MAJORITY;

  // 2022 baselines
  // Rød blok 2022: A(50)+F(15)+Ø(9)+B(7)+Å(6) = 87 + FO/GL(4) = 91
  const RED_SEATS_2022  = RED_BLOC.reduce((s, k) => s + (PARTIES[k]?.seats2022 ?? 0), 0) + FO_GL_SEATS;
  // Blå blok 2022: V(23)+I(14)+Æ(14)+C(10)+O(5)+M(16)+H(0) = 82
  // NOTE: Nye Borgerlige (D) had 6 mandater in 2022 but no longer exists — excluded from baseline
  const BLUE_SEATS_2022 = BLUE_BLOC.reduce((s, k) => s + (PARTIES[k]?.seats2022 ?? 0), 0);

  const redDelta  = redSeats  - RED_SEATS_2022;
  const blueDelta = blueSeats - BLUE_SEATS_2022;

  function deltaLabel(d: number) {
    if (d > 0) return <span className="text-green-400 font-semibold text-sm ml-1">+{d}</span>;
    if (d < 0) return <span className="text-red-400   font-semibold text-sm ml-1">{d}</span>;
    return <span className="text-muted-foreground font-semibold text-sm ml-1">±0</span>;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">Mandatbarometer</CardTitle>
            <p className="text-sm text-muted-foreground">
              {MAJORITY} mandater kræves for flertal · {totalUsed} af {TOTAL_SEATS} tildelt
            </p>
          </div>
          {/* Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border text-xs font-medium">
            <button
              onClick={() => setView("nu")}
              className={`px-3 py-1.5 transition-colors ${view === "nu" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Nu
            </button>
            <button
              onClick={() => setView("2022")}
              className={`px-3 py-1.5 transition-colors ${view === "2022" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Siden valget 2022
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-baseline gap-1">
              <div className="text-4xl font-bold" style={{ color: "#dc2626" }}>
                {redSeats}
              </div>
              {view === "2022" && deltaLabel(redDelta)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Rød blok
              {redWins && <span className="text-green-400 font-semibold ml-1.5">FLERTAL</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              inkl. FO/GL ({FO_GL_SEATS})
            </div>
            {view === "2022" && (
              <div className="text-xs text-muted-foreground mt-0.5">
                2022: {RED_SEATS_2022} mandater
              </div>
            )}
          </div>
          <div className="text-center px-4">
            <div className="text-lg font-semibold text-muted-foreground">{MAJORITY}</div>
            <div className="text-xs text-muted-foreground">flertal</div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1 justify-end">
              {view === "2022" && deltaLabel(blueDelta)}
              <div className="text-4xl font-bold" style={{ color: "#1d4ed8" }}>
                {blueSeats}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Blå blok
              {blueWins && <span className="text-green-400 font-semibold ml-1.5">FLERTAL</span>}
            </div>
            {view === "2022" && (
              <div className="text-xs text-muted-foreground mt-0.5">
                2022: {BLUE_SEATS_2022} mandater
              </div>
            )}
          </div>
        </div>

        {/* Stacked bar */}
        <div className="relative w-full h-12 rounded-lg overflow-hidden flex">
          <div
            className="h-full flex items-center justify-end pr-2 transition-all duration-700"
            style={{ width: `${redPct}%`, backgroundColor: "#dc2626" }}
          >
            {redPct > 10 && <span className="text-white text-sm font-bold">{redSeats}</span>}
          </div>
          <div
            className="h-full flex items-center justify-start pl-2 transition-all duration-700"
            style={{ width: `${bluePct}%`, backgroundColor: "#1d4ed8" }}
          >
            {bluePct > 10 && <span className="text-white text-sm font-bold">{blueSeats}</span>}
          </div>
          {totalUsed < TOTAL_SEATS && (
            <div className="h-full bg-muted/50" style={{ flex: 1 }} />
          )}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
            style={{ left: `${majorityPct}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/70 font-semibold whitespace-nowrap">
              90
            </div>
          </div>
        </div>

        {view === "2022" && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            Blå bloks 2022-baseline ekskluderer Nye Borgerlige (D, 6 mandater) som ikke stiller op i 2026.
          </p>
        )}

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#dc2626" }} />
            Rød blok: {RED_BLOC.join(", ")} + FO/GL (4 faste mandater)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#1d4ed8" }} />
            Blå blok: {BLUE_BLOC.join(", ")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ENHANCED PARTY RESULTS TABLE (live)
function PartyResultsTable({
  partier,
  election2022,
  isComplete,
}: {
  partier: PartiResult[];
  election2022: Election2022Party[];
  isComplete: boolean;
}) {
  const map2022: Record<string, Election2022Party> = {};
  for (const p of election2022) {
    map2022[p.bogstav] = p;
  }

  // Build list: live parties + forecast-only parties
  const liveKeys = new Set(partier.map((p) => p.bogstav));
  const forecastKeys = Object.keys(FORECAST).filter((k) => !liveKeys.has(k));

  const sorted = [...partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent);

  // Forecast-only rows sorted by forecast
  const forecastOnly = forecastKeys.sort((a, b) => (FORECAST[b] ?? 0) - (FORECAST[a] ?? 0));

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Partiresultater</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sorteret efter stemmeprocent · Prognose fra meningsmålingsgennemsnit
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Parti</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">
                  Prognose
                </th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Resultat</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Diff
                </th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Stemmer
                </th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Mandater</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">
                  Ændring vs. 2022
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const party      = PARTIES[p.bogstav];
                const forecast   = FORECAST[p.bogstav] ?? null;
                const p2022      = map2022[p.bogstav];
                const diffForecast = forecast !== null ? p.stemmeProcent - forecast : null;
                const diff2022   = p2022 ? p.stemmeProcent - p2022.stemmePct : null;
                const belowThreshold = p.stemmeProcent > 0 && p.stemmeProcent < 2.0;
                const nearThreshold  = p.stemmeProcent >= 2.0 && p.stemmeProcent < 2.5;

                return (
                  <tr
                    key={p.bogstav}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      i % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <PartyDot bogstav={p.bogstav} />
                        <span className="font-bold text-xs w-5" style={{ color: party?.color ?? "#888" }}>
                          {p.bogstav}
                        </span>
                        <span className="font-medium hidden sm:inline">
                          {p.navn || party?.name || p.bogstav}
                        </span>
                        {belowThreshold && (
                          <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">
                            Under 2%
                          </span>
                        )}
                        {nearThreshold && (
                          <span className="ml-1 text-xs bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 px-1.5 py-0.5 rounded-full">
                            Nær spærregrænse
                          </span>
                        )}
                        {isComplete && (
                          <span className="ml-1 text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full hidden md:inline">
                            Endeligt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground hidden md:table-cell">
                      {forecast !== null ? `~${forecast.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      {p.stemmeProcent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      {diffForecast !== null ? (
                        <span className={diffForecast >= 0 ? "text-green-400" : "text-red-400"}>
                          {sign(diffForecast)} pp
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground hidden lg:table-cell">
                      {formatNumber(p.stemmer)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {p.antalMandater !== null ? p.antalMandater : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right hidden md:table-cell">
                      {diff2022 !== null ? (
                        <span className={diff2022 >= 0 ? "text-green-400" : "text-red-400"}>
                          {sign(diff2022)} pp
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}

              {/* Forecast-only parties (no live data yet) */}
              {forecastOnly.map((bogstav) => {
                const party    = PARTIES[bogstav];
                const forecast = FORECAST[bogstav] ?? 0;
                const p2022    = map2022[bogstav];
                return (
                  <tr
                    key={`forecast-${bogstav}`}
                    className="border-b border-border/30 opacity-50"
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <PartyDot bogstav={bogstav} />
                        <span className="font-bold text-xs w-5" style={{ color: party?.color ?? "#888" }}>
                          {bogstav}
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">
                          {party?.name ?? bogstav}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground hidden md:table-cell">
                      ~{forecast.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground italic text-xs">Ingen data</td>
                    <td className="py-2 px-3 hidden sm:table-cell" />
                    <td className="py-2 px-3 hidden lg:table-cell" />
                    <td className="py-2 px-3 text-right text-muted-foreground">—</td>
                    <td className="py-2 px-3 hidden md:table-cell text-right text-muted-foreground">
                      {p2022 ? `${p2022.stemmePct.toFixed(1)}% i 2022` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// SPÆRREGRÆNSE TRACKER
function SpaerregraenseTracker({ partier }: { partier: PartiResult[] }) {
  const tracked = partier
    .filter((p) => p.stemmeProcent >= 0 && p.stemmeProcent <= 3.5)
    .sort((a, b) => b.stemmeProcent - a.stemmeProcent);

  if (tracked.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Spærregrænse-tracker</CardTitle>
        <p className="text-sm text-muted-foreground">
          Partier mellem 0% og 3,5% — spærregrænsen er 2%
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracked.map((p) => {
          const party        = PARTIES[p.bogstav];
          const above        = p.stemmeProcent >= 2.0;
          const maxScale     = 3.5;
          const barPct       = Math.min((p.stemmeProcent / maxScale) * 100, 100);
          const thresholdPct = (2.0 / maxScale) * 100;

          return (
            <div key={p.bogstav}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <PartyDot bogstav={p.bogstav} />
                  <span className="font-semibold" style={{ color: party?.color ?? "#888" }}>
                    {p.bogstav}
                  </span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">
                    {p.navn || party?.name}
                  </span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${above ? "text-green-400" : "text-red-400"}`}>
                  {p.stemmeProcent.toFixed(2)}%
                  {above ? " ✓" : " ✗"}
                </span>
              </div>
              <div className="relative w-full h-3 bg-muted rounded-full overflow-visible">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: above ? "#22c55e" : "#ef4444",
                  }}
                />
                {/* Threshold line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                  style={{ left: `${thresholdPct}%` }}
                />
              </div>
              <div
                className="text-xs text-muted-foreground mt-0.5"
                style={{ paddingLeft: `${thresholdPct}%` }}
              >
                2%
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// NORTH ATLANTIC MANDATER
function NordatlantiskeMandater() {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Nordatlantiske mandater</CardTitle>
        <p className="text-sm text-muted-foreground">
          4 mandater indgår i mandatopgørelsen · Opdateres manuelt
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(["FO", "GL"] as const).map((key) => {
          const territory = NORDATLANTISK[key];
          const flag = key === "FO" ? "🇫🇴" : "🇬🇱";
          return (
            <div key={key} className="border border-border/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{flag}</span>
                <div>
                  <div className="font-semibold">{territory.navn}</div>
                  <div className="text-xs text-muted-foreground">
                    {territory.mandater} mandater
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground italic">
                Resultater ikke tilgængelige endnu
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// FORECAST TABLE (pre-election state)
function ForecastTable({ election2022 }: { election2022: Election2022Party[] }) {
  const map2022: Record<string, Election2022Party> = {};
  for (const p of election2022) {
    map2022[p.bogstav] = p;
  }

  const keys = Object.keys(FORECAST).sort(
    (a, b) => (FORECAST[b] ?? 0) - (FORECAST[a] ?? 0),
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Meningsmålinger — prognose</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vægtet gennemsnit af seneste meningsmålinger (pr. valgdag)
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Parti</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">Prognose %</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell">
                  2022 %
                </th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground hidden md:table-cell">
                  Ændring
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((bogstav, i) => {
                const pct    = FORECAST[bogstav] ?? 0;
                const party  = PARTIES[bogstav];
                const p2022  = map2022[bogstav];
                const pct2022 = p2022?.stemmePct ?? null;
                const diff   = pct2022 !== null ? pct - pct2022 : null;

                return (
                  <tr
                    key={bogstav}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      i % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <PartyDot bogstav={bogstav} />
                        <span className="font-bold text-xs w-5" style={{ color: party?.color ?? "#888" }}>
                          {bogstav}
                        </span>
                        <span className="font-medium">{party?.name ?? bogstav}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground hidden sm:table-cell">
                      {pct2022 !== null ? `${pct2022.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right hidden md:table-cell">
                      {diff !== null ? (
                        <span className={diff >= 0 ? "text-green-400" : "text-red-400"}>
                          {sign(diff)} pp
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// PREDICTION MARKETS
function PredictionMarkets({
  pmData,
  loading,
}: {
  pmData: PMData | null;
  loading: boolean;
}) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Forudsigelsesmarkeder</CardTitle>
        <p className="text-sm text-muted-foreground">Polymarket (opdateret løbende)</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
            Indlæser markedsdata...
          </div>
        ) : pmData === null ? (
          <p className="text-sm text-muted-foreground py-2">
            Markedsdata er ikke tilgængelig i øjeblikket.
          </p>
        ) : (
          <div className="space-y-6">
            {pmData.markets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Næste statsminister
                </h4>
                <div className="space-y-2.5">
                  {[...pmData.markets]
                    .sort((a, b) => b.probability - a.probability)
                    .map((market) => {
                      const color = market.partyKey
                        ? (PARTIES[market.partyKey]?.color ?? "#888")
                        : "#888";
                      const pct = Math.round(market.probability * 100);
                      return (
                        <div key={market.candidate}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <a
                                href={market.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-foreground"
                              >
                                {market.candidate}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {market.change !== null && (
                                <span
                                  className={`text-xs ${
                                    market.change > 0
                                      ? "text-green-400"
                                      : market.change < 0
                                      ? "text-red-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {market.change > 0 ? "+" : ""}
                                  {(market.change * 100).toFixed(1)} pp
                                </span>
                              )}
                              <span className="font-semibold text-sm w-10 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Klik på et navn for at se på Polymarket
                </p>
              </div>
            )}

            {pmData.partySeats && pmData.partySeats.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Mandatprognoser
                </h4>
                <div className="space-y-2">
                  {pmData.partySeats.map((entry) => {
                    const color   = PARTIES[entry.partyKey]?.color ?? "#888";
                    const topRange = [...entry.ranges].sort(
                      (a, b) => b.probability - a.probability,
                    )[0];
                    if (!topRange) return null;
                    return (
                      <div key={entry.partyKey} className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold w-5" style={{ color }}>
                          {entry.partyKey}
                        </span>
                        <span className="text-muted-foreground flex-1">{topRange.label}</span>
                        <span className="font-semibold">
                          {Math.round(topRange.probability * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// MODEL VS. VIRKELIGHED
function ModelVsVirkelighed({ partier }: { partier: PartiResult[] }) {
  const keys = Object.keys(FORECAST).sort(
    (a, b) => (FORECAST[b] ?? 0) - (FORECAST[a] ?? 0),
  );
  const actualMap: Record<string, number> = {};
  for (const p of partier) {
    actualMap[p.bogstav] = p.stemmeProcent;
  }
  const maxScale = 30;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Model vs. Virkelighed</CardTitle>
        <p className="text-sm text-muted-foreground">
          Meningsmålingsgennemsnit sammenlignet med faktiske resultater
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keys.map((bogstav) => {
            const forecast = FORECAST[bogstav] ?? 0;
            const actual   = actualMap[bogstav] ?? null;
            const party    = PARTIES[bogstav];
            const diff     = actual !== null ? actual - forecast : null;

            return (
              <div key={bogstav}>
                <div className="flex items-center gap-2 mb-1">
                  <PartyDot bogstav={bogstav} />
                  <span
                    className="text-xs font-bold w-5 flex-shrink-0"
                    style={{ color: party?.color ?? "#888" }}
                  >
                    {bogstav}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 hidden sm:block truncate">
                    {party?.name}
                  </span>
                  <div className="flex items-center gap-3 ml-auto text-xs">
                    <span className="text-muted-foreground w-16 text-right">
                      Model: {forecast.toFixed(1)}%
                    </span>
                    {actual !== null ? (
                      <>
                        <span className="font-semibold w-18 text-right">
                          Faktisk: {actual.toFixed(1)}%
                        </span>
                        {diff !== null && (
                          <span
                            className={`w-14 text-right ${
                              diff >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {sign(diff)} pp
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground w-32 text-right">
                        Ingen data endnu
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
                  {/* Forecast bar (light) */}
                  <div
                    className="absolute top-0 bottom-0 left-0 rounded-full opacity-30"
                    style={{
                      width: `${Math.min((forecast / maxScale) * 100, 100)}%`,
                      backgroundColor: party?.color ?? "#888",
                    }}
                  />
                  {/* Actual bar (solid) */}
                  {actual !== null && (
                    <div
                      className="absolute top-1 bottom-1 left-0 rounded-full"
                      style={{
                        width: `${Math.min((actual / maxScale) * 100, 100)}%`,
                        backgroundColor: party?.color ?? "#888",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Lys: Prognose · Mørk: Faktisk resultat
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ValgdagPage() {
  const [results, setResults]               = useState<AggregatedResults | null>(null);
  const [resultsError, setResultsError]     = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);

  const [pmData, setPmData]       = useState<PMData | null>(null);
  const [pmLoading, setPmLoading] = useState(true);

  const [election2022, setElection2022] = useState<Election2022Party[]>([]);
  const [election2022Kommuner, setElection2022Kommuner] = useState<Record<string, Kommune2022Summary>>({});
  const [show2022Map, setShow2022Map] = useState(false);

  // Poll election results every 15 seconds
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      try {
        const res = await fetch("/api/valgresultater", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 404 || res.status === 204) {
            setResults(null);
          } else {
            setResultsError(`Fejl ved indlæsning: ${res.status}`);
          }
        } else {
          const json = await res.json();
          const payload: AggregatedResults | null = json?.data ?? null;
          setResults(payload);
          setResultsError(null);
        }
      } catch {
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setResultsLoading(false);
      }
    }

    fetchResults();
    const interval = setInterval(fetchResults, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Fetch prediction markets once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/prediction-markets")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: PMData) => {
        if (!cancelled) {
          setPmData(data);
          setPmLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPmData(null);
          setPmLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch 2022 national results once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/election-2022")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { national: Election2022Party[]; source: string }) => {
        if (!cancelled) setElection2022(data.national ?? []);
      })
      .catch(() => {
        // silently fail — 2022 data is optional
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch 2022 per-kommune results once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/election-2022-kommuner")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: Record<string, Kommune2022Summary>) => {
        if (!cancelled) setElection2022Kommuner(data);
      })
      .catch(() => {
        // silently fail — falls back to no per-kommune coloring
      });
    return () => { cancelled = true; };
  }, []);

  // ── State derivations ──
  const pollsClosed  = Date.now() >= POLLS_CLOSE.getTime();
  const hasLiveData  = results !== null && results.optalteAfstemningsomraader > 0;
  const isComplete   = results !== null && results.optaltProcent >= 100;
  const showCounting = hasLiveData;
  const partier      = results?.national.partier ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Sticky status bar — shown only when live data is available */}
      {hasLiveData && results && (
        <StickyStatusBar data={results} isComplete={isComplete} />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center flex-wrap gap-3 mb-2">
            <h1 className="text-3xl font-bold">Valgresultater – 24. marts 2026</h1>
            {hasLiveData && !isComplete && (
              <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isComplete && (
              <span className="bg-primary/10 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                Endeligt resultat
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Folketingsvalg · 24. marts 2026</p>
        </div>

        {/* Complete banner */}
        {isComplete && results && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold text-primary mb-0.5">
                Optællingen er afsluttet
              </div>
              <div className="text-sm text-muted-foreground">
                Alle {results.totalAfstemningsomraader} afstemningsområder er optalt. Officielle
                resultater offentliggøres af Indenrigsministeriet.
              </div>
            </div>
          </div>
        )}

        {/* ── PRE-ELECTION / WAITING STATE ── */}
        {!showCounting && (
          <>
            {/* Pre-election forecast table */}
            <ForecastTable election2022={election2022} />

            {/* Map section: 2026 waiting map + optional 2022 comparison */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">Valgkort 2026</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {show2022Map
                        ? "Venstre: 2026 live · Højre: 2022 resultater"
                        : "Opdateres automatisk når stemmeoptællingen begynder"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShow2022Map((v) => !v)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      show2022Map
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {show2022Map ? "Skjul 2022" : "Sammenlign med 2022"}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${show2022Map ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                  <div>
                    {show2022Map && (
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        2026 – Ingen data endnu
                      </p>
                    )}
                    <DenmarkMap
                      perKommune={{}}
                      hasData={false}
                      mode="waiting"
                      results2022Kommuner={election2022Kommuner}
                    />
                  </div>
                  {show2022Map && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        2022 – Resultater
                      </p>
                      <DenmarkMap
                        perKommune={{}}
                        hasData={false}
                        mode="2022"
                        results2022={election2022}
                        results2022Kommuner={election2022Kommuner}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results table (2022 data pre-election) */}
            <ResultsTable results={null} results2022Kommuner={election2022Kommuner} />

            {/* Prediction markets */}
            <PredictionMarkets pmData={pmData} loading={pmLoading} />
          </>
        )}

        {/* ── LIVE COUNTING / COMPLETE STATE ── */}
        {showCounting && results && (
          <>
            {/* 1. Bloc barometer */}
            <BlocBarometer partier={partier} isComplete={isComplete} />

            {/* 2. Enhanced party results table */}
            <PartyResultsTable
              partier={partier}
              election2022={election2022}
              isComplete={isComplete}
            />

            {/* 3. Spærregrænse tracker */}
            <SpaerregraenseTracker partier={partier} />

            {/* 4. North Atlantic mandater */}
            <NordatlantiskeMandater />

            {/* 5. Map */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resultater per kommune</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {results.optaltProcent.toFixed(1)}% optalt · Klik på en kommune for detaljer
                </p>
              </CardHeader>
              <CardContent>
                <DenmarkMap
                  perKommune={results.perKommune}
                  hasData={hasLiveData}
                  mode="live"
                  results2022={election2022}
                  results2022Kommuner={election2022Kommuner}
                />
              </CardContent>
            </Card>

            {/* 6. Drilldown results table */}
            <ResultsTable results={results} results2022Kommuner={election2022Kommuner} />

            {/* 8. Prediction markets */}
            <PredictionMarkets pmData={pmData} loading={pmLoading} />

            {/* 9. Model vs. virkelighed */}
            <ModelVsVirkelighed partier={partier} />

            {/* Valgdeltagelse */}
            {results.national.valgdeltagelse > 0 && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Valgdeltagelse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {results.national.valgdeltagelse.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(results.national.afgivneStemmer)} stemmer afgivet af{" "}
                    {formatNumber(results.national.stemmeberettigede)} stemmeberettigede
                  </p>
                  <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(results.national.valgdeltagelse, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
}
