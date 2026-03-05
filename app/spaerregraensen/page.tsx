"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Scatter,
  ComposedChart,
} from "recharts";
import { PARTIES, PARTY_KEYS, POLLSTERS, FALLBACK_POLLS, calcWeightedAverage, type Poll } from "@/app/lib/data";
import { useLanguage } from "@/app/components/LanguageContext";

// Normal CDF via Abramowitz & Stegun approximation
function normalCDF(z: number): number {
  if (z > 6) return 1;
  if (z < -6) return 0;
  const p = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = p * (0.319381530 + p * (-0.356563782 + p * (1.781477937 + p * (-1.821255978 + p * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

const SIGMA = 1.0;
const THRESHOLD_MAX = 4.0; // only show parties strictly below 4%
const THRESHOLD_MIN = 0.1;

const POLLSTER_NAMES = Object.keys(POLLSTERS);
type ViewMode = "model" | string; // "model" or a pollster name

function statusLabel(avg: number, tl: (k: string) => string) {
  if (avg >= 3)   return { label: tl("threshold.safe"),       color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.30)"  };
  if (avg >= 1.5) return { label: tl("threshold.borderline"), color: "#facc15", bg: "rgba(250,204,21,0.10)",  border: "rgba(250,204,21,0.30)"  };
  return           { label: tl("threshold.danger"),            color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" };
}

interface PartyStatus {
  pk: string;
  avg: number;
  trend: number;
  prob: number;
}

export default function SpaerregrænsenPage() {
  const { t, lang } = useLanguage();
  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("model");

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.polls) && data.polls.length > 0) setPolls(data.polls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const oneMonthAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Status cards: only parties with model avg < THRESHOLD_MAX
  const partyStatuses = useMemo((): PartyStatus[] => {
    if (polls.length === 0) return [];
    // Only use polls up to today for the current avg
    const pollsNow = polls.filter(p => p.date <= today);
    // Only use polls from before oneMonthAgo for the historical avg
    const pollsOld = polls.filter(p => p.date <= oneMonthAgo);

    return PARTY_KEYS
      .map(pk => {
        const avg = calcWeightedAverage(pollsNow, pk, today) ?? 0;
        const avgOld = pollsOld.length > 0
          ? (calcWeightedAverage(pollsOld, pk, oneMonthAgo) ?? avg)
          : avg;
        const trend = avg - avgOld;
        const prob = normalCDF((avg - 2) / SIGMA);
        return { pk, avg, trend, prob };
      })
      .filter(s => s.avg >= THRESHOLD_MIN && s.avg < THRESHOLD_MAX)
      .sort((a, b) => a.avg - b.avg);
  }, [polls, today, oneMonthAgo]);

  const trackedKeys = useMemo(() => partyStatuses.map(s => s.pk), [partyStatuses]);

  // Model chart: weekly buckets with weighted avg
  const modelChartData = useMemo(() => {
    if (polls.length === 0 || trackedKeys.length === 0) return [];
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 12);
    const buckets: { date: string; [key: string]: number | string }[] = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      const iso = cur.toISOString().slice(0, 10);
      const pollsUpTo = polls.filter(p => p.date <= iso);
      if (pollsUpTo.length > 0) {
        const bucket: { date: string; [key: string]: number | string } = { date: iso };
        for (const pk of trackedKeys) {
          const val = calcWeightedAverage(pollsUpTo, pk, iso);
          if (val !== null) bucket[pk] = Math.round(val * 10) / 10;
        }
        buckets.push(bucket);
      }
      cur.setDate(cur.getDate() + 7);
    }
    return buckets;
  }, [polls, trackedKeys]);

  // Pollster chart: raw polls from selected pollster, last 12 months
  const pollsterChartData = useMemo(() => {
    if (viewMode === "model" || trackedKeys.length === 0) return [];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return polls
      .filter(p => p.pollster === viewMode && p.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => {
        const point: { date: string; [key: string]: number | string } = { date: p.date };
        for (const pk of trackedKeys) {
          const v = p[pk];
          if (v !== undefined && v !== null && v !== "") point[pk] = Number(v);
        }
        return point;
      });
  }, [polls, viewMode, trackedKeys]);

  const chartData = viewMode === "model" ? modelChartData : pollsterChartData;

  const fmt = (n: number) => n.toFixed(1).replace(".", lang === "da" ? "," : ".");
  const fmtSign = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

  const yMax = Math.max(5, ...partyStatuses.map(s => Math.ceil(s.avg + 1)));

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
          ← {t("nav.polls")}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans tracking-tight">{t("threshold.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">{t("threshold.subtitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground/60 font-mono">{t("threshold.sigma")}</p>
      </div>

      {loading && <div className="text-sm font-mono text-muted-foreground">Henter data…</div>}

      {/* Status cards */}
      {!loading && partyStatuses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {partyStatuses.map(({ pk, avg, trend, prob }) => {
            const party = PARTIES[pk];
            const { label, color, bg, border } = statusLabel(avg, t);
            const dist = avg - 2;
            return (
              <div key={pk} className="rounded-xl p-5" style={{ background: bg, border: `1.5px solid ${border}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black font-mono flex-shrink-0"
                    style={{ background: party.color, color: "#fff" }}
                  >
                    {party.short}
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-sans leading-tight">{party.name}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color }}>{label}</div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black font-mono leading-none" style={{ color }}>
                    {fmt(avg)}%
                  </span>
                  <span className="text-sm font-mono ml-2" style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}>
                    {fmtSign(trend)}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-4">{t("threshold.current")}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.dist")}</span>
                    <span style={{ color: dist >= 0 ? "#4ade80" : "#f87171" }}>{fmtSign(dist)} pp</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.trend")}</span>
                    <span style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}>{fmtSign(trend)} pp</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.prob")}</span>
                    <span style={{ color }}>{Math.round(prob * 100)}%</span>
                  </div>
                </div>

                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${prob * 100}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
                  />
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/30" style={{ left: "50%" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {!loading && partyStatuses.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          {/* Chart header + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-widest">
              {t("threshold.chart")}
            </h2>
            <div className="flex flex-wrap gap-1">
              {(["model", ...POLLSTER_NAMES] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="text-xs font-mono px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    background: viewMode === mode ? "hsl(var(--foreground))" : "hsl(var(--muted))",
                    color:      viewMode === mode ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {mode === "model" ? "Model" : mode}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm font-mono text-muted-foreground">
              Ingen data for {viewMode}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {viewMode === "model" ? (
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { month: "short", day: "numeric" })
                    }
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    domain={[0, yMax]}
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={36}
                  />
                  <ReferenceLine
                    y={2}
                    stroke="#facc15"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: "2%", position: "insideTopLeft", fontSize: 10, fill: "#facc15", fontFamily: "var(--font-jetbrains-mono)" }}
                  />
                  {trackedKeys.map(pk => (
                    <Line key={pk} type="monotone" dataKey={pk} stroke={PARTIES[pk].color} strokeWidth={2} dot={false} connectNulls name={PARTIES[pk].name} />
                  ))}
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    formatter={(value: number, name: string) => [`${fmt(value)}%`, PARTIES[name]?.name ?? name]}
                  />
                </LineChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { month: "short", day: "numeric" })
                    }
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    domain={[0, yMax]}
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={36}
                  />
                  <ReferenceLine
                    y={2}
                    stroke="#facc15"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: "2%", position: "insideTopLeft", fontSize: 10, fill: "#facc15", fontFamily: "var(--font-jetbrains-mono)" }}
                  />
                  {trackedKeys.map(pk => (
                    <Line key={pk} type="monotone" dataKey={pk} stroke={PARTIES[pk].color} strokeWidth={1.5} dot={{ r: 4, fill: PARTIES[pk].color, strokeWidth: 0 }} connectNulls name={PARTIES[pk].name} />
                  ))}
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    formatter={(value: number, name: string) => [`${fmt(value)}%`, PARTIES[name]?.name ?? name]}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {trackedKeys.map(pk => (
              <div key={pk} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: PARTIES[pk].color }} />
                <span className="text-xs font-mono text-muted-foreground">
                  {PARTIES[pk].short} – {PARTIES[pk].name.split(" ")[0]}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: "#facc15" }} />
              <span className="text-xs font-mono" style={{ color: "#facc15" }}>2%</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
