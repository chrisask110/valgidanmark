"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "./LanguageContext";

interface ForecastBannerProps {
  rodBlokChance: number;
  blaaBlokChance: number;
  rodMedianSeats: number;
  blaaMedianSeats: number;
}

function BlokCard({
  name,
  chance,
  medianSeats,
  accentColor,
  bgColor,
  borderColor,
  t,
}: {
  name: string;
  chance: number;
  medianSeats: number;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  t: (k: string) => string;
}) {
  const pct = Math.round(chance * 100);
  const seatFill = Math.min(100, (medianSeats / 179) * 100);
  const hasMajority = medianSeats >= 90;

  return (
    <div
      className="rounded-xl p-5 flex-1 min-w-[240px]"
      style={{ background: bgColor, border: `1.5px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {name}
        </span>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{ background: borderColor, color: accentColor }}
        >
          {t("forecast.model")}
        </span>
      </div>

      {/* Big probability number */}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="text-6xl font-black leading-none font-mono"
          style={{ color: accentColor }}
        >
          {pct}%
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("forecast.chance")}</p>

      {/* Seat projection */}
      <div className="mb-2">
        <div className="flex justify-between text-xs font-mono mb-1.5">
          <span className="text-muted-foreground">{t("forecast.projected")}</span>
          <span style={{ color: hasMajority ? accentColor : undefined }}>
            ~{medianSeats} {t("forecast.seats")}
          </span>
        </div>
        {/* Progress bar toward 90 */}
        <div className="h-2 rounded-full bg-muted relative overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${seatFill}%`,
              background: hasMajority
                ? `linear-gradient(90deg, ${accentColor}88, ${accentColor})`
                : `linear-gradient(90deg, ${accentColor}44, ${accentColor}88)`,
            }}
          />
          {/* 90-seat marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
            style={{ left: `${(90 / 179) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs font-mono mt-1 text-muted-foreground">
          <span>0</span>
          <span>↑ 90 {t("forecast.seats")}</span>
          <span>179</span>
        </div>
      </div>
    </div>
  );
}

export function ForecastBanner({
  rodBlokChance,
  blaaBlokChance,
  rodMedianSeats,
  blaaMedianSeats,
}: ForecastBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-4 flex-wrap mb-6">
      <BlokCard
        name={t("forecast.rodblok")}
        chance={rodBlokChance}
        medianSeats={rodMedianSeats}
        accentColor="#f87171"
        bgColor="rgba(248,113,113,0.06)"
        borderColor="rgba(248,113,113,0.25)"
        t={t}
      />
      <BlokCard
        name={t("forecast.blaablok")}
        chance={blaaBlokChance}
        medianSeats={blaaMedianSeats}
        accentColor="#60a5fa"
        bgColor="rgba(96,165,250,0.06)"
        borderColor="rgba(96,165,250,0.25)"
        t={t}
      />
      <div className="rounded-xl p-5 flex-1 min-w-[200px] bg-muted/30 border border-border flex flex-col justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t("forecast.model")}
        </span>
        <div className="space-y-2 text-sm text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            {t("forecast.runs")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            {t("forecast.majority")}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            Opdateret live
          </div>
        </div>
      </div>
    </div>
  );
}
