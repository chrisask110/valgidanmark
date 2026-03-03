"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart, Area, Line, Scatter,
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

function confBand(polls: Poll[], pk: string, ts: number): { lower: number; upper: number } | null {
  const windowMs = 21 * 86400000;
  const near = polls.filter(p => Math.abs(new Date(p.date).getTime() - ts) <= windowMs && p[pk] != null);
  if (near.length < 2) return null;
  const vals = near.map(p => Number(p[pk]));
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const std = Math.sqrt(variance);
  return { lower: Math.max(0, avg - 1.96 * std), upper: avg + 1.96 * std };
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const ts = label as number;

  const avgVals: { pk: string; avg: number }[] = [];
  const dotVals: { pk: string; val: number; pollster: string; n: number }[] = [];

  for (const entry of payload) {
    const key = entry.dataKey as string;
    if (key.endsWith("_avg") && entry.value != null) {
      avgVals.push({ pk: key.replace("_avg", ""), avg: entry.value });
    } else if (key === "val" && entry.value != null && entry.payload?.pollster) {
      dotVals.push({
        pk: entry.name as string,
        val: entry.value,
        pollster: entry.payload.pollster,
        n: entry.payload.n,
      });
    }
  }
  avgVals.sort((a, b) => b.avg - a.avg);
  dotVals.sort((a, b) => b.val - a.val);
  if (!avgVals.length && !dotVals.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-xl text-xs font-mono min-w-[190px]">
      <div className="text-muted-foreground mb-2">{fmtFull(ts)}</div>

      {dotVals.length > 0 && (
        <div className="mb-2 pb-2 border-b border-border">
          <div className="text-muted-foreground text-[10px] mb-1">
            {dotVals[0].pollster} · n={dotVals[0].n}
          </div>
          {dotVals.map(({ pk, val }) => (
            <div key={pk} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                {PARTIES[pk]?.short} {PARTIES[pk]?.name.split("–")[0].trim()}
              </span>
              <span className="text-foreground">{val.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {avgVals.length > 0 && (
        <>
          <div className="text-muted-foreground text-[10px] mb-1">Vægtet gns.</div>
          {avgVals.map(({ pk, avg }) => (
            <div key={pk} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: PARTIES[pk]?.color }} className="font-semibold">
                {PARTIES[pk]?.short} {PARTIES[pk]?.name.split("–")[0].trim()}
              </span>
              <span className="text-foreground">{avg.toFixed(1)}%</span>
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

  // Weekly-bucketed data: weighted average lines + confidence bands
  const chartData: ChartDataPoint[] = useMemo(() => {
    const buckets = weekBuckets(fromDate, toDate);
    const rangePolls = filteredPolls.filter(p => new Date(p.date) >= fromDate);
    return buckets.map(ts => {
      const asOf = new Date(ts).toISOString().slice(0, 10);
      const pollsUpTo = rangePolls.filter(p => new Date(p.date).getTime() <= ts);
      const point: ChartDataPoint = { ts };
      for (const pk of selectedParties) {
        const avg = pollsUpTo.length > 0 ? calcWeightedAverage(pollsUpTo, pk, asOf) : null;
        const band = confBand(rangePolls, pk, ts);
        point[`${pk}_avg`] = avg;
        point[`${pk}_lower`] = band?.lower ?? null;
        point[`${pk}_upper`] = band?.upper ?? null;
      }
      return point;
    });
  }, [filteredPolls, selectedParties, fromDate]);

  // Raw individual poll dots per party (separate data, not bucketed)
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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

            {/* Reference lines */}
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

            {/*
              Render order = z-order in Recharts.
              PASS 1 — confidence bands (behind everything)
              PASS 2 — weighted average lines (on top of bands)
              PASS 3 — raw poll dots (topmost layer)
            */}

            {/* PASS 1: All confidence bands */}
            {selectedParties.flatMap(pk => {
              const color = PARTIES[pk].color;
              return [
                // Upper bound — filled with party colour
                <Area
                  key={`${pk}_upper`}
                  dataKey={`${pk}_upper`}
                  data={chartData}
                  type="monotone"
                  fill={color}
                  fillOpacity={0.16}
                  stroke={color}
                  strokeOpacity={0.28}
                  strokeWidth={0.5}
                  legendType="none"
                  name={`${pk}_upper`}
                  isAnimationActive={false}
                />,
                // Lower bound — erase fill below it using card background
                <Area
                  key={`${pk}_lower`}
                  dataKey={`${pk}_lower`}
                  data={chartData}
                  type="monotone"
                  fill="hsl(var(--card))"
                  fillOpacity={1}
                  stroke={color}
                  strokeOpacity={0.28}
                  strokeWidth={0.5}
                  legendType="none"
                  name={`${pk}_lower`}
                  isAnimationActive={false}
                />,
              ];
            })}

            {/* PASS 2: All weighted average lines */}
            {selectedParties.map(pk => {
              const color = PARTIES[pk].color;
              return (
                <Line
                  key={`${pk}_avg`}
                  dataKey={`${pk}_avg`}
                  data={chartData}
                  type="monotone"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: color, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  name={PARTIES[pk].short}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}

            {/* PASS 3: Raw individual poll dots */}
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
                        r={2.2}
                        fill={color}
                        fillOpacity={0.62}
                        stroke="hsl(var(--card))"
                        strokeWidth={0.8}
                      />
                    );
                  }}
                />
              );
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
