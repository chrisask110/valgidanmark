"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Countdown from "./Countdown";
import { ThemeToggle } from "./components/ThemeToggle";
import { useLanguage } from "./components/LanguageContext";
import { ForecastBanner } from "./components/ForecastBanner";
import { PollingAverages } from "./components/PollingAverages";
import { PollChart } from "./components/PollChart";
import { SeatHemicycle } from "./components/SeatHemicycle";
import { LatestPollsTable } from "./components/LatestPollsTable";
import {
  PARTIES, POLLSTERS, PARTY_KEYS, ROD_BLOK, BLAA_BLOK,
  FALLBACK_POLLS, calcWeightedAverage, calcPartySeats,
} from "./lib/data";
import { runMonteCarlo } from "./lib/monte-carlo";

const DEFAULT_PARTIES = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "M"];

export default function Page() {
  const { t, lang, setLang } = useLanguage();
  const [selectedParties, setSelectedParties] = useState<string[]>(DEFAULT_PARTIES);

  const toggleParty = (pk: string) => {
    setSelectedParties(prev =>
      prev.includes(pk) ? prev.filter(p => p !== pk) : [...prev, pk]
    );
  };

  const polls = FALLBACK_POLLS;

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold font-sans text-lg tracking-tight">
              Valg<span className="text-[hsl(var(--accent))]">i</span>Danmark
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/" className="text-xs font-mono px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80">
                {t("nav.polls")}
              </Link>
              <Link href="/statsminister" className="text-xs font-mono px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80">
                {t("nav.statsminister")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "da" ? "en" : "da")}
              className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            >
              {lang === "da" ? "EN" : "DA"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Countdown */}
      <Countdown />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* Forecast Banner */}
        <section>
          <ForecastBanner
            rodChance={forecast.rodBlokChance}
            blaaChance={forecast.blaaBlokChance}
            rodSeats={forecast.rodMedianSeats}
            blaaSeats={forecast.blaaMedianSeats}
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
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">
              {t("hemi.title")}
            </h2>
            <SeatHemicycle seats={seats} />
          </div>

          {/* Map placeholder */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center min-h-[260px] gap-3">
            <div className="text-5xl opacity-20">🗺</div>
            <p className="font-mono text-sm text-muted-foreground">{t("map.soon")}</p>
            <p className="font-mono text-xs text-muted-foreground/60 text-center max-w-[220px]">{t("map.desc")}</p>
          </div>

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

              <div className="text-xs font-mono text-muted-foreground text-center pt-2 border-t border-border">
                {t("blok.majority")} = 90 {t("blok.seats")} &middot; 179 {t("hemi.total")}
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
            <div>
              {t("footer.updated")}: {latestDate} &middot; {t("footer.source")}: Verian, Epinion, Megafon, Voxmeter
            </div>
            <div>
              {t("footer.method")} &middot; Valg 24. marts 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
