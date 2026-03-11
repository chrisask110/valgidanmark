"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import type { KalshiData, KalshiEntry } from "@/app/api/kalshi/route";

const KALSHI_LOGO_URL = "/Kalshi.png";

// Maps Kalshi seat-threshold ticker suffixes to short labels
const SEAT_BUCKET_LABELS: Record<string, string> = {
  "A34": ">34",
  "A37": ">37",
  "A40": ">40",
  "A43": ">43",
  "A46": ">46",
  "A49": ">49",
};

// Numeric seat thresholds for positioning current projection
const SEAT_THRESHOLDS: Record<string, number> = {
  "A34": 34, "A37": 37, "A40": 40, "A43": 43, "A46": 46, "A49": 49,
};

function getColor(partyKey: string | null, fallback = "#64748b"): string {
  if (partyKey && PARTIES[partyKey]) return PARTIES[partyKey].color;
  return fallback;
}

function PartyBadge({ partyKey, size, color }: { partyKey: string | null; size: number; color: string }) {
  const letter = partyKey ?? "?";
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-mono font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}

function KalshiHeader({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{title}</h2>
          <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" title="Kalshi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KALSHI_LOGO_URL} alt="Kalshi" width={16} height={16} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity" />
          </a>
        </div>
        <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">{subtitle}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
        Se på Kalshi →
      </a>
    </div>
  );
}

function CardFooter({ url }: { url: string }) {
  return (
    <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between">
      <span className="text-[10px] font-mono text-muted-foreground/60">Kilde: Kalshi</span>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[10px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors">
        Implicit sandsynlighed
      </a>
    </div>
  );
}

// ─── GAIN SEATS: party card grid ────────────────────────────────────────────
function GainSeatsGrid({
  entries,
  url,
  currentSeats,
}: {
  entries: KalshiEntry[];
  url: string;
  currentSeats: Record<string, number>;
}) {
  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {entries.map((m) => {
        const color = getColor(m.partyKey);
        const pct = Math.round(m.probability * 100);
        const partyName = m.partyKey ? PARTIES[m.partyKey]?.name ?? m.label : m.label;
        const seats2022 = m.partyKey ? (PARTIES[m.partyKey]?.seats2022 ?? null) : null;
        const seatsNow  = m.partyKey ? (currentSeats[m.partyKey] ?? null) : null;
        const diff      = seats2022 != null && seatsNow != null ? seatsNow - seats2022 : null;
        const gaining   = diff != null && diff > 0;
        const losing    = diff != null && diff < 0;

        return (
          <a
            key={m.label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-opacity-50 transition-all group"
            style={{ borderColor: `${color}40` }}
          >
            {/* Top: badge + name */}
            <div className="flex items-center gap-2">
              <PartyBadge partyKey={m.partyKey} size={32} color={color} />
              <span className="text-xs font-mono font-semibold truncate group-hover:underline">{partyName}</span>
            </div>

            {/* Probability */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[10px] font-mono text-muted-foreground">Vinder mandater</span>
                <span className="text-2xl font-black font-mono tabular-nums" style={{ color }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>

            {/* Seat context */}
            {seats2022 != null && seatsNow != null && (
              <div className="flex items-center justify-between text-[10px] font-mono border-t border-border pt-2">
                <span className="text-muted-foreground">2022: {seats2022} m.</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Model: ~{seatsNow} m.</span>
                  {gaining && <span className="text-green-500 font-semibold">▲{diff}</span>}
                  {losing  && <span className="text-red-500 font-semibold">▼{Math.abs(diff!)}</span>}
                  {!gaining && !losing && <span className="text-muted-foreground">—</span>}
                </span>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

// ─── RANKED LIST: 2nd / 3rd place ───────────────────────────────────────────
function RankedList({ entries, url }: { entries: KalshiEntry[]; url: string }) {
  if (entries.length === 0) return <EmptyState />;
  const [top, ...rest] = entries;
  const color = getColor(top.partyKey);
  const pct   = Math.round(top.probability * 100);

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Hero */}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl p-4 group transition-colors"
        style={{ background: `${color}12`, border: `1px solid ${color}35` }}>
        <PartyBadge partyKey={top.partyKey} size={52} color={color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-bold font-mono truncate group-hover:underline">
              {top.partyKey ? PARTIES[top.partyKey]?.name ?? top.label : top.label}
            </span>
            <span className="text-2xl font-black font-mono tabular-nums" style={{ color }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/60 overflow-hidden mt-2">
            <div className="h-full rounded-full"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
          </div>
        </div>
      </a>

      {/* Compact rows */}
      <div className="space-y-2">
        {rest.slice(0, 4).map((m, i) => {
          const c = getColor(m.partyKey);
          const p = Math.round(m.probability * 100);
          return (
            <a key={m.label} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 group px-1">
              <span className="text-[10px] font-mono text-muted-foreground/50 w-4 text-right flex-shrink-0">{i + 2}</span>
              <PartyBadge partyKey={m.partyKey} size={28} color={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-mono truncate group-hover:underline">
                    {m.partyKey ? PARTIES[m.partyKey]?.name ?? m.label : m.label}
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums" style={{ color: c }}>{p}%</span>
                </div>
                <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: `${c}99` }} />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── SOCDEM SEATS: distribution with current projection marker ───────────────
function SeatDistribution({
  entries,
  url,
  currentSocdemSeats,
}: {
  entries: KalshiEntry[];
  url: string;
  currentSocdemSeats: number;
}) {
  if (entries.length === 0) return <EmptyState />;
  const color     = "#C8102E";
  const maxProb   = Math.max(...entries.map((e) => e.probability));

  return (
    <div>
      {/* Context bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-mono text-muted-foreground">
          ValgiDanmarks model: <span className="font-bold text-foreground">~{currentSocdemSeats} mandater</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60">2022: 50 mandater</span>
      </div>

      <div className="space-y-2">
        {entries.map((m) => {
          const pct      = Math.round(m.probability * 100);
          const barWidth = maxProb > 0 ? (m.probability / maxProb) * 100 : 0;
          const threshold = SEAT_THRESHOLDS[m.label] ?? null;
          // Highlight if the current projection is closest to this threshold
          const isClosest = threshold != null &&
            entries.reduce<{ label: string; diff: number }>((best, e) => {
              const t = SEAT_THRESHOLDS[e.label] ?? 0;
              const d = Math.abs(currentSocdemSeats - t);
              return d < best.diff ? { label: e.label, diff: d } : best;
            }, { label: "", diff: Infinity }).label === m.label;

          return (
            <a key={m.label} href={url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 group rounded-lg px-2 py-1 transition-colors ${isClosest ? "bg-muted/40" : ""}`}>
              <div className="w-10 text-right flex-shrink-0">
                <span className={`text-xs font-mono tabular-nums font-bold ${isClosest ? "" : "text-muted-foreground"}`}
                  style={{ color: isClosest ? color : undefined }}>
                  {SEAT_BUCKET_LABELS[m.label] ?? m.label}
                </span>
                {isClosest && (
                  <div className="text-[8px] font-mono text-muted-foreground leading-none">← model</div>
                )}
              </div>
              <div className="flex-1 h-5 rounded bg-muted/60 overflow-hidden relative">
                <div className="h-full rounded transition-all"
                  style={{ width: `${barWidth}%`, background: isClosest ? color : `${color}77` }} />
              </div>
              <span className="text-xs font-mono tabular-nums w-9 text-right flex-shrink-0 font-semibold"
                style={{ color: isClosest ? color : undefined }}>
                {pct}%
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm font-mono text-muted-foreground">Data ikke tilgængelig</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm font-mono text-muted-foreground animate-pulse">Henter markedsdata…</p>
    </div>
  );
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export function KalshiMarkets({ currentSeats }: { currentSeats: Record<string, number> }) {
  const [data, setData]   = useState<KalshiData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/kalshi")
      .then((r) => r.json())
      .then((d: KalshiData) => setData(d))
      .catch(() => setError(true));
  }, []);

  const gainUrl   = "https://kalshi.com/markets/kxdenmarkgain/denmark-general-election-which-parties-will-gain-seats/KXDENMARKGAIN-26MAR24";
  const secondUrl = "https://kalshi.com/markets/kxdenmark2nd/denmark-general-election-second-place/KXDENMARK2ND-26MAR24-2";
  const thirdUrl  = "https://kalshi.com/markets/kxdenmark3rd/denmark-general-election-third-place/KXDENMARK3RD-26MAR24-3";
  const socdemUrl = "https://kalshi.com/markets/kxsocdemseats/denmark-general-election-social-democrats-number-of-seats/KXSOCDEMSEATS-26MAR24";

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-mono text-muted-foreground">Kalshi-data ikke tilgængelig</p>
      </div>
    );
  }

  const currentSocdemSeats = currentSeats["A"] ?? 38;

  return (
    <div className="space-y-6">
      {/* Gain seats — full-width card */}
      <div id="gain" className="rounded-xl border border-border bg-card p-5">
        <KalshiHeader
          title="Hvilke partier vinder mandater?"
          subtitle="Sandsynlighed for at vinde mandater ift. 2022-valget"
          url={gainUrl}
        />
        {!data ? <LoadingState /> : (
          <GainSeatsGrid entries={data.gainSeats} url={gainUrl} currentSeats={currentSeats} />
        )}
        <CardFooter url={gainUrl} />
      </div>

      {/* 2nd + 3rd place side by side */}
      <div id="place" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
          <KalshiHeader
            title="Andenplads"
            subtitle="Flest stemmer efter Socialdemokraterne"
            url={secondUrl}
          />
          {!data ? <LoadingState /> : <RankedList entries={data.secondPlace} url={secondUrl} />}
          <CardFooter url={secondUrl} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
          <KalshiHeader
            title="Tredjeplads"
            subtitle="Tredje flest stemmer ved valget"
            url={thirdUrl}
          />
          {!data ? <LoadingState /> : <RankedList entries={data.thirdPlace} url={thirdUrl} />}
          <CardFooter url={thirdUrl} />
        </div>
      </div>

      {/* Socialdemokraterne seat count */}
      <div id="socdem" className="rounded-xl border border-border bg-card p-5">
        <KalshiHeader
          title="Socialdemokraternes mandattal"
          subtitle="Sandsynlighed for at opnå mindst X mandater den 24. marts"
          url={socdemUrl}
        />
        {!data ? <LoadingState /> : (
          <SeatDistribution
            entries={data.socdemSeats}
            url={socdemUrl}
            currentSocdemSeats={currentSocdemSeats}
          />
        )}
        <CardFooter url={socdemUrl} />
      </div>
    </div>
  );
}
