"use client";

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { PARTIES, PARTY_KEYS, calcWeightedAverage, type Poll } from "@/app/lib/data";
import { useLanguage } from "./LanguageContext";

interface PollingAveragesProps {
  polls: Poll[];
  selectedParties: string[];
  onToggleParty: (pk: string) => void;
}

export function PollingAverages({ polls, selectedParties, onToggleParty }: PollingAveragesProps) {
  const { t } = useLanguage();

  // Compute current weighted average and 30-day trend for each party
  const partyStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    return PARTY_KEYS.map(pk => {
      const current = calcWeightedAverage(polls, pk, today) ?? 0;
      const prev = calcWeightedAverage(
        polls.filter(p => p.date <= monthAgo),
        pk,
        monthAgo
      ) ?? 0;
      const trend = current - prev;

      // Build 12-week sparkline data
      const sparkData: { v: number }[] = [];
      for (let w = 11; w >= 0; w--) {
        const asOf = new Date(Date.now() - w * 7 * 86400000).toISOString().slice(0, 10);
        const pollsUpTo = polls.filter(p => p.date <= asOf);
        const v = pollsUpTo.length > 0 ? calcWeightedAverage(pollsUpTo, pk, asOf) ?? 0 : 0;
        sparkData.push({ v });
      }

      return { pk, current, trend, sparkData };
    });
  }, [polls]);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
        {t("avg.title")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {partyStats.map(({ pk, current, trend, sparkData }) => {
          const party = PARTIES[pk];
          const active = selectedParties.includes(pk);
          const trendStr = trend >= 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1);
          const trendColor = trend > 0.2 ? "#22c55e" : trend < -0.2 ? "#ef4444" : "hsl(var(--muted-foreground))";

          return (
            <button
              key={pk}
              onClick={() => onToggleParty(pk)}
              className="flex-shrink-0 rounded-xl border transition-all p-3 text-left w-[110px]"
              style={{
                borderColor: active ? party.color : "hsl(var(--border))",
                background: active ? `${party.color}12` : "hsl(var(--card))",
              }}
            >
              {/* Party badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: party.color }}
                >
                  {party.short}
                </span>
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {party.short}
                </span>
              </div>

              {/* Percentage */}
              <div
                className="text-xl font-bold font-mono leading-none"
                style={{ color: party.color }}
              >
                {current.toFixed(1)}%
              </div>

              {/* Trend */}
              <div className="text-[11px] font-mono mt-0.5" style={{ color: trendColor }}>
                {trendStr}%
              </div>

              {/* Sparkline */}
              <div className="h-8 mt-2 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={party.color}
                      strokeWidth={1.5}
                      fill={party.color}
                      fillOpacity={0.15}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
