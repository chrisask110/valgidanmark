"use client";

import { useState, useEffect } from "react";

const ELECTION_DATE = new Date("2026-03-24T08:00:00+01:00");

function getTimeLeft() {
  const diff = ELECTION_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft>>(null);

  useEffect(() => {
    setTimeLeft(getTimeLeft());
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const units = [
    { value: timeLeft?.days, label: "DAGE" },
    { value: timeLeft?.hours, label: "TIMER" },
    { value: timeLeft?.minutes, label: "MIN" },
    { value: timeLeft?.seconds, label: "SEK" },
  ];

  return (
    <div
      style={{
        background: "#0a1628",
        borderBottom: "1px solid #1e3a5f",
        padding: "20px 16px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: "0 0 14px",
          fontSize: "0.8rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "#64748b",
        }}
      >
        Nedtælling til Folketingsvalget · 24. marts 2026
      </p>

      {timeLeft === null && timeLeft !== undefined ? (
        <p style={{ fontSize: "1.8rem", fontWeight: 700, color: "#60a5fa", margin: 0 }}>
          Valget er i gang!
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {units.map(({ value, label }, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "80px" }}>
                <span
                  style={{
                    fontSize: "3.5rem",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "#e2e8f0",
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "monospace",
                  }}
                >
                  {value !== undefined ? String(value).padStart(2, "0") : "--"}
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "#475569",
                    marginTop: "5px",
                    letterSpacing: "0.1em",
                  }}
                >
                  {label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "#1e3a5f",
                    lineHeight: 1,
                    marginBottom: "16px",
                  }}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
