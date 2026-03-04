"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { PARTIES, POLLSTERS, PARTY_KEYS, calcWeightedAverage, type Poll } from "@/app/lib/data";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./LanguageContext";

type TimeRange = "3m" | "6m" | "1y" | "all";

const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtMonthYear(ts: number) {
  const d = new Date(ts);
  return `${DA_MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}
function fmtFull(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()}. ${DA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** One bucket per calendar day */
function dayBuckets(from: Date, to: Date): number[] {
  const buckets: number[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  while (cur <= to) {
    buckets.push(cur.getTime());
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
}

/** One bucket per week (Sunday-aligned) */
function weekBuckets(from: Date, to: Date): number[] {
  const buckets: number[] = [];
  const cur = new Date(from);
  cur.setDate(cur.getDate() - cur.getDay());
  while (cur <= to) {
    buckets.push(cur.getTime());
    cur.setDate(cur.getDate() + 7);
  }
  return buckets;
}

/** One timestamp per calendar month */
function monthTicks(from: Date, to: Date): number[] {
  const ticks: number[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cur <= to) {
    ticks.push(cur.getTime());
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}

interface ChartDataPoint {
  ts: number;
  [key: string]: number | null;
}

interface RawDot {
  ts: number;
  val: number;
  pollster: string;
  n: number;
}

interface PollChartProps {
  polls: Poll[];
  selectedParties: string[];
  onToggleParty: (pk: string) => void;
}

const ELECTION_TS = new Date("2026-03-24").getTime();
const RED = "#ef4444";

/** Custom label for the 2% threshold — rendered inside the SVG plot area */
function ThresholdLabel({ viewBox }: any) {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  return (
    <text
      x={x + width - 6}
      y={y - 5}
      textAnchor="end"
      fontSize={11}
      fontFamily="monospace"
      fill={RED}
    >
      2% spærregrænse
    </text>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: number;
  polls: Poll[];
  selectedParties: string[];
}

/**
 * Tooltip logic:
 *  - Find the nearest poll within ±4 days of the hovered timestamp.
 *  - If found: show exact poll values + Δ vs previous same-pollster poll.
 *  - If not found: show weighted average from the Line payload.
 */
function CustomTooltip({ active, payload, label, polls, selectedParties }: CustomTooltipProps) {
  if (!active || label == null) return null;
  const ts = label as number;

  // Find the poll closest in time within ±4 days
  const WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
  const nearby = polls
    .filter(p => Math.abs(new Date(p.date).getTime() - ts) <= WINDOW_MS)
    .sort((a, b) =>
      Math.abs(new Date(a.date).getTime() - ts) - Math.abs(new Date(b.date).getTime() - ts)
    );
  const poll = nearby[0] ?? null;

  // Weighted-average values from the Line payload (used when no nearby poll)
  const avgVals = (payload ?? [])
    .filter(e => String(e.dataKey).endsWith("_avg") && e.value != null)
    .map(e => ({ pk: String(e.dataKey).replace("_avg", ""), avg: e.value as number }))
    .sort((a, b) => b.avg - a.avg);

  if (!poll && !avgVals.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs font-mono min-w-[220px]">
      {poll ? (
        <>
          {/* Header: date · pollster · n */}
          <div className="text-muted-foreground mb-2 leading-snug">
            {fmtFull(new Date(poll.date).getTime())}
            {" \u00B7 "}{poll.pollster}
            {" \u00B7 n="}{poll.n}
          </div>

          {/* Per-party rows — sorted desc by poll value, only visible selected parties */}
          {selectedParties
            .filter(pk => poll[pk] != null)
            .sort((a, b) => Number(poll[b]) - Number(poll[a]))
            .map(pk => {
              const val = Number(poll[pk]);

              // Delta vs most-recent earlier poll from the same pollster
              const prev = polls
                .filter(p => p.pollster === poll.pollster && p.date < poll.date && p[pk] != null)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              const delta = prev != null ? val - Number(prev[pk]) : null;

              return (
                <div key={pk} className="flex justify-between items-center gap-4 py-0.5">
                  <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                    {PARTIES[pk]?.short} {PARTIES[pk]?.name.split("–")[0].trim()}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <span className="text-foreground">{val.toFixed(1)}%</span>
                    {delta != null && (
                      <span
                        style={{
                          color:
                            delta > 0.05 ? "#22c55e"
                            : delta < -0.05 ? "#ef4444"
                            : "#64748b",
                          fontSize: 10,
                        }}
                      >
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
        </>
      ) : (
        <>
          {/* Fallback: weighted averages when hovering between polls */}
          <div className="text-muted-foreground mb-2">{fmtFull(ts)}</div>
          <div className="text-muted-foreground text-[10px] mb-1">Vægtet gns.</div>
          {avgVals.map(({ pk, avg }) => (
            <div key={pk} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                {PARTIES[pk]?.short} {PARTIES[pk]?.name.split("–")[0].trim()}
              </span>
              <span className="text-foreground tabular-nums">{avg.toFixed(1)}%</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function PollChart({ polls, selectedParties, onToggleParty }: PollChartProps) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [activePollsters, setActivePollsters] = useState<Set<string>>(
    () => new Set(Object.keys(POLLSTERS))
  );

  const togglePollster = (name: string) => {
    setActivePollsters(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };

  const filteredPolls = useMemo(
    () => polls.filter(p => activePollsters.has(p.pollster)),
    [polls, activePollsters]
  );

  const fromDate = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    if (timeRange === "3m") d.setMonth(d.getMonth() - 3);
    else if (timeRange === "6m") d.setMonth(d.getMonth() - 6);
    else if (timeRange === "1y") d.setFullYear(d.getFullYear() - 1);
    else d.setFullYear(2025, 0, 1);
    return d;
  }, [timeRange]);

  const toDate = new Date("2026-03-24");

  const xTicks = useMemo(() => monthTicks(fromDate, toDate), [fromDate]);

  /**
   * Chart data:
   *  - "3m" → daily buckets: the exp(-days/30) recency decay makes the average
   *    drift smoothly every day even between polls.
   *  - "6m" / "1y" / "all" → weekly buckets (sufficient granularity, faster).
   */
  const chartData: ChartDataPoint[] = useMemo(() => {
    const buckets =
      timeRange === "3m" ? dayBuckets(fromDate, toDate) : weekBuckets(fromDate, toDate);
    const rangePolls = filteredPolls.filter(p => new Date(p.date) >= fromDate);
    return buckets.map(ts => {
      const asOf = new Date(ts).toISOString().slice(0, 10);
      const pollsUpTo = rangePolls.filter(p => new Date(p.date).getTime() <= ts);
      const point: ChartDataPoint = { ts };
      for (const pk of selectedParties) {
        point[`${pk}_avg`] = pollsUpTo.length > 0
          ? calcWeightedAverage(pollsUpTo, pk, asOf)
          : null;
      }
      return point;
    });
  }, [filteredPolls, selectedParties, fromDate, timeRange]);

  /** Raw individual poll dots */
  const rawDotData = useMemo(() => {
    const result: Record<string, RawDot[]> = {};
    for (const pk of selectedParties) {
      result[pk] = filteredPolls
        .filter(p => p[pk] != null && new Date(p.date) >= fromDate)
        .map(p => ({
          ts: new Date(p.date).getTime(),
          val: Number(p[pk]),
          pollster: p.pollster as string,
          n: Number(p.n),
        }));
    }
    return result;
  }, [filteredPolls, selectedParties, fromDate]);

  const xDomain = [fromDate.getTime(), toDate.getTime()];

  const RANGES: [TimeRange, string][] = [
    ["3m", t("chart.range.3m")],
    ["6m", t("chart.range.6m")],
    ["1y", t("chart.range.1y")],
    ["all", t("chart.range.all")],
  ];

  // Stable tooltip renderer — rebuilds only when filteredPolls / selectedParties change
  const tooltipContent = useMemo(
    () => (props: any) => (
      <CustomTooltip {...props} polls={filteredPolls} selectedParties={selectedParties} />
    ),
    [filteredPolls, selectedParties]
  );

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {RANGES.map(([id, label]) => (
            <Button
              key={id}
              variant={timeRange === id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(id)}
              className="font-mono text-xs h-7 px-3"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Pollster filters */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(POLLSTERS).map(([name, info]) => (
            <button
              key={name}
              onClick={() => togglePollster(name)}
              className="text-xs font-mono px-2 py-0.5 rounded-full border transition-all"
              style={{
                borderColor: activePollsters.has(name) ? "hsl(var(--accent))" : "hsl(var(--border))",
                color: activePollsters.has(name) ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                background: activePollsters.has(name) ? "hsl(var(--accent)/0.1)" : "transparent",
              }}
            >
              {name} {info.grade}
            </button>
          ))}
        </div>
      </div>

      {/* Party toggles — solid fill with white text when active */}
      <div className="flex flex-wrap gap-2">
        {PARTY_KEYS.map(pk => {
          const active = selectedParties.includes(pk);
          return (
            <button
              key={pk}
              onClick={() => onToggleParty(pk)}
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border transition-all"
              style={{
                borderColor: active ? PARTIES[pk].color : "hsl(var(--border))",
                background: active ? PARTIES[pk].color : "transparent",
                color: active ? "#ffffff" : "hsl(var(--muted-foreground))",
              }}
            >
              {PARTIES[pk].short}
            </button>
          );
        })}
      </div>

      {/* Chart — follows site theme via CSS variables */}
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 14, right: 16, bottom: 46, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />

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
              domain={[0, 32]}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
              tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={38}
            />

            <Tooltip content={tooltipContent} />

            {/* 2% spærregrænse — custom label stays inside SVG */}
            <ReferenceLine
              y={2}
              stroke={RED}
              strokeDasharray="3 3"
              strokeWidth={2}
              label={<ThresholdLabel />}
            />

            {/* Valg 24. mar */}
            <ReferenceLine
              x={ELECTION_TS}
              stroke={RED}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: t("chart.election"),
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "monospace",
                fill: RED,
              }}
            />

            {/* Weighted average lines */}
            {selectedParties.map(pk => {
              const color = PARTIES[pk].color;
              return (
                <Line
                  key={`${pk}_avg`}
                  dataKey={`${pk}_avg`}
                  data={chartData}
                  type="monotone"
                  stroke={color}
                  strokeWidth={3.5}
                  dot={false}
                  activeDot={{ r: 5, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  name={PARTIES[pk].short}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}

            {/* Raw individual poll dots */}
            {selectedParties.map(pk => {
              const color = PARTIES[pk].color;
              return (
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
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={1.6}
                        fill={color}
                        fillOpacity={0.85}
                        stroke="hsl(var(--card))"
                        strokeWidth={0.5}
                      />
                    );
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
