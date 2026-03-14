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
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | undefined>(undefined);

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
    <div style={{
      background: "linear-gradient(180deg, #122050 0%, #0c1a3e 100%)",
      borderBottom: "1px solid rgba(240,165,53,0.18)",
      padding: "16px 16px",
      textAlign: "center",
    }}>
      <p style={{
        margin: "0 0 10px",
        fontSize: "0.65rem",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        color: "rgba(240,165,53,0.55)",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span style={{ display: "block" }}>Nedtælling til Folketingsvalget</span>
        <span style={{ display: "block" }}>24. marts 2026</span>
      </p>

      {timeLeft === undefined ? null : timeLeft === null ? (
        <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f0a535", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
          Valget er i gang!
        </p>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2px" }}>
          {units.map(({ value, label }, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "72px" }}>
                <span style={{
                  fontSize: "2.8rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#f0a535",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "'JetBrains Mono', monospace",
                  textShadow: "0 0 28px rgba(240,165,53,0.35)",
                }}>
                  {value !== undefined ? String(value).padStart(2, "0") : "--"}
                </span>
                <span style={{
                  fontSize: "0.55rem",
                  color: "rgba(240,165,53,0.4)",
                  marginTop: "4px",
                  letterSpacing: "0.14em",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span style={{
                  fontSize: "2rem",
                  fontWeight: 300,
                  color: "rgba(240,165,53,0.2)",
                  lineHeight: 1,
                  marginBottom: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>:</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
