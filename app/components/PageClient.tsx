"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "./LanguageContext";
import { ForecastBanner } from "./ForecastBanner";
import { PollingAverages } from "./PollingAverages";
import { PollChart } from "./PollChart";
import { HemicycleCard } from "./HemicycleCard";
import { LatestPollsTable } from "./LatestPollsTable";
import { PredictionMarkets } from "./PredictionMarkets";
import {
  PARTIES, ROD_BLOK, BLAA_BLOK, FO_GL_SEATS, ANNOUNCEMENT_DATE, type Poll,
} from "@/app/lib/data";
import type { MonteCarloResult } from "@/app/lib/monte-carlo";

export interface ModelData {
  polls: Poll[];
  partyPct: Record<string, number>;
  seats: Record<string, number>;
  forecast: MonteCarloResult;
  seatsAnnouncement: Record<string, number>;
  seatsWeekAgo: Record<string, number>;
}

const DEFAULT_PARTIES = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "O", "Å", "M", "H"];

type DeltaRef = "2022" | "announcement" | "weekago";
const DELTA_LABELS: Record<DeltaRef, { da: string; en: string }> = {
  "2022":         { da: "Siden valget 2022",    en: "Since 2022 election" },
  "announcement": { da: "Siden valgudskrivelsen", en: "Since announcement" },
  "weekago":      { da: "Seneste uge",           en: "Last week" },
};

export function PageClient({ initialModel }: { initialModel: ModelData }) {
  const { t, lang } = useLanguage();
  const [selectedParties, setSelectedParties] = useState<string[]>(DEFAULT_PARTIES);
  const [deltaRef, setDeltaRef] = useState<DeltaRef>("2022");

  const toggleParty = (pk: string) => {
    setSelectedParties(prev =>
      prev.includes(pk) ? prev.filter(p => p !== pk) : [...prev, pk]
    );
  };

  const { polls, seats, forecast, seatsAnnouncement, seatsWeekAgo } = initialModel;

  const rodSeats  = ROD_BLOK.reduce((s, pk)  => s + (seats[pk] || 0), 0);
  const blaaSeats = BLAA_BLOK.reduce((s, pk) => s + (seats[pk] || 0), 0);
  const mSeats    = seats["M"] || 0;

  // Reference seats for delta display
  const refSeats: Record<string, number> = deltaRef === "2022"
    ? Object.fromEntries(Object.entries(PARTIES).map(([pk, p]) => [pk, p.seats2022]))
    : deltaRef === "announcement"
      ? seatsAnnouncement
      : seatsWeekAgo;

  const seatDelta = (pk: string) => (seats[pk] || 0) - (refSeats[pk] || 0);
  const rodRefSeats  = ROD_BLOK.reduce((s, pk)  => s + (refSeats[pk] || 0), 0);
  const blaaRefSeats = BLAA_BLOK.reduce((s, pk) => s + (refSeats[pk] || 0), 0);
  const mRefSeats    = refSeats["M"] || 0;

  function DeltaBadge({ delta }: { delta: number }) {
    if (delta === 0) return null;
    return (
      <span className={`text-[10px] font-mono tabular-nums ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
        {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
      </span>
    );
  }

  const latestDate = polls[0]?.date ?? "–";

  // "What changed" banner — compare latest poll against previous from same pollster
  const latestPoll = polls[0] ?? null;
  const prevPoll = latestPoll
    ? polls.find(p => p.pollster === latestPoll.pollster && p.date !== latestPoll.date)
      ?? polls.find(p => p.date !== latestPoll.date)
    : null;
  const partyKeys = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "O", "Å", "M", "H"] as const;
  const topMovers: { pk: string; delta: number }[] = [];
  if (latestPoll && prevPoll) {
    for (const pk of partyKeys) {
      const delta = ((latestPoll[pk] as number) ?? 0) - ((prevPoll[pk] as number) ?? 0);
      if (Math.abs(delta) >= 0.1) topMovers.push({ pk, delta });
    }
    topMovers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    topMovers.splice(4);
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* "What changed" banner */}
        {latestPoll && prevPoll && topMovers.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted-foreground">
            <span className="text-foreground/70">
              {latestPoll.pollster} · {latestPoll.date}
            </span>
            <span className="text-border hidden sm:inline">|</span>
            {topMovers.map(({ pk, delta }) => (
              <span
                key={pk}
                style={{ color: PARTIES[pk]?.color }}
                className="tabular-nums"
              >
                {PARTIES[pk]?.short ?? pk}{" "}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>
            ))}
            <span className="text-muted-foreground/50 text-[10px] ml-auto hidden sm:inline">
              vs. {prevPoll.pollster} {prevPoll.date}
            </span>
          </div>
        )}

        {/* Forecast Banner */}
        <section>
          <ForecastBanner
            rodBlokChance={forecast.rodBlokChance}
            blaaBlokChance={forecast.blaaBlokChance}
            rodMedianSeats={forecast.rodMedianSeats}
            blaaMedianSeats={forecast.blaaMedianSeats}
            seats={seats}
            ready={true}
          />
        </section>

        {/* Polling Averages */}
        <section>
          <PollingAverages
            polls={polls}
            selectedParties={selectedParties}
            onToggleParty={toggleParty}
          />
        </section>

        {/* Poll Chart */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
            {t("chart.title")}
          </h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <PollChart
              polls={polls}
              selectedParties={selectedParties}
              onToggleParty={toggleParty}
            />
          </div>
        </section>

        {/* 2×2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Seat Hemicycle */}
          <HemicycleCard polls={polls} />

          {/* Prediction Markets */}
          <PredictionMarkets />

          {/* Latest Polls Table */}
          <div className="rounded-xl border border-border bg-card p-4 overflow-hidden">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">
              {t("table.title")}
            </h2>
            <LatestPollsTable polls={polls} />
          </div>

          {/* Blok summary */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                {t("blok.title")}
              </h2>
              <div className="flex gap-1 flex-wrap">
                {(["2022", "announcement", "weekago"] as DeltaRef[]).map(ref => (
                  <button
                    key={ref}
                    onClick={() => setDeltaRef(ref)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border transition-colors"
                    style={{
                      borderColor: deltaRef === ref ? "hsl(var(--accent))" : "hsl(var(--border))",
                      background:  deltaRef === ref ? "hsl(var(--accent)/0.12)" : "transparent",
                      color:       deltaRef === ref ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {lang === "da" ? DELTA_LABELS[ref].da : DELTA_LABELS[ref].en}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">

              {/* Rød blok */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm font-semibold text-red-400">{t("blok.red")}</span>
                  <span className="font-mono text-sm tabular-nums flex items-center gap-1.5">
                    {rodSeats} {t("blok.seats")}
                    <DeltaBadge delta={rodSeats - rodRefSeats} />
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(rodSeats / 179) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ROD_BLOK.map(pk => (seats[pk] ?? 0) > 0 && (
                    <span key={pk} className="text-xs font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: `${PARTIES[pk].color}22`, color: PARTIES[pk].color }}>
                      {PARTIES[pk].short} {seats[pk]}
                      <DeltaBadge delta={seatDelta(pk)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* M – neutral */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm font-semibold" style={{ color: PARTIES.M.color }}>
                    M – {t("blok.neutral")}
                  </span>
                  <span className="font-mono text-sm tabular-nums flex items-center gap-1.5">
                    {mSeats} {t("blok.seats")}
                    <DeltaBadge delta={mSeats - mRefSeats} />
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(mSeats / 179) * 100}%`, background: PARTIES.M.color }} />
                </div>
              </div>

              {/* Blå blok */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm font-semibold text-blue-400">{t("blok.blue")}</span>
                  <span className="font-mono text-sm tabular-nums flex items-center gap-1.5">
                    {blaaSeats} {t("blok.seats")}
                    <DeltaBadge delta={blaaSeats - blaaRefSeats} />
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(blaaSeats / 179) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BLAA_BLOK.map(pk => (seats[pk] ?? 0) > 0 && (
                    <span key={pk} className="text-xs font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: `${PARTIES[pk].color}22`, color: PARTIES[pk].color }}>
                      {PARTIES[pk].short} {seats[pk]}
                      <DeltaBadge delta={seatDelta(pk)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* FO + GL */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm font-semibold text-muted-foreground">
                    {t("blok.fogl")}
                  </span>
                  <span className="font-mono text-sm tabular-nums">4 {t("blok.seats")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(4 / 179) * 100}%`,
                      background: `linear-gradient(90deg, ${PARTIES.GL.color}, ${PARTIES.FO.color})`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(FO_GL_SEATS).map(([pk, count]) => (
                    <span key={pk} className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${PARTIES[pk].color}22`, color: PARTIES[pk].color }}>
                      {PARTIES[pk].short} {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs font-mono text-muted-foreground text-center pt-2 border-t border-border">
                {t("blok.majority")} = 90 {t("blok.seats")} &middot; 175 DK + 4 FO/GL = 179
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
            <div>
              {t("footer.updated")}: {latestDate} &middot; {t("footer.source")}: Verian, Epinion, Megafon, Voxmeter, Polymarket, Kalshi
            </div>
            <div>
              <Link href="/om-metoden" className="hover:text-foreground transition-colors">
                {t("footer.method")}
              </Link>
              {" "}&middot; Valg 24. marts 2026
            </div>
          </div>
          {/* Community links */}
          <div className="flex items-center justify-center gap-5 pt-2 border-t border-border">
            <a
              href="https://discord.gg/wMUFxyp8"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>
            <a
              href="https://github.com/chrisask110/valgidanmark"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              GitHub
            </a>
            <a
              href="https://x.com/Chris_Bill_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X / Twitter
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
