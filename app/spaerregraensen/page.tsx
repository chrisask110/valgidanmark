"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ComposedChart, Line, Area, Scatter,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { PARTIES, PARTY_KEYS, POLLSTERS, FALLBACK_POLLS, calcWeightedAverage, type Poll } from "@/app/lib/data";
import { useLanguage } from "@/app/components/LanguageContext";

// ─── Normal CDF ──────────────────────────────────────────────────────────────
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
const THRESHOLD_MAX = 4.0;
const THRESHOLD_MIN = 0.1;

// Fixed chart window: start of Sep 2025 → election day (aligns with monthly tick labels)
const FROM_DATE = new Date("2025-09-01");
const TO_DATE   = new Date("2026-03-24");
const ELECTION_TS = TO_DATE.getTime();

// ─── Date helpers ─────────────────────────────────────────────────────────────
const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtDay(ts: number)       { const d = new Date(ts); return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]}`; }
function fmtMonthYear(ts: number) { const d = new Date(ts); return `${DA_MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`; }
function fmtFull(ts: number)      { const d = new Date(ts); return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function dayBuckets(from: Date, to: Date): number[] {
  const out: number[] = [];
  const cur = new Date(from); cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= to.getTime()) { out.push(cur.getTime()); cur.setDate(cur.getDate() + 1); }
  return out;
}
function monthlyTicks(from: Date, to: Date): number[] {
  const out: number[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cur.getTime() <= to.getTime()) { out.push(cur.getTime()); cur.setMonth(cur.getMonth() + 1); }
  return out;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ThresholdTooltip({ active, payload, label, polls, trackedKeys }: {
  active?: boolean; payload?: any[]; label?: number; polls: Poll[]; trackedKeys: string[];
}) {
  if (!active || label == null) return null;
  const ts = label as number;
  const hoverDate = new Date(ts).toISOString().slice(0, 10);
  const pollsOnDay = polls.filter(p => p.date === hoverDate);

  const avgVals = (payload ?? [])
    .filter(e => String(e.dataKey).endsWith("_avg") && e.value != null)
    .map(e => ({ pk: String(e.dataKey).replace("_avg", ""), avg: e.value as number }))
    .sort((a, b) => b.avg - a.avg);

  if (!pollsOnDay.length && !avgVals.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs font-mono min-w-[180px]">
      {pollsOnDay.length > 0 ? (
        pollsOnDay.map((poll, idx) => (
          <div key={`${poll.pollster}-${idx}`}>
            {idx > 0 && <div className="border-t border-border my-2" />}
            <div className="text-muted-foreground mb-2">
              {fmtFull(new Date(poll.date).getTime())} · {poll.pollster} · n={poll.n}
            </div>
            {trackedKeys
              .filter(pk => poll[pk] != null)
              .sort((a, b) => Number(poll[b]) - Number(poll[a]))
              .map(pk => {
                const val = Number(poll[pk]);
                const prev = polls
                  .filter(p => p.pollster === poll.pollster && p.date < poll.date && p[pk] != null)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const delta = prev != null ? val - Number(prev[pk]) : null;
                return (
                  <div key={pk} className="flex justify-between items-center gap-4 py-0.5">
                    <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                      {PARTIES[pk]?.short} {PARTIES[pk]?.name.split(" ")[0]}
                    </span>
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <span className="text-foreground">{val.toFixed(1)}%</span>
                      {delta != null && (
                        <span style={{ color: delta > 0.05 ? "#22c55e" : delta < -0.05 ? "#ef4444" : "#64748b", fontSize: 10 }}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        ))
      ) : (
        <>
          <div className="text-muted-foreground mb-2">{fmtFull(ts)}</div>
          <div className="text-muted-foreground text-[10px] mb-1">Vægtet gns.</div>
          {avgVals.map(({ pk, avg }) => (
            <div key={pk} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                {PARTIES[pk]?.short} {PARTIES[pk]?.name.split(" ")[0]}
              </span>
              <span className="text-foreground tabular-nums">{avg.toFixed(1)}%</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Status card helpers ──────────────────────────────────────────────────────
function statusLabel(avg: number, tl: (k: string) => string) {
  if (avg >= 3)   return { label: tl("threshold.safe"),       color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.30)"  };
  if (avg >= 1.5) return { label: tl("threshold.borderline"), color: "#facc15", bg: "rgba(250,204,21,0.10)",  border: "rgba(250,204,21,0.30)"  };
  return           { label: tl("threshold.danger"),            color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.30)" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SpaerregrænsenPage() {
  const { t } = useLanguage();
  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [loading, setLoading] = useState(true);
  const [activePollsters, setActivePollsters] = useState<Set<string>>(
    () => new Set(Object.keys(POLLSTERS))
  );

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.polls) && data.polls.length > 0) setPolls(data.polls); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePollster = (name: string) => {
    setActivePollsters(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };

  const filteredPolls = useMemo(
    () => polls.filter(p => activePollsters.has(p.pollster as string)),
    [polls, activePollsters]
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const oneMonthAgo = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }, []);

  // Status cards — always use all polls (unfiltered) for the cards
  const partyStatuses = useMemo(() => {
    if (polls.length === 0) return [];
    const pollsNow = polls.filter(p => p.date <= today);
    const pollsOld = polls.filter(p => p.date <= oneMonthAgo);
    return PARTY_KEYS
      .map(pk => {
        const avg = calcWeightedAverage(pollsNow, pk, today) ?? 0;
        const avgOld = pollsOld.length > 0 ? (calcWeightedAverage(pollsOld, pk, oneMonthAgo) ?? avg) : avg;
        return { pk, avg, trend: avg - avgOld, prob: normalCDF((avg - 2) / SIGMA) };
      })
      .filter(s => s.avg >= THRESHOLD_MIN && s.avg < THRESHOLD_MAX)
      .sort((a, b) => a.avg - b.avg);
  }, [polls, today, oneMonthAgo]);

  const trackedKeys = useMemo(() => partyStatuses.map(s => s.pk), [partyStatuses]);

  // Daily buckets over the fixed window
  const xTicks = useMemo(() => monthlyTicks(FROM_DATE, TO_DATE), []);
  const xDomain = useMemo(() => [FROM_DATE.getTime(), TO_DATE.getTime()], []);

  // Weighted average lines + 95% CI bands — uses filteredPolls
  const chartData = useMemo(() => {
    if (trackedKeys.length === 0) return [];
    const windowMs = 21 * 24 * 60 * 60 * 1000;
    return dayBuckets(FROM_DATE, TO_DATE).map(ts => {
      const asOf = new Date(ts).toISOString().slice(0, 10);
      const pollsUpTo = filteredPolls.filter(p => new Date(p.date).getTime() <= ts);
      const point: { ts: number; [key: string]: number | null } = { ts };
      for (const pk of trackedKeys) {
        const avg = pollsUpTo.length > 0 ? calcWeightedAverage(pollsUpTo, pk, asOf) : null;
        point[`${pk}_avg`] = avg;
        if (avg != null) {
          const nearby = filteredPolls.filter(p => {
            const pt = new Date(p.date).getTime();
            return p[pk] != null && Math.abs(pt - ts) <= windowMs;
          });
          let std = 0.7; // fallback ± pp
          if (nearby.length >= 2) {
            const vals = nearby.map(p => Number(p[pk]));
            const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
            std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
            if (std < 0.3) std = 0.3; // minimum band
          }
          const lo = Math.max(0, avg - 1.96 * std);
          const hi = avg + 1.96 * std;
          point[`${pk}_lo`]   = lo;
          point[`${pk}_band`] = hi - lo; // stacked area trick: lo + band = hi
        } else {
          point[`${pk}_lo`]   = null;
          point[`${pk}_band`] = null;
        }
      }
      return point;
    });
  }, [filteredPolls, trackedKeys]);

  // Raw poll dots — only from active pollsters, within chart window
  const rawDotData = useMemo(() => {
    const result: Record<string, { ts: number; val: number }[]> = {};
    for (const pk of trackedKeys) {
      result[pk] = filteredPolls
        .filter(p => p[pk] != null && new Date(p.date) >= FROM_DATE)
        .map(p => ({ ts: new Date(p.date).getTime(), val: Number(p[pk]) }));
    }
    return result;
  }, [filteredPolls, trackedKeys]);

  // Tooltip uses filteredPolls for correct delta calculation
  const tooltipContent = useMemo(
    () => (props: any) => <ThresholdTooltip {...props} polls={filteredPolls} trackedKeys={trackedKeys} />,
    [filteredPolls, trackedKeys]
  );

  const fmt = (n: number) => n.toFixed(1);
  const fmtSign = (n: number) => (n >= 0 ? "+" : "") + fmt(n);

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
      </div>

      {loading && <div className="text-sm font-mono text-muted-foreground">Henter data…</div>}

      {/* Status cards */}
      {!loading && partyStatuses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {partyStatuses.map(({ pk, avg, trend, prob }) => {
            const party = PARTIES[pk];
            const { label, color, bg, border } = statusLabel(avg, t);
            return (
              <div key={pk} className="rounded-xl p-5" style={{ background: bg, border: `1.5px solid ${border}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black font-mono flex-shrink-0" style={{ background: party.color, color: "#fff" }}>
                    {party.short}
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-sans leading-tight">{party.name}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color }}>{label}</div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black font-mono leading-none" style={{ color }}>{fmt(avg)}%</span>
                  <span className="text-sm font-mono ml-2" style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}>{fmtSign(trend)}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-4">{t("threshold.current")}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{t("threshold.dist")}</span>
                    <span style={{ color: avg - 2 >= 0 ? "#4ade80" : "#f87171" }}>{fmtSign(avg - 2)} pp</span>
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
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${prob * 100}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-widest">
              {t("threshold.chart")}
            </h2>
            {/* Pollster toggles */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(POLLSTERS).map(([name, info]) => (
                <button
                  key={name}
                  onClick={() => togglePollster(name)}
                  className="text-xs font-mono px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: activePollsters.has(name) ? "hsl(var(--accent))" : "hsl(var(--border))",
                    color:       activePollsters.has(name) ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                    background:  activePollsters.has(name) ? "hsl(var(--accent)/0.1)" : "transparent",
                  }}
                >
                  {name} {info.grade}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, bottom: 36, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  ticks={xTicks}
                  tickFormatter={fmtMonthYear}
                  tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  angle={-45}
                  textAnchor="end"
                />

                <YAxis
                  tickFormatter={v => `${v}%`}
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />

                <Tooltip content={tooltipContent} />

                {/* Election day */}
                <ReferenceLine
                  x={ELECTION_TS}
                  stroke="#ef4444"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{ value: "Valg 24. mar", position: "insideTopRight", fontSize: 10, fontFamily: "monospace", fill: "#ef4444" }}
                />

                {/* 2% threshold */}
                <ReferenceLine
                  y={2}
                  stroke="#facc15"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  label={{ value: "2% spærregrænse", position: "insideTopLeft", fontSize: 10, fontFamily: "monospace", fill: "#facc15" }}
                />

                {/* 95% confidence bands (stacked area trick: transparent base + colored band) */}
                {trackedKeys.map(pk => (
                  <Area
                    key={`${pk}_ci_base`}
                    dataKey={`${pk}_lo`}
                    data={chartData}
                    type="monotone"
                    stackId={`${pk}_ci`}
                    fill="transparent"
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
                {trackedKeys.map(pk => (
                  <Area
                    key={`${pk}_ci_band`}
                    dataKey={`${pk}_band`}
                    data={chartData}
                    type="monotone"
                    stackId={`${pk}_ci`}
                    fill={PARTIES[pk].color}
                    fillOpacity={0.12}
                    stroke="none"
                    dot={false}
                    activeDot={false}
                    legendType="none"
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}

                {/* Weighted average lines */}
                {trackedKeys.map(pk => (
                  <Line
                    key={`${pk}_avg`}
                    dataKey={`${pk}_avg`}
                    data={chartData}
                    type="monotone"
                    stroke={PARTIES[pk].color}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: PARTIES[pk].color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    name={PARTIES[pk].short}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}

                {/* Raw poll dots */}
                {trackedKeys.map(pk => (
                  <Scatter
                    key={`${pk}_dots`}
                    name={pk}
                    data={rawDotData[pk]}
                    dataKey="val"
                    legendType="none"
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      if (cx == null || cy == null) return null;
                      return <circle cx={cx} cy={cy} r={1.8} fill={PARTIES[pk].color} fillOpacity={0.85} stroke="hsl(var(--card))" strokeWidth={0.5} />;
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {trackedKeys.map(pk => (
              <div key={pk} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: PARTIES[pk].color }} />
                <span className="text-xs font-mono text-muted-foreground">{PARTIES[pk].short} – {PARTIES[pk].name.split(" ")[0]}</span>
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
