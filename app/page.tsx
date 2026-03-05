"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "./components/LanguageContext";
import { ForecastBanner } from "./components/ForecastBanner";
import { PollingAverages } from "./components/PollingAverages";
import { PollChart } from "./components/PollChart";
import { HemicycleCard } from "./components/HemicycleCard";
import { LatestPollsTable } from "./components/LatestPollsTable";
import { PredictionMarkets } from "./components/PredictionMarkets";
import {
  PARTIES, POLLSTERS, PARTY_KEYS, ROD_BLOK, BLAA_BLOK, FO_GL_SEATS,
  FALLBACK_POLLS, calcWeightedAverage, calcPartySeats, type Poll,
} from "./lib/data";
import { runMonteCarlo } from "./lib/monte-carlo";

const DEFAULT_PARTIES = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "O", "Å", "M", "H"];

export default function Page() {
  const { t } = useLanguage();
  const [selectedParties, setSelectedParties] = useState<string[]>(DEFAULT_PARTIES);

  const toggleParty = (pk: string) => {
    setSelectedParties(prev =>
      prev.includes(pk) ? prev.filter(p => p !== pk) : [...prev, pk]
    );
  };

  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [pollsReady, setPollsReady] = useState(false);

  // Fetch live polls from DB on mount; fall back silently to FALLBACK_POLLS
  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.polls) && data.polls.length > 0) setPolls(data.polls);
      })
      .catch(() => {})
      .finally(() => setPollsReady(true));
  }, []);

  // Current weighted averages
  const partyPct = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const result: Record<string, number> = {};
    for (const pk of PARTY_KEYS) {
      result[pk] = calcWeightedAverage(polls, pk, today) ?? 0;
    }
    return result;
  }, [polls]);

  // Seat distribution
  const seats = useMemo(() => calcPartySeats(partyPct), [partyPct]);

  // Monte Carlo forecast
  const forecast = useMemo(() => runMonteCarlo(partyPct), [partyPct]);

  // Blok seat totals
  const rodSeats = ROD_BLOK.reduce((s, pk) => s + (seats[pk] || 0), 0);
  const blaaSeats = BLAA_BLOK.reduce((s, pk) => s + (seats[pk] || 0), 0);
  const mSeats = seats["M"] || 0;

  const latestDate = polls[0]?.date ?? "–";

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* Forecast Banner */}
        <section>
          <ForecastBanner
            rodBlokChance={forecast.rodBlokChance}
            blaaBlokChance={forecast.blaaBlokChance}
            rodMedianSeats={forecast.rodMedianSeats}
            blaaMedianSeats={forecast.blaaMedianSeats}
            seats={seats}
            ready={pollsReady}
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
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">
              {t("blok.title")}
            </h2>
            <div className="space-y-5">

              {/* Rød blok */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-mono text-sm font-semibold text-red-400">{t("blok.red")}</span>
                  <span className="font-mono text-sm tabular-nums">{rodSeats} {t("blok.seats")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(rodSeats / 179) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ROD_BLOK.map(pk => (seats[pk] ?? 0) > 0 && (
                    <span key={pk} className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${PARTIES[pk].color}22`, color: PARTIES[pk].color }}>
                      {PARTIES[pk].short} {seats[pk]}
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
                  <span className="font-mono text-sm tabular-nums">{mSeats} {t("blok.seats")}</span>
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
                  <span className="font-mono text-sm tabular-nums">{blaaSeats} {t("blok.seats")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(blaaSeats / 179) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BLAA_BLOK.map(pk => (seats[pk] ?? 0) > 0 && (
                    <span key={pk} className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${PARTIES[pk].color}22`, color: PARTIES[pk].color }}>
                      {PARTIES[pk].short} {seats[pk]}
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

        {/* Pollster Ratings */}
        <section>
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">
            {t("pollster.title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(POLLSTERS).map(([name, info]) => (
              <div key={name} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-semibold font-mono text-sm">{name}</span>
                    <span className="ml-2 text-xs font-mono text-muted-foreground">{info.client}</span>
                  </div>
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: info.grade.startsWith("A") ? "#22c55e" : "#f59e0b" }}
                  >
                    {info.grade}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono leading-relaxed">{info.desc}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono text-muted-foreground">
                  <span>{t("pollster.error")}: ±{info.avgError}%</span>
                  <span>{info.sampleSize}</span>
                  <span>{info.methodology}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Statsminister Banner */}
        <section>
          <Link
            href="/statsminister"
            className="block rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-6 text-center group"
          >
            <div className="text-4xl mb-3">🏛️</div>
            <h2 className="font-semibold font-mono text-lg mb-1">{t("sm.banner.title")}</h2>
            <p className="text-sm font-mono text-muted-foreground mb-3">{t("sm.banner.desc")}</p>
            <span className="inline-flex items-center gap-1 text-sm font-mono text-primary group-hover:underline">
              {t("sm.banner.cta")} →
            </span>
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
            <div>
              {t("footer.updated")}: {latestDate} &middot; {t("footer.source")}: Verian, Epinion, Megafon, Voxmeter
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
              {/* Discord logo */}
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
              {/* GitHub logo */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
