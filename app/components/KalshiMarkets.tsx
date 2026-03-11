"use client";

import { useEffect, useState } from "react";
import { PARTIES } from "@/app/lib/data";
import type { KalshiData, KalshiEntry } from "@/app/api/kalshi/route";

const KALSHI_LOGO_URL = "https://pbs.twimg.com/profile_images/1674127064836648961/xbABMCBq_400x400.jpg";

function getColor(partyKey: string | null, fallback = "#64748b"): string {
  if (partyKey && PARTIES[partyKey]) return PARTIES[partyKey].color;
  return fallback;
}

function PartyAvatar({
  partyKey,
  label,
  size,
  color,
}: {
  partyKey: string | null;
  label: string;
  size: number;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = label.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/Leaders/${partyKey}.jpg`}
        alt={label}
        className="w-full h-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// Ranked list — used for secondPlace / thirdPlace
function RankedList({ entries, url }: { entries: KalshiEntry[]; url: string }) {
  if (entries.length === 0) return <EmptyState />;

  const [top, ...rest] = entries;
  const color = getColor(top.partyKey);
  const pct = Math.round(top.probability * 100);

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Hero row */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg p-3 group transition-colors"
        style={{ background: `${color}10`, border: `1px solid ${color}30` }}
      >
        <PartyAvatar partyKey={top.partyKey} label={top.label} size={48} color={color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-semibold font-mono truncate group-hover:underline">
              {top.label}
            </span>
            <span className="text-xl font-black font-mono tabular-nums" style={{ color }}>
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
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
            />
          </div>
        </div>
      </a>

      {/* Compact rows */}
      <div className="space-y-2">
        {rest.slice(0, 5).map((m, i) => {
          const c = getColor(m.partyKey);
          const p = Math.round(m.probability * 100);
          return (
            <a
              key={m.label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 group"
            >
              <span className="text-[10px] font-mono text-muted-foreground/60 w-3 flex-shrink-0 text-right">
                {i + 2}
              </span>
              <PartyAvatar partyKey={m.partyKey} label={m.label} size={28} color={c} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-mono truncate text-foreground group-hover:underline">
                    {m.label}
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums" style={{ color: c }}>
                    {p}%
                  </span>
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

// Horizontal bar chart — used for gainSeats
function GainSeatsChart({ entries, url }: { entries: KalshiEntry[]; url: string }) {
  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="space-y-2.5">
      {entries.map((m) => {
        const color = getColor(m.partyKey, "#64748b");
        const pct = Math.round(m.probability * 100);
        const partyShort = m.partyKey ? PARTIES[m.partyKey]?.short : null;

        return (
          <a
            key={m.label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 group"
          >
            <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
              <PartyAvatar partyKey={m.partyKey} label={m.label} size={22} color={color} />
              <span className="text-xs font-mono truncate text-foreground group-hover:underline">
                {partyShort ?? m.label}
              </span>
            </div>
            <div className="flex-1 h-5 rounded bg-muted/60 overflow-hidden relative">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${pct}%`, background: `${color}cc` }}
              />
            </div>
            <span
              className="text-xs font-bold font-mono tabular-nums w-9 text-right flex-shrink-0"
              style={{ color }}
            >
              {pct}%
            </span>
          </a>
        );
      })}
    </div>
  );
}

// Distribution histogram — used for socdemSeats
function SeatDistribution({ entries, url }: { entries: KalshiEntry[]; url: string }) {
  if (entries.length === 0) return <EmptyState />;

  const maxProb = Math.max(...entries.map((e) => e.probability));

  return (
    <div className="space-y-1.5">
      {entries.map((m) => {
        const pct = Math.round(m.probability * 100);
        const barWidth = maxProb > 0 ? (m.probability / maxProb) * 100 : 0;
        const color = "#C8102E"; // Socialdemokraterne red

        return (
          <a
            key={m.label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-xs font-mono text-muted-foreground w-20 flex-shrink-0 text-right group-hover:text-foreground transition-colors">
              {m.label}
            </span>
            <div className="flex-1 h-4 rounded bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${barWidth}%`, background: `${color}bb` }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums w-8 text-right flex-shrink-0 font-semibold" style={{ color }}>
              {pct}%
            </span>
          </a>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center py-8">
      <p className="text-sm font-mono text-muted-foreground">Data ikke tilgængelig</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center py-8">
      <p className="text-sm font-mono text-muted-foreground">Henter markedsdata…</p>
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  url,
}: {
  title: string;
  subtitle: string;
  url: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            {title}
          </h2>
          <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer" title="Kalshi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={KALSHI_LOGO_URL}
              alt="Kalshi"
              width={18}
              height={18}
              className="rounded-sm opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
        </div>
        <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">{subtitle}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        Se på Kalshi →
      </a>
    </div>
  );
}

function CardFooter() {
  return (
    <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
      <span className="text-[10px] font-mono text-muted-foreground/60">Kilde: Kalshi</span>
      <span className="text-[10px] font-mono text-muted-foreground/60">Implicit sandsynlighed</span>
    </div>
  );
}

export function KalshiMarkets() {
  const [data, setData] = useState<KalshiData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/kalshi")
      .then((r) => r.json())
      .then((d: KalshiData) => setData(d))
      .catch(() => setError(true));
  }, []);

  const gainUrl    = `https://kalshi.com/markets/kxdenmarkgain/denmark-general-election-which-parties-will-gain-seats/kxdenmarkgain-26mar24`;
  const secondUrl  = `https://kalshi.com/markets/kxdenmark2nd/denmark-general-election-second-place/kxdenmark2nd-26mar24-2`;
  const thirdUrl   = `https://kalshi.com/markets/kxdenmark3rd/denmark-general-election-third-place/kxdenmark3rd-26mar24-3`;
  const socdemUrl  = `https://kalshi.com/markets/kxsocdemseats/denmark-general-election-social-democrats-number-of-seats/kxsocdemseats-26mar24`;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-mono text-muted-foreground">Kalshi-data ikke tilgængelig</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Which parties will gain seats */}
      <div className="rounded-xl border border-border bg-card p-4">
        <CardHeader
          title="Hvilke partier vinder mandater?"
          subtitle="Prediction market — Kalshi"
          url={gainUrl}
        />
        {!data ? <LoadingState /> : <GainSeatsChart entries={data.gainSeats} url={gainUrl} />}
        <CardFooter />
      </div>

      {/* Second place */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col">
        <CardHeader
          title="Andenplads"
          subtitle="Hvilket parti får flest stemmer efter Socialdemokraterne?"
          url={secondUrl}
        />
        {!data ? <LoadingState /> : <RankedList entries={data.secondPlace} url={secondUrl} />}
        <CardFooter />
      </div>

      {/* Third place */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col">
        <CardHeader
          title="Tredjeplads"
          subtitle="Hvilket parti får tredje flest stemmer?"
          url={thirdUrl}
        />
        {!data ? <LoadingState /> : <RankedList entries={data.thirdPlace} url={thirdUrl} />}
        <CardFooter />
      </div>

      {/* Social Democrats seat count */}
      <div className="rounded-xl border border-border bg-card p-4">
        <CardHeader
          title="Socialdemokraternes mandattal"
          subtitle="Antal mandater ved Folketingsvalget 24. marts 2026"
          url={socdemUrl}
        />
        {!data ? <LoadingState /> : <SeatDistribution entries={data.socdemSeats} url={socdemUrl} />}
        <CardFooter />
      </div>
    </div>
  );
}
