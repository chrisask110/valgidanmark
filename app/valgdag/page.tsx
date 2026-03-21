"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  perStorkreds: Record<string, {
    navn: string;
    nummer: number;
    afgivneStemmer: number;
    gyldigeStemmer: number;
    stemmeberettigede: number;
    optalteAfstemningsomraader: number;
    totalAfstemningsomraader: number;
    partier: Array<{ bogstav: string; navn: string; stemmer: number; stemmeProcent: number }>;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTIES: Record<string, { name: string; color: string; bloc: "red" | "blue"; result2022: number; seats2022: number }> = {
  A: { name: "Socialdemokraterne",             color: "#C8102E", bloc: "red",  result2022: 27.5, seats2022: 50 },
  F: { name: "SF – Socialistisk Folkeparti",   color: "#E4007C", bloc: "red",  result2022: 8.3,  seats2022: 15 },
  V: { name: "Venstre",                        color: "#254B8E", bloc: "blue", result2022: 13.3, seats2022: 23 },
  I: { name: "Liberal Alliance",               color: "#00B0CA", bloc: "blue", result2022: 7.9,  seats2022: 14 },
  Æ: { name: "Danmarksdemokraterne",           color: "#005F6B", bloc: "blue", result2022: 8.1,  seats2022: 14 },
  C: { name: "Det Konservative Folkeparti",    color: "#00583C", bloc: "blue", result2022: 5.5,  seats2022: 10 },
  Ø: { name: "Enhedslisten",                  color: "#991B1E", bloc: "red",  result2022: 5.3,  seats2022: 9  },
  B: { name: "Radikale Venstre",              color: "#733280", bloc: "red",  result2022: 3.7,  seats2022: 7  },
  O: { name: "Dansk Folkeparti",              color: "#E4B828", bloc: "blue", result2022: 2.6,  seats2022: 5  },
  Å: { name: "Alternativet",                  color: "#2ECC71", bloc: "red",  result2022: 3.3,  seats2022: 6  },
  M: { name: "Moderaterne",                   color: "#8B5CF6", bloc: "blue", result2022: 9.3,  seats2022: 16 },
  H: { name: "Borgernes Parti",               color: "#0084FF", bloc: "blue", result2022: 0.0,  seats2022: 0  },
};

// Pre-election polling averages
const FORECAST: Record<string, number> = {
  A: 21.6, F: 13.5, V: 10.8, I: 10.0, Æ: 8.5,
  M: 5.8,  C: 6.8,  Ø: 6.8,  B: 4.8,  O: 6.9,
  Å: 2.2,  H: 1.8,
};

const RED_BLOC  = ["A", "F", "Ø", "B", "Å"];
const BLUE_BLOC = ["V", "I", "Æ", "C", "O", "M", "H"];
const FO_GL_SEATS = 4; // Fixed Færøerne + Grønland seats for rød blok
const MAJORITY = 90;
const TOTAL_SEATS = 179;

const PREDICTION_MARKETS_PM = [
  { label: "Mette Frederiksen (A)",        pct: 45 },
  { label: "Lars Løkke Rasmussen (M)",     pct: 18 },
  { label: "Jakob Ellemann-Jensen (V)",    pct: 12 },
  { label: "Søren Pape Poulsen (C)",       pct: 8  },
  { label: "Andet",                        pct: 17 },
];

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

function sign(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

function getBlocSeats(partier: PartiResult[], bloc: "red" | "blue"): number {
  const keys = bloc === "red" ? RED_BLOC : BLUE_BLOC;
  return partier
    .filter(p => keys.includes(p.bogstav) && p.antalMandater !== null)
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

// STATUS BAR
function StatusBar({ data }: { data: AggregatedResults }) {
  const isLive = data.optaltProcent > 0 && data.optaltProcent < 100;
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-2 text-sm text-muted-foreground">
        {isLive && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 font-medium">Live optælling</span>
          </span>
        )}
        <span>
          {data.optalteAfstemningsomraader} af {data.totalAfstemningsomraader} afstemningsområder optalt
        </span>
        <span>·</span>
        <span>Senest opdateret kl. {formatTime(data.lastUpdated)}</span>
        <span>·</span>
        <span className="font-semibold text-foreground">{data.optaltProcent.toFixed(1)}% optalt</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${Math.min(data.optaltProcent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// BLOC BAROMETER
function BlocBarometer({ partier }: { partier: PartiResult[] }) {
  const redSeats  = getBlocSeats(partier, "red") + FO_GL_SEATS;
  const blueSeats = getBlocSeats(partier, "blue");
  const totalUsed = redSeats + blueSeats;

  // proportional widths relative to TOTAL_SEATS
  const redPct  = (redSeats  / TOTAL_SEATS) * 100;
  const bluePct = (blueSeats / TOTAL_SEATS) * 100;
  const majorityPct = (MAJORITY / TOTAL_SEATS) * 100;

  const redWins  = redSeats  >= MAJORITY;
  const blueWins = blueSeats >= MAJORITY;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Mandatbarometer</CardTitle>
        <p className="text-sm text-muted-foreground">
          {MAJORITY} mandater kræves for flertal · {totalUsed} tildelt
        </p>
      </CardHeader>
      <CardContent>
        {/* Seat numbers */}
        <div className="flex justify-between mb-3">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#dc2626" }}>{redSeats}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Rød blok {redWins && <span className="text-green-400 font-semibold ml-1">FLERTAL</span>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-muted-foreground">{MAJORITY}</div>
            <div className="text-xs text-muted-foreground">flertal</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#1d4ed8" }}>{blueSeats}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Blå blok {blueWins && <span className="text-green-400 font-semibold ml-1">FLERTAL</span>}
            </div>
          </div>
        </div>

        {/* Bar */}
        <div className="relative w-full h-10 rounded-lg overflow-hidden flex">
          <div
            className="h-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${redPct}%`, backgroundColor: "#dc2626" }}
          >
            {redPct > 8 && (
              <span className="text-white text-xs font-bold">{redSeats}</span>
            )}
          </div>
          <div
            className="h-full transition-all duration-700 flex items-center justify-start pl-2"
            style={{ width: `${bluePct}%`, backgroundColor: "#1d4ed8" }}
          >
            {bluePct > 8 && (
              <span className="text-white text-xs font-bold">{blueSeats}</span>
            )}
          </div>
          {/* Remaining (unassigned) */}
          {totalUsed < TOTAL_SEATS && (
            <div
              className="h-full bg-muted"
              style={{ flex: 1 }}
            />
          )}
          {/* 90-seat majority line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
            style={{ left: `${majorityPct}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-white/80 whitespace-nowrap font-semibold">
              90
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#dc2626" }} />
            Rød blok: {RED_BLOC.join(", ")} + FO/GL
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

// PARTY RESULTS TABLE
function PartyResultsTable({ partier }: { partier: PartiResult[] }) {
  const sorted = [...partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Partiresultater</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground w-8"></th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Parti</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">%</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">Stemmer</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">Mandater</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground hidden md:table-cell">Ændring</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const party = PARTIES[p.bogstav];
                const nearThreshold = p.stemmeProcent > 0 && p.stemmeProcent < 2.5;
                return (
                  <tr
                    key={p.bogstav}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <PartyDot bogstav={p.bogstav} />
                        <span className="font-bold text-xs" style={{ color: party?.color ?? "#888" }}>
                          {p.bogstav}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{p.navn || party?.name || p.bogstav}</span>
                      {nearThreshold && (
                        <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">
                          ⚠ Nær spærregrænse
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">
                      {p.stemmeProcent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground hidden sm:table-cell">
                      {formatNumber(p.stemmer)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {p.antalMandater !== null ? p.antalMandater : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right hidden md:table-cell">
                      {p.diffFraForrigeValg !== null ? (
                        <span className={p.diffFraForrigeValg >= 0 ? "text-green-400" : "text-red-400"}>
                          {sign(p.diffFraForrigeValg)} pp
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

// SPÆRREGRÆNSE TRACKER
function SpaerregraenseTracker({ partier }: { partier: PartiResult[] }) {
  const tracked = partier
    .filter(p => p.stemmeProcent >= 0.5 && p.stemmeProcent <= 3.5)
    .sort((a, b) => b.stemmeProcent - a.stemmeProcent);

  if (tracked.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Spærregrænse-tracker</CardTitle>
        <p className="text-sm text-muted-foreground">Partier tæt på 2%-spærregrænsen</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tracked.map(p => {
          const party  = PARTIES[p.bogstav];
          const above  = p.stemmeProcent >= 2.0;
          const barPct = Math.min((p.stemmeProcent / 3.5) * 100, 100);
          const thresholdPct = (2.0 / 3.5) * 100;

          return (
            <div key={p.bogstav}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm">
                  <PartyDot bogstav={p.bogstav} />
                  <span className="font-medium" style={{ color: party?.color ?? "#888" }}>
                    {p.bogstav}
                  </span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">
                    {p.navn || party?.name}
                  </span>
                </div>
                <span className={`text-sm font-bold ${above ? "text-green-400" : "text-red-400"}`}>
                  {p.stemmeProcent.toFixed(2)}%
                </span>
              </div>
              <div className="relative w-full h-3 bg-muted rounded-full overflow-visible">
                {/* Threshold line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-10"
                  style={{ left: `${thresholdPct}%` }}
                />
                {/* Bar */}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: above ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>
              <div
                className="text-xs text-muted-foreground mt-0.5"
                style={{ marginLeft: `${thresholdPct}%` }}
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

// PREDICTION MARKETS
function PredictionMarkets() {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Forudsigelsesmarkeder</CardTitle>
        <p className="text-sm text-muted-foreground">Polymarket & Kalshi (pr. 24. marts 2026)</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Næste statsminister */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Næste statsminister
          </h4>
          <div className="space-y-2">
            {PREDICTION_MARKETS_PM.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.pct}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Blok-vinder */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Blok-vinder
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: "#dc2626" }}>58%</div>
              <div className="text-sm text-muted-foreground mt-1">Rød blok</div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "58%", backgroundColor: "#dc2626" }} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-bold" style={{ color: "#1d4ed8" }}>42%</div>
              <div className="text-sm text-muted-foreground mt-1">Blå blok</div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "42%", backgroundColor: "#1d4ed8" }} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// MODEL VS REALITY
function ModelVsReality({ partier }: { partier: PartiResult[] }) {
  const keys = Object.keys(FORECAST).sort(
    (a, b) => (FORECAST[b] ?? 0) - (FORECAST[a] ?? 0),
  );

  const actualMap: Record<string, number> = {};
  for (const p of partier) {
    actualMap[p.bogstav] = p.stemmeProcent;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Model vs. Virkelighed</CardTitle>
        <p className="text-sm text-muted-foreground">
          Meningsmålinger (gennemsnit) sammenlignet med faktiske resultater
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {keys.map(bogstav => {
            const forecast = FORECAST[bogstav] ?? 0;
            const actual   = actualMap[bogstav] ?? null;
            const party    = PARTIES[bogstav];
            const diff     = actual !== null ? actual - forecast : null;
            const maxPct   = 30;

            return (
              <div key={bogstav}>
                <div className="flex items-center gap-2 mb-1">
                  <PartyDot bogstav={bogstav} />
                  <span className="text-xs font-bold w-5" style={{ color: party?.color ?? "#888" }}>
                    {bogstav}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 hidden sm:inline truncate">
                    {party?.name}
                  </span>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      Model: {forecast.toFixed(1)}%
                    </span>
                    {actual !== null ? (
                      <>
                        <span className="text-xs font-semibold w-16 text-right">
                          Faktisk: {actual.toFixed(1)}%
                        </span>
                        {diff !== null && (
                          <span className={`text-xs w-14 text-right ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {sign(diff)} pp
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground w-32 text-right">Ingen data endnu</span>
                    )}
                  </div>
                </div>
                <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
                  {/* Forecast bar (full opacity) */}
                  <div
                    className="absolute top-0 bottom-0 left-0 rounded-full opacity-30"
                    style={{
                      width: `${Math.min((forecast / maxPct) * 100, 100)}%`,
                      backgroundColor: party?.color ?? "#888",
                    }}
                  />
                  {/* Actual bar (full opacity, narrower) */}
                  {actual !== null && (
                    <div
                      className="absolute top-1 bottom-1 left-0 rounded-full"
                      style={{
                        width: `${Math.min((actual / maxPct) * 100, 100)}%`,
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
          Lys: Model-prognose · Mørk: Faktisk resultat
        </p>
      </CardContent>
    </Card>
  );
}

// WAITING STATE forecast table
function ForecastTable() {
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
                <th className="text-left py-2 px-4 font-medium text-muted-foreground w-8"></th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Parti</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">Prognose %</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell">2022 %</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground hidden md:table-cell">Ændring</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((bogstav, i) => {
                const pct   = FORECAST[bogstav] ?? 0;
                const party = PARTIES[bogstav];
                const diff  = pct - (party?.result2022 ?? 0);
                return (
                  <tr
                    key={bogstav}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <PartyDot bogstav={bogstav} />
                        <span className="font-bold text-xs" style={{ color: party?.color ?? "#888" }}>
                          {bogstav}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{party?.name ?? bogstav}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold">{pct.toFixed(1)}%</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground hidden sm:table-cell">
                      {party?.result2022.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-4 text-right hidden md:table-cell">
                      <span className={diff >= 0 ? "text-green-400" : "text-red-400"}>
                        {sign(diff)} pp
                      </span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ValgdagPage() {
  const [data, setData]       = useState<AggregatedResults | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/valgresultater", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404 || res.status === 204) {
          // No data yet — stay in waiting state
          setData(null);
        } else {
          setError(`Fejl ved indlæsning: ${res.status}`);
        }
      } else {
        const json = await res.json();
        setData(json);
        setError(null);
      }
    } catch (e) {
      // Network error or no data — stay in waiting state silently
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Determine page state
  const isWaiting  = data === null;
  const isCounting = data !== null && data.optaltProcent > 0 && data.optaltProcent < 100;
  const isComplete = data !== null && data.optaltProcent >= 100;

  const partier = data?.national.partier ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Valgnat 2026</h1>
            {isCounting && (
              <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isComplete && (
              <span className="bg-primary/10 border border-primary/30 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                ENDELIGT RESULTAT
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Folketingsvalg · 24. marts 2026
          </p>
        </div>

        {/* ── WAITING STATE ── */}
        {isWaiting && (
          <>
            <Card className="mb-6 border-primary/20 bg-card">
              <CardContent className="py-10 text-center">
                {loading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Forbinder til valgresultater...</p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-4">🗳️</div>
                    <h2 className="text-xl font-semibold mb-2">Venter på valgresultater...</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Optællingen er endnu ikke begyndt. Siden opdateres automatisk hvert 15. sekund,
                      når resultaterne begynder at komme ind.
                    </p>
                    {error && (
                      <p className="text-red-400 text-xs mt-3">{error}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pre-election forecast */}
            <ForecastTable />

            {/* Prediction markets always shown */}
            <PredictionMarkets />
          </>
        )}

        {/* ── COUNTING / COMPLETE STATE ── */}
        {data && (
          <>
            {/* Status bar */}
            <StatusBar data={data} />

            {/* Bloc barometer */}
            <BlocBarometer partier={partier} />

            {/* Two-column layout on larger screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* Party results table */}
                <PartyResultsTable partier={partier} />

                {/* Model vs Reality */}
                <ModelVsReality partier={partier} />
              </div>

              <div className="lg:col-span-1">
                {/* Spærregrænse tracker */}
                <SpaerregraenseTracker partier={partier} />

                {/* Prediction markets */}
                <PredictionMarkets />

                {/* Turnout card */}
                {data.national.valgdeltagelse > 0 && (
                  <Card className="mb-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Valgdeltagelse</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary mb-1">
                        {data.national.valgdeltagelse.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(data.national.afgivneStemmer)} stemmer afgivet af{" "}
                        {formatNumber(data.national.stemmeberettigede)} stemmeberettigede
                      </p>
                      <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(data.national.valgdeltagelse, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Complete state summary */}
            {isComplete && (
              <Card className="mt-4 border-primary/20">
                <CardContent className="py-6 text-center">
                  <div className="text-4xl mb-3">🏁</div>
                  <h2 className="text-xl font-semibold mb-1">Optællingen er afsluttet</h2>
                  <p className="text-muted-foreground text-sm">
                    Alle {data.totalAfstemningsomraader} afstemningsområder er optalt.
                    Officielle resultater offentliggøres af Indenrigsministeriet.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
