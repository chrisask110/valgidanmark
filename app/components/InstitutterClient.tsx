"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLanguage } from "./LanguageContext";
import { POLLSTERS, PARTIES, PARTY_KEYS } from "@/app/lib/data";

const POLLSTER_COLORS: Record<string, string> = {
  "Verian":   "#2563eb",
  "Epinion":  "#f59e0b",
  "Megafon":  "#10b981",
  "Voxmeter": "#8b5cf6",
};

// ── House-effects dot chart (one SVG row per pollster) ────────────────────────
const RANGE = 2.5; // ±2.5 pp axis

function HouseEffectsRow({ pollster, effects }: { pollster: string; effects: Record<string, number> }) {
  const W = 500, H = 52, CX = W / 2;
  const scale = (CX - 30) / RANGE; // px per pp

  // Stack dots that would overlap (within 8px) vertically
  const dots = PARTY_KEYS.map(pk => ({
    pk,
    x: CX + (effects[pk] ?? 0) * scale,
    color: PARTIES[pk]?.color ?? "#888",
    val: effects[pk] ?? 0,
  }));
  // Assign y-level to avoid collision
  const placed: { x: number; y: number }[] = [];
  const dotY = dots.map(d => {
    let y = H / 2 - 10;
    const RADIUS = 9;
    for (let attempt = 0; attempt < 6; attempt++) {
      const clash = placed.some(p => Math.abs(p.x - d.x) < RADIUS * 2 && Math.abs(p.y - y) < RADIUS * 2);
      if (!clash) break;
      y += RADIUS * 2;
    }
    placed.push({ x: d.x, y });
    return y;
  });
  const maxY = Math.max(...dotY) + 12;
  const svgH = Math.max(H, maxY + 4);

  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-xs font-semibold text-foreground w-16 shrink-0 pt-2">{pollster}</span>
      <svg
        viewBox={`0 0 ${W} ${svgH}`}
        className="flex-1 overflow-visible"
        style={{ height: svgH * 0.5 + "px" }}
      >
        {/* tick marks */}
        {[-2, -1, 0, 1, 2].map(v => (
          <g key={v}>
            <line
              x1={CX + v * scale} y1={4}
              x2={CX + v * scale} y2={svgH - 12}
              stroke="var(--border)" strokeWidth={v === 0 ? 1.5 : 0.8}
              strokeDasharray={v === 0 ? undefined : "3,3"}
            />
            <text
              x={CX + v * scale} y={svgH - 1}
              textAnchor="middle" fontSize={9}
              fill="currentColor" opacity={0.45}
            >
              {v > 0 ? `+${v}` : v}
            </text>
          </g>
        ))}
        {/* party dots */}
        {dots.map((d, i) => (
          <g key={d.pk}>
            <title>{d.pk}: {d.val >= 0 ? "+" : ""}{d.val.toFixed(2)} pp</title>
            <circle cx={d.x} cy={dotY[i]} r={8} fill={d.color} opacity={0.88} />
            <text
              x={d.x} y={dotY[i] + 3.5}
              textAnchor="middle" fontSize={7}
              fontWeight="700" fill="white"
            >
              {d.pk}
            </text>
          </g>
        ))}
      </svg>
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

  const pieData = Object.entries(weightShares)
    .map(([name, value]) => ({ name, value: Math.round(value * 1000) / 10 }))
    .sort((a, b) => b.value - a.value);

  return (
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

      {/* ── House effects ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold font-mono uppercase tracking-widest text-foreground mb-1">
          {da ? "Systematiske huseffekter" : "Systematic house effects"}
        </p>
        <p className="text-xs font-mono text-muted-foreground mb-1">
          {da
            ? "Procentpoint instituttet systematisk over- (+) eller undervurderer (−) hvert parti ift. konkurrenternes samtidige målinger."
            : "Percentage-point systematic over- (+) or under-estimation (−) vs. concurrent polls from other houses."}
        </p>
        <p className="text-xs font-mono text-muted-foreground mb-5">
          {da ? "Hold musen over en prik for at se værdien." : "Hover a dot to see the value."}
        </p>
        <div className="space-y-3">
          {Object.keys(POLLSTERS).map(pollster => (
            <HouseEffectsRow
              key={pollster}
              pollster={pollster}
              effects={houseEffects[pollster] ?? {}}
            />
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-3">
          {PARTY_KEYS.map(pk => (
            <span key={pk} className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: PARTIES[pk]?.color }}
              />
              {pk}
            </span>
          ))}
        </div>
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
  );
}
