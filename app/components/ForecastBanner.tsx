"use client";

import { PARTIES } from "@/app/lib/data";
import { useLanguage } from "./LanguageContext";

interface ForecastBannerProps {
  rodBlokChance: number;
  blaaBlokChance: number;
  rodMedianSeats: number;
  blaaMedianSeats: number;
  seats: Record<string, number>;
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
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
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

const CURRENT_GOV = ["A", "V", "M"] as const;

export function ForecastBanner({
  rodBlokChance,
  blaaBlokChance,
  rodMedianSeats,
  blaaMedianSeats,
  seats,
}: ForecastBannerProps) {
  const { t } = useLanguage();

  const govTotal = CURRENT_GOV.reduce((s, pk) => s + (seats[pk] || 0), 0);
  const govHasMajority = govTotal >= 90;

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

      {/* 3rd card: Nuværende regering (A + V + M) */}
      <div
        className="rounded-xl p-5 flex-1 min-w-[200px]"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1.5px solid ${govHasMajority ? "rgba(74,222,128,0.35)" : "hsl(var(--border))"}`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
            Nuværende regering
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            A · V · M
          </span>
        </div>

        {/* Party rows */}
        <div className="space-y-1.5 mb-4">
          {CURRENT_GOV.map(pk => (
            <div key={pk} className="flex items-center justify-between text-xs font-mono">
              <span style={{ color: PARTIES[pk].color }} className="font-semibold">
                {PARTIES[pk].short} {PARTIES[pk].name.split(" ")[0]}
              </span>
              <span className="tabular-nums text-foreground">{seats[pk] ?? 0} mand.</span>
            </div>
          ))}
        </div>

        {/* Total bar */}
        <div className="flex justify-between text-xs font-mono mb-1.5">
          <span className="text-muted-foreground">Total</span>
          <span style={{ color: govHasMajority ? "#4ade80" : undefined }}>
            {govTotal} / 90
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted relative overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (govTotal / 179) * 100)}%`,
              background: govHasMajority
                ? "linear-gradient(90deg,#22c55e,#4ade80)"
                : `linear-gradient(90deg, ${PARTIES.A.color}, ${PARTIES.V.color}, ${PARTIES.M.color})`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
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
