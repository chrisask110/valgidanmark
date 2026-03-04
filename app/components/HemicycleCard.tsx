"use client";

import { useState, useMemo } from "react";
import {
  PARTIES, POLLSTERS, PARTY_KEYS, FALLBACK_POLLS,
  calcWeightedAverage, calcPartySeats, type Poll,
} from "@/app/lib/data";
import { SeatHemicycle } from "./SeatHemicycle";
import { useLanguage } from "./LanguageContext";

type HemiSource = "model" | "Verian" | "Epinion" | "Megafon" | "Voxmeter";

const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Build source list from POLLSTERS so grades stay in sync with the data file
const SOURCES: [HemiSource, string][] = [
  ["model", "Vægtet model"],
  ...Object.entries(POLLSTERS).map(
    ([name, info]) => [name, `${name} ${info.grade}`] as [HemiSource, string]
  ),
];

const polls: Poll[] = FALLBACK_POLLS;

export function HemicycleCard() {
  const { t } = useLanguage();
  const [source, setSource] = useState<HemiSource>("model");

  const { seats, latestPoll } = useMemo(() => {
    if (source === "model") {
      const today = new Date().toISOString().slice(0, 10);
      const pct = Object.fromEntries(
        PARTY_KEYS.map(pk => [pk, calcWeightedAverage(polls, pk, today) ?? 0])
      );
      return { seats: calcPartySeats(pct), latestPoll: null };
    }

    const latest = [...polls]
      .filter(p => p.pollster === source)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null;

    if (!latest) {
      return { seats: Object.fromEntries(PARTY_KEYS.map(pk => [pk, 0])), latestPoll: null };
    }

    const pct = Object.fromEntries(PARTY_KEYS.map(pk => [pk, Number(latest[pk]) || 0]));
    return { seats: calcPartySeats(pct), latestPoll: latest };
  }, [source]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Title row */}
      <div className="mb-3">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
          {t("hemi.title")}
        </h2>
        {latestPoll && (
          <p className="text-[11px] font-mono text-muted-foreground/70 mt-1">
            Seneste måling: {fmtDate(latestPoll.date as string)} &middot; n={latestPoll.n}
          </p>
        )}
      </div>

      {/* Source selector pills — wrap on small screens */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SOURCES.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSource(id)}
            className="text-xs font-mono px-2.5 py-1 rounded-full border transition-all"
            style={{
              borderColor: source === id ? "hsl(var(--accent))" : "hsl(var(--border))",
              background:  source === id ? "hsl(var(--accent)/0.12)" : "transparent",
              color:       source === id ? "hsl(var(--accent))"     : "hsl(var(--muted-foreground))",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <SeatHemicycle seats={seats} />
    </div>
  );
}
