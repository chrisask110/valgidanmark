"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
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

// Weekly bucket timestamps for the chart x-axis
function weekBuckets(from: Date, to: Date): number[] {
  const buckets: number[] = [];
  const cur = new Date(from);
  cur.setDate(cur.getDate() - cur.getDay()); // align to Sunday
  while (cur <= to) {
    buckets.push(cur.getTime());
    cur.setDate(cur.getDate() + 7);
  }
  return buckets;
}

// Confidence band: mean ± 1.96*std of polls within ±21 days of a date
function confBand(polls: Poll[], pk: string, ts: number): { lower: number; upper: number; avg: number } | null {
  const windowMs = 21 * 86400000;
  const near = polls.filter(p => Math.abs(new Date(p.date).getTime() - ts) <= windowMs && p[pk] != null);
  if (near.length < 2) return null;
  const vals = near.map(p => Number(p[pk]));
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const std = Math.sqrt(variance);
  return { lower: Math.max(0, avg - 1.96 * std), upper: avg + 1.96 * std, avg };
}

interface ChartDataPoint {
  ts: number;
  [key: string]: number | null;
}

interface PollChartProps {
  polls: Poll[];
  selectedParties: string[];
  onToggleParty: (pk: string) => void;
}

const ELECTION_TS = new Date("2026-03-24").getTime();

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const ts = label as number;
  // Collect party values from payload
  const partyVals: { pk: string; avg: number | null }[] = [];
  for (const entry of payload) {
    const key = entry.dataKey as string;
    if (key.endsWith("_avg") && entry.value != null) {
      const pk = key.replace("_avg", "");
      partyVals.push({ pk, avg: entry.value });
    }
  }
  partyVals.sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs font-mono min-w-[170px]">
      <div className="text-muted-foreground mb-2">{fmtFull(ts)}</div>
      {partyVals.map(({ pk, avg }) => (
        <div key={pk} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
            {PARTIES[pk]?.short} {PARTIES[pk]?.name.split("–")[0].trim()}
          </span>
          <span className="text-foreground">{avg?.toFixed(1)}%</span>
        </div>
      ))}
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

  const chartData: ChartDataPoint[] = useMemo(() => {
    const buckets = weekBuckets(fromDate, toDate);
    const rangePolls = filteredPolls.filter(p => new Date(p.date) >= fromDate);

    return buckets.map(ts => {
      const asOf = new Date(ts).toISOString().slice(0, 10);
      const pollsUpTo = rangePolls.filter(p => new Date(p.date).getTime() <= ts);
      const point: ChartDataPoint = { ts };

      for (const pk of selectedParties) {
        const avg = pollsUpTo.length > 0
          ? calcWeightedAverage(pollsUpTo, pk, asOf)
          : null;
        const band = confBand(rangePolls, pk, ts);
        point[`${pk}_avg`] = avg;
        point[`${pk}_lower`] = band?.lower ?? null;
        point[`${pk}_upper`] = band?.upper ?? null;
      }
      return point;
    });
  }, [filteredPolls, selectedParties, fromDate]);

  const xDomain = [fromDate.getTime(), toDate.getTime()];

  const RANGES: [TimeRange, string][] = [
    ["3m", t("chart.range.3m")],
    ["6m", t("chart.range.6m")],
    ["1y", t("chart.range.1y")],
    ["all", t("chart.range.all")],
  ];

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Time range */}
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

      {/* Party toggles */}
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
                background: active ? `${PARTIES[pk].color}18` : "transparent",
                color: active ? PARTIES[pk].color : "hsl(var(--muted-foreground))",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: active ? PARTIES[pk].color : "hsl(var(--muted))" }}
              />
              {PARTIES[pk].short}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 20, left: 0 }}>
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
              tickFormatter={fmtMonthYear}
              tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval="preserveStartEnd"
              tickCount={7}
            />
            <YAxis
              tickFormatter={v => `${v}%`}
              domain={[0, 30]}
              tick={{ fontSize: 11, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 2% threshold */}
            <ReferenceLine
              y={2}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: t("chart.threshold"),
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "monospace",
                fill: "hsl(var(--muted-foreground))",
              }}
            />

            {/* Election date */}
            <ReferenceLine
              x={ELECTION_TS}
              stroke="#ef4444"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: t("chart.election"),
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "monospace",
                fill: "#ef4444",
              }}
            />

            {/* Per-party: confidence band + average line */}
            {selectedParties.map(pk => {
              const color = PARTIES[pk].color;
              return [
                // Confidence band (lower to upper)
                <Area
                  key={`${pk}_band`}
                  dataKey={`${pk}_upper`}
                  data={chartData}
                  type="monotone"
                  fill={color}
                  fillOpacity={0.08}
                  stroke="none"
                  legendType="none"
                  name={`${pk}_band_upper`}
                  isAnimationActive={false}
                />,
                <Area
                  key={`${pk}_lower`}
                  dataKey={`${pk}_lower`}
                  data={chartData}
                  type="monotone"
                  fill="hsl(var(--background))"
                  fillOpacity={1}
                  stroke="none"
                  legendType="none"
                  name={`${pk}_band_lower`}
                  isAnimationActive={false}
                />,
                // Weighted average line
                <Line
                  key={`${pk}_avg`}
                  dataKey={`${pk}_avg`}
                  data={chartData}
                  type="monotone"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  name={PARTIES[pk].short}
                  connectNulls
                  isAnimationActive={false}
                />,
              ];
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground font-mono text-right">
        Shaded area = {t("chart.confidence")}
      </p>
    </div>
  );
}
