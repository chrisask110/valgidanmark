"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLanguage } from "./LanguageContext";
import { SiteFooter } from "./SiteFooter";
import { POLLSTERS, PARTIES, PARTY_KEYS } from "@/app/lib/data";

const POLLSTER_COLORS: Record<string, string> = {
  "Verian":   "#2563eb",
  "Epinion":  "#f59e0b",
  "Megafon":  "#10b981",
  "Voxmeter": "#8b5cf6",
};

const RANGE = 2.5; // ±2.5 pp axis

// ── Lollipop chart for one pollster ──────────────────────────────────────────
function LollipopChart({ effects }: { effects: Record<string, number> }) {
  const entries = PARTY_KEYS
    .map(pk => ({ pk, val: effects[pk] ?? 0 }))
    .sort((a, b) => b.val - a.val);

  return (
    <div className="space-y-2">
      {entries.map(({ pk, val }) => {
        const party = PARTIES[pk];
        const pct = Math.min(Math.abs(val) / RANGE * 50, 50);
        const isPos = val > 0;
        const dotLeftPct = 50 + (val / RANGE * 50);

        return (
          <div key={pk} className="flex items-center gap-2">
            {/* Party badge */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold font-mono shrink-0"
              style={{ background: party?.color ?? "#888" }}
            >
              {party?.short ?? pk}
            </div>

            {/* Bar zone */}
            <div className="flex-1 relative h-6 flex items-center">
              {/* Zero line */}
              <div className="absolute left-1/2 top-1 bottom-1 w-px bg-border" />
              {/* Stick */}
              <div
                className="absolute h-0.5 rounded-full"
                style={{
                  left: `${isPos ? 50 : dotLeftPct}%`,
                  width: `${pct}%`,
                  background: party?.color ?? "#888",
                  opacity: 0.55,
                }}
              />
              {/* Dot */}
              <div
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${dotLeftPct}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  background: party?.color ?? "#888",
                }}
              />
            </div>

            {/* Value */}
            <span
              className="text-[11px] font-mono tabular-nums w-16 text-right shrink-0"
              style={{ color: isPos ? "#22c55e" : val < 0 ? "#f87171" : "var(--muted-foreground)" }}
            >
              {val >= 0 ? "+" : ""}{val.toFixed(2)} pp
            </span>
          </div>
        );
      })}

      {/* Axis labels */}
      <div className="flex items-center gap-2 mt-2">
        <div className="w-6 shrink-0" />
        <div className="flex-1 flex justify-between text-[9px] font-mono text-muted-foreground px-px">
          <span>−{RANGE} pp</span>
          <span>0</span>
          <span>+{RANGE} pp</span>
        </div>
        <div className="w-16 shrink-0" />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  houseEffects: Record<string, Record<string, number>>;
  weightShares: Record<string, number>;
}

export function InstitutterClient({ houseEffects, weightShares }: Props) {
  const { t, lang } = useLanguage();
  const da = lang === "da";

  const pollsterNames = Object.keys(POLLSTERS);
  const [activeTab, setActiveTab] = useState(pollsterNames[0]);

  const pieData = Object.entries(weightShares)
    .map(([name, value]) => ({ name, value: Math.round(value * 1000) / 10 }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 sm:pb-8 space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold font-sans tracking-tight">
          {da ? "Institutter" : "Pollsters"}
        </h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          {da
            ? "Bedømmelse af de fire danske meningsmålingsinstitutter der indgår i ValgiDanmarks model."
            : "Rating of the four Danish polling houses included in ValgiDanmark's model."}
        </p>
      </div>

      {/* ── House effects (lollipop + tabs) ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold font-mono uppercase tracking-widest text-foreground mb-1">
          {da ? "Systematiske huseffekter" : "Systematic house effects"}
        </p>
        <p className="text-xs font-mono text-muted-foreground mb-4">
          {da
            ? "Procentpoint instituttet systematisk over- (+) eller undervurderer (−) hvert parti ift. konkurrenternes samtidige målinger."
            : "Percentage-point systematic over- (+) or under-estimation (−) vs. concurrent polls from other houses."}
        </p>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {pollsterNames.map(name => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className="text-[11px] font-mono px-3 py-1 rounded-full border transition-colors"
              style={{
                borderColor: activeTab === name ? POLLSTER_COLORS[name] ?? "hsl(var(--accent))" : "hsl(var(--border))",
                background:  activeTab === name ? `${POLLSTER_COLORS[name] ?? "hsl(var(--accent))"}22` : "transparent",
                color:       activeTab === name ? POLLSTER_COLORS[name] ?? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <LollipopChart effects={houseEffects[activeTab] ?? {}} />
      </div>

      {/* ── Weight share pie ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold font-mono uppercase tracking-widest text-foreground mb-1">
          {da ? "Aktuel modelindflydelse" : "Current model influence"}
        </p>
        <p className="text-xs font-mono text-muted-foreground mb-4">
          {da
            ? "Andel af samlet modelindflydelse efter redundansrabat og 40%-loft. Opdateres ved nye målinger."
            : "Share of total model weight after redundancy discount and 40% cap. Updates with new polls."}
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map(entry => (
                <Cell key={entry.name} fill={POLLSTER_COLORS[entry.name] ?? "#888"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v}%`, da ? "Andel" : "Share"]}
              contentStyle={{ fontFamily: "monospace", fontSize: 12 }}
            />
            <Legend
              formatter={(value, entry) => (
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--foreground)" }}>
                  {value} — {(entry as { payload?: { value: number } }).payload?.value}%
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pollster cards ── */}
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
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span>
                {da ? "Basisvægt" : "Base weight"}:{" "}
                <span className="font-semibold text-foreground">{info.weight.toFixed(2)}×</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── About ── */}
      <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-2 text-muted-foreground">
        <p className="font-semibold text-foreground text-xs uppercase tracking-widest">
          {da ? "Om bedømmelsen" : "About the ratings"}
        </p>
        <p>
          {da
            ? "Bedømmelserne er baseret på historisk nøjagtighed ved danske valg siden 2007. Gennemsnitlig afvigelse (MAE) er beregnet som gennemsnit af absolutte afvigelser per parti ved hvert valg. Karakteren afspejler samlet metodisk kvalitet, stikprøvestørrelse og historisk præcision."
            : "Ratings are based on historical accuracy at Danish elections since 2007. Mean absolute error (MAE) is the average of absolute party-level deviations at each election. The grade reflects overall methodological quality, sample size, and historical precision."}
        </p>
        <p>
          {da
            ? "Huseffekter er beregnet som en tidsvægtet gennemsnitlig afvigelse fra de samtidige målinger fra andre institutter inden for de seneste 180 dage. Modellen korrigerer automatisk for disse systematiske skævheder."
            : "House effects are computed as a time-weighted average deviation from concurrent polls by other houses within the past 180 days. The model automatically corrects for these systematic biases."}
        </p>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
