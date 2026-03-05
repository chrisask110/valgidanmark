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
} from "recharts";
import { PARTIES, PARTY_KEYS, calcWeightedAverage, type Poll } from "@/app/lib/data";
import { useLanguage } from "@/app/components/LanguageContext";

// Normal CDF via Abramowitz & Stegun approximation
function normalCDF(z: number): number {
  if (z > 6) return 1;
  if (z < -6) return 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// Polling standard deviation (systemic uncertainty + sampling)
const SIGMA = 1.0;

// Parties shown in tracker: those in a borderline zone
const BORDERLINE_MAX = 5.5;
const BORDERLINE_MIN = 0.1;

function statusLabel(avg: number, t: (k: string) => string) {
  if (avg >= 3) return { label: t("threshold.safe"), color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.30)" };
  if (avg >= 1.5) return { label: t("threshold.borderline"), color: "#facc15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.30)" };
  return { label: t("threshold.danger"), color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" };
}

interface PartyStatus {
  pk: string;
  avg: number;
  avgMonthAgo: number;
  trend: number;
  prob: number;
}

export default function SpaerregrænsenPage() {
  const { t, lang } = useLanguage();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then((data: Poll[]) => { setPolls(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const oneMonthAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Compute status for each party
  const partyStatuses = useMemo((): PartyStatus[] => {
    if (polls.length === 0) return [];
    return PARTY_KEYS
      .map(pk => {
        const avg = calcWeightedAverage(polls, pk, today) ?? 0;
        const avgMonthAgo = calcWeightedAverage(polls, pk, oneMonthAgo) ?? avg;
        const trend = avg - avgMonthAgo;
        const prob = normalCDF((avg - 2) / SIGMA);
        return { pk, avg, avgMonthAgo, trend, prob };
      })
      .filter(s => s.avg >= BORDERLINE_MIN && s.avg <= BORDERLINE_MAX)
      .sort((a, b) => a.avg - b.avg);
  }, [polls, today, oneMonthAgo]);

  // Build weekly chart data for borderline parties
  const chartData = useMemo(() => {
    if (polls.length === 0 || partyStatuses.length === 0) return [];
    const keys = partyStatuses.map(s => s.pk);

    // Get date range: 12 months back to today
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 12);

    // Weekly buckets
    const buckets: { date: string; [key: string]: number | string }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      const bucket: { date: string; [key: string]: number | string } = { date: iso };
      for (const pk of keys) {
        const pollsUpTo = polls.filter(p => p.date <= iso);
        if (pollsUpTo.length > 0) {
          const val = calcWeightedAverage(pollsUpTo, pk, iso);
          if (val !== null) bucket[pk] = Math.round(val * 10) / 10;
        }
      }
      buckets.push(bucket);
      cur.setDate(cur.getDate() + 7);
    }
    return buckets;
  }, [polls, partyStatuses]);

  const fmt = (n: number) => n.toFixed(1).replace(".", lang === "da" ? "," : ".");
  const fmtSign = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
          ← {t("nav.polls")}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans tracking-tight">{t("threshold.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground font-mono">{t("threshold.subtitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground/60 font-mono">{t("threshold.sigma")}</p>
      </div>

      {loading && (
        <div className="text-sm font-mono text-muted-foreground">Henter data…</div>
      )}

      {/* Status cards */}
      {!loading && partyStatuses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {partyStatuses.map(({ pk, avg, trend, prob }) => {
            const party = PARTIES[pk];
            const { label, color, bg, border } = statusLabel(avg, t);
            const dist = avg - 2;
            return (
              <div
                key={pk}
                className="rounded-xl p-5"
                style={{ background: bg, border: `1.5px solid ${border}` }}
              >
                {/* Party header */}
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

                {/* Big number */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black font-mono leading-none" style={{ color }}>
                    {fmt(avg)}%
                  </span>
                  <span
                    className="text-sm font-mono ml-2"
                    style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}
                  >
                    {fmtSign(trend)}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-4">{t("threshold.current")}</p>

                {/* Stats row */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.dist")}</span>
                    <span style={{ color: dist >= 0 ? "#4ade80" : "#f87171" }}>
                      {fmtSign(dist)} pp
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.trend")}</span>
                    <span style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}>
                      {fmtSign(trend)} pp
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.prob")}</span>
                    <span style={{ color }}>{Math.round(prob * 100)}%</span>
                  </div>
                </div>

                {/* Probability bar */}
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${prob * 100}%`,
                      background: `linear-gradient(90deg, ${color}88, ${color})`,
                    }}
                  />
                  {/* 50% marker */}
                  <div className="absolute top-0 bottom-0 w-px bg-foreground/30" style={{ left: "50%" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Focused chart */}
      {!loading && chartData.length > 0 && partyStatuses.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-mono font-semibold mb-4 text-muted-foreground uppercase tracking-widest">
            {t("threshold.chart")}
          </h2>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return d.toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { month: "short", day: "numeric" });
                }}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                domain={[0, Math.max(6, ...partyStatuses.map(s => Math.ceil(s.avg + 1)))]}
                tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains-mono)", fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `${v}%`}
                width={36}
              />
              {/* Bold 2% threshold line */}
              <ReferenceLine
                y={2}
                stroke="#facc15"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{
                  value: t("threshold.line"),
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#facc15",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              />
              {partyStatuses.map(({ pk }) => (
                <Line
                  key={pk}
                  type="monotone"
                  dataKey={pk}
                  stroke={PARTIES[pk].color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  name={PARTIES[pk].name}
                />
              ))}
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
                labelFormatter={(label: string) =>
                  new Date(label).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                }
                formatter={(value: number, name: string) => [
                  `${fmt(value)}%`,
                  PARTIES[name]?.name ?? name,
                ]}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {partyStatuses.map(({ pk }) => (
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
