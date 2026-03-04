"use client";

import { useState } from "react";
import { PARTIES, FO_GL_SEATS } from "@/app/lib/data";
import { useLanguage } from "./LanguageContext";

interface SeatHemicycleProps {
  seats: Record<string, number>;
}

// Build hemicycle seat positions across 4 arcs
function buildHemicycleSeats(seatsByParty: { party: string; count: number }[]) {
  const TOTAL = 179; // 175 DK + 2 Faroe Islands + 2 Greenland
  const ROW_CONFIG = [
    { r: 80,  count: 35 },
    { r: 108, count: 45 },
    { r: 136, count: 52 },
    { r: 164, count: 47 },
  ];

  // Flatten ordered parties into individual seat slots
  const ordered: string[] = [];
  for (const { party, count } of seatsByParty) {
    for (let i = 0; i < count; i++) ordered.push(party);
  }
  // Safety: pad any remaining slots
  while (ordered.length < TOTAL) ordered.push("__empty");

  const positions: { cx: number; cy: number; party: string }[] = [];
  let seatIdx = 0;

  for (const row of ROW_CONFIG) {
    for (let i = 0; i < row.count; i++) {
      // Angle: π (left) → 0 (right), from bottom center
      const angle = Math.PI - (i / (row.count - 1)) * Math.PI;
      const cx = 300 + row.r * Math.cos(angle);
      const cy = 195 - row.r * Math.sin(angle);
      positions.push({ cx, cy, party: ordered[seatIdx] ?? "__empty" });
      seatIdx++;
    }
  }

  return positions;
}

export function SeatHemicycle({ seats }: SeatHemicycleProps) {
  const { t } = useLanguage();
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  // Order: GL (left) → Rød blok → M → Blå blok → FO (right)
  const ORDERED = ["GL", "Å", "Ø", "B", "F", "A", "M", "C", "V", "I", "Æ", "O", "H", "FO"];

  const seatsByParty = ORDERED.map(pk => ({
    party: pk,
    count: FO_GL_SEATS[pk] ?? seats[pk] ?? 0,
  })).filter(x => x.count > 0);

  const positions = buildHemicycleSeats(seatsByParty);
  const totalDkSeats = ORDERED
    .filter(pk => !FO_GL_SEATS[pk])
    .reduce((s, pk) => s + (seats[pk] || 0), 0);

  // All parties shown in legend (DK + FO/GL)
  const partyTotals = ORDERED.filter(pk => (FO_GL_SEATS[pk] ?? seats[pk] ?? 0) > 0);

  return (
    <div className="w-full">
      {/* SVG hemicycle */}
      <svg
        viewBox="0 0 600 220"
        className="w-full"
        style={{ overflow: "visible" }}
      >
        {positions.map((pos, i) => {
          const isEmpty = pos.party === "__empty";
          const isParty = !isEmpty;
          const isHovered = hoveredParty === pos.party;
          const isFoGl = !!FO_GL_SEATS[pos.party];
          const color = isEmpty ? "currentColor" : PARTIES[pos.party]?.color || "#475569";
          return (
            <circle
              key={i}
              cx={pos.cx}
              cy={pos.cy}
              r={isHovered ? 6.5 : 5}
              fill={isEmpty ? "none" : color}
              stroke={isEmpty ? "currentColor" : (isFoGl ? color : "none")}
              strokeWidth={isEmpty ? 1 : (isFoGl ? 1.5 : 0)}
              opacity={
                isEmpty ? 0.15
                : isFoGl ? (hoveredParty && !isHovered ? 0.35 : 0.7)
                : (hoveredParty && !isHovered ? 0.4 : 1)
              }
              onMouseEnter={() => isParty && setHoveredParty(pos.party)}
              onMouseLeave={() => setHoveredParty(null)}
              style={{ cursor: isParty ? "pointer" : "default", transition: "opacity 0.15s, r 0.1s" }}
            />
          );
        })}
        {/* Center divider line */}
        <line x1="300" y1="200" x2="300" y2="30" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="3 3" />
        {/* Seat count label */}
        <text x="300" y="212" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.4" fontFamily="monospace">
          {totalDkSeats} {t("hemi.total")} {t("hemi.undecided")}
        </text>
      </svg>

      {/* Hover info */}
      {hoveredParty && (
        <div className="text-center -mt-1 mb-2">
          <span className="text-sm font-mono" style={{ color: PARTIES[hoveredParty]?.color }}>
            {PARTIES[hoveredParty]?.name}
            {FO_GL_SEATS[hoveredParty]
              ? ` — ${FO_GL_SEATS[hoveredParty]} mandater (fast)`
              : ` — ${seats[hoveredParty] || 0} mandater`}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
        {partyTotals.map(pk => {
          const count = FO_GL_SEATS[pk] ?? seats[pk] ?? 0;
          const isFoGl = !!FO_GL_SEATS[pk];
          return (
            <button
              key={pk}
              className="flex items-center gap-1 text-xs font-mono transition-opacity"
              style={{ opacity: hoveredParty && hoveredParty !== pk ? 0.4 : 1 }}
              onMouseEnter={() => setHoveredParty(pk)}
              onMouseLeave={() => setHoveredParty(null)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: isFoGl ? "transparent" : PARTIES[pk].color,
                  border: isFoGl ? `1.5px solid ${PARTIES[pk].color}` : "none",
                }}
              />
              <span className="text-muted-foreground">{PARTIES[pk].short}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
