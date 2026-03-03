"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PARTIES, PARTY_KEYS, FALLBACK_POLLS,
  calcWeightedAverage, calcPartySeats, type Poll,
} from "@/app/lib/data";

const PARTY_LEADERS: Record<string, string> = {
  A: "Mette Frederiksen",
  F: "Pia Olsen Dyhr",
  V: "Troels Lund Poulsen",
  I: "Alex Vanopslagh",
  Æ: "Inger Støjberg",
  C: "Mona Juul",
  Ø: "Pelle Dragsted",
  B: "Martin Lidegaard",
  O: "Morten Messerschmidt",
  Å: "Franciska Rosenkilde",
  M: "Lars Løkke Rasmussen",
  H: "Lars Boje Mathiesen",
};

type Category = "government" | "support" | "opposition";

const CAT_CONFIG: Record<Category, { label: string; color: string; bg: string; border: string }> = {
  government: { label: "Regeringsparti", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.45)" },
  support:    { label: "Støtteparti",    color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.45)" },
  opposition: { label: "Oppositionen",  color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.22)" },
};

function LeaderPhoto({ pk, size, border }: { pk: string; size: number; border?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      border: border || "none",
      background: PARTIES[pk].color,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <img
        src={`/Leaders/${pk}.jpg`}
        alt={PARTY_LEADERS[pk]}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
      />
    </div>
  );
}

export default function StatsministerPage() {
  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [dataSource, setDataSource] = useState<"model" | "latest">("model");
  const [categories, setCategories] = useState<Record<string, Category>>(
    () => Object.fromEntries(PARTY_KEYS.map(pk => [pk, "opposition" as Category]))
  );
  const [selectedPM, setSelectedPM] = useState<string | null>(null);
  const [predictionExpanded, setPredictionExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const predictionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("polls-data");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.polls?.length > 0) setPolls(parsed.polls);
      }
    } catch {}
  }, []);

  const partyPct = useMemo((): Record<string, number> => {
    const today = new Date().toISOString().slice(0, 10);
    if (dataSource === "model") {
      return Object.fromEntries(PARTY_KEYS.map(pk => [pk, calcWeightedAverage(polls, pk, today) ?? 0]));
    }
    const latest = [...polls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return Object.fromEntries(PARTY_KEYS.map(pk => [pk, Number(latest?.[pk]) || 0]));
  }, [polls, dataSource]);

  const partySeats = useMemo(() => calcPartySeats(partyPct), [partyPct]);

  const coalitionSeats = useMemo(() =>
    PARTY_KEYS
      .filter(pk => categories[pk] !== "opposition")
      .reduce((sum, pk) => sum + (partySeats[pk] || 0), 0),
    [categories, partySeats]);

  const hasMajority = coalitionSeats >= 90;

  const visibleParties = PARTY_KEYS.filter(pk => (partyPct[pk] || 0) >= 0.5);
  const pmCandidates = PARTY_KEYS.filter(pk => (partyPct[pk] || 0) >= 2);

  const selectPM = (pk: string) => {
    const next = selectedPM === pk ? null : pk;
    setSelectedPM(next);
    if (next) setCategories(prev => ({ ...prev, [pk]: "government" }));
    setPredictionExpanded(false);
  };

  const cycleCategory = (pk: string) => {
    const order: Category[] = ["government", "support", "opposition"];
    setCategories(prev => {
      const next = order[(order.indexOf(prev[pk]) + 1) % 3];
      return { ...prev, [pk]: next };
    });
    setPredictionExpanded(false);
  };

  const govParties = visibleParties.filter(pk => categories[pk] === "government");
  const supportParties = visibleParties.filter(pk => categories[pk] === "support");
  const govSeats = govParties.reduce((s, pk) => s + partySeats[pk], 0);
  const supportSeats = supportParties.reduce((s, pk) => s + partySeats[pk], 0);

  const predictionText = useMemo(() => {
    if (!selectedPM) return null;
    const pmName = PARTY_LEADERS[selectedPM];
    const govOthers = govParties.filter(pk => pk !== selectedPM);
    const parts: string[] = [];
    parts.push(`Jeg forudsiger at ${pmName} (${PARTIES[selectedPM].name}) bliver Danmarks næste statsminister.`);
    if (govOthers.length > 0) {
      parts.push(`Regeringen dannes med ${govOthers.map(pk => `${PARTIES[pk].short} (${PARTIES[pk].name.split("–")[0].trim()})`).join(", ")}.`);
    }
    if (supportParties.length > 0) {
      parts.push(`Parlamentarisk grundlag sikres af ${supportParties.map(pk => PARTIES[pk].short).join(", ")}.`);
    }
    parts.push(`Koalitionen har ${coalitionSeats} af de nødvendige 90 mandater${hasMajority ? " — flertal opnået!" : "."}`);
    return parts.join(" ");
  }, [selectedPM, govParties, supportParties, coalitionSeats, hasMajority]);

  const sharePrediction = async () => {
    if (!predictionRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(predictionRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0c1a3e",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "min-forudsigelse.png", { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Min valgforudsigelse – valgidanmark.dk" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "min-forudsigelse.png";
        a.click();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, rgba(50,100,200,0.28) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(200,16,46,0.12) 0%, transparent 55%), #0c1a3e", color: "#e2e8f0", fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Back nav */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 0" }}>
        <Link href="/" style={{ color: "#64748b", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none" }}>
          ← Valgbarometer
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 38px)", fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.03em", lineHeight: 1.1, background: "linear-gradient(135deg, #ffffff 0%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Hvem bliver Danmarks næste statsminister?
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
            Vælg din kandidat, fordel partierne og se om dit hold kan danne flertal.
            Der kræves mindst <strong style={{ color: "#94a3b8" }}>90 mandater</strong> ud af 179.
          </p>
        </div>

        {/* Data source toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginRight: 6 }}>DATAKILDE:</span>
          {([["model", "Vægtet model"], ["latest", "Seneste måling"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setDataSource(id)} style={{
              padding: "5px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
              background: dataSource === id ? "#1e3a5f" : "transparent",
              color: dataSource === id ? "#93c5fd" : "#475569",
              border: `1px solid ${dataSource === id ? "#3b82f6" : "#1e293b"}`,
              borderRadius: "7px", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* Step 1: PM candidate */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>
            TRIN 1 · Vælg statsministerkandidat
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pmCandidates.map(pk => {
              const isSel = selectedPM === pk;
              return (
                <button key={pk} onClick={() => selectPM(pk)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                  background: isSel ? `${PARTIES[pk].color}22` : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isSel ? PARTIES[pk].color : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "12px", cursor: "pointer", textAlign: "left",
                  boxShadow: isSel ? `0 0 20px ${PARTIES[pk].color}30` : "none",
                  transition: "all 0.2s",
                }}>
                  <LeaderPhoto pk={pk} size={40} border={`2px solid ${isSel ? PARTIES[pk].color : "rgba(255,255,255,0.15)"}`} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: isSel ? "#f8fafc" : "#94a3b8" }}>
                      {PARTY_LEADERS[pk]}{isSel ? " 👑" : ""}
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>
                      {PARTIES[pk].short} · {(partyPct[pk] || 0).toFixed(1)}% · {partySeats[pk]} mand.
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Party assignment */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            TRIN 2 · Fordel partierne
          </div>
          <div style={{ fontSize: "12px", color: "#475569", marginBottom: 14 }}>
            Klik på et parti for at skifte dets rolle: Regeringsparti → Støtteparti → Oppositionen
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {visibleParties.map(pk => {
              const cat = categories[pk];
              const cfg = CAT_CONFIG[cat];
              const isPM = pk === selectedPM;
              return (
                <div key={pk} onClick={() => cycleCategory(pk)} style={{
                  padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
                  background: cfg.bg,
                  border: `1.5px solid ${isPM ? PARTIES[pk].color : cfg.border}`,
                  boxShadow: isPM ? `0 0 16px ${PARTIES[pk].color}30` : "none",
                  transition: "all 0.15s",
                  userSelect: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: PARTIES[pk].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                      {PARTIES[pk].short}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {isPM ? `${PARTY_LEADERS[pk]} 👑` : PARTIES[pk].name.split("–")[0].trim()}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                        {(partyPct[pk] || 0).toFixed(1)}% · {partySeats[pk]} mand.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "'JetBrains Mono', monospace" }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: "10px", color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>klik →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coalition summary */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          border: `2px solid ${hasMajority ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "16px", padding: "20px 24px", marginBottom: 16,
          boxShadow: hasMajority ? "0 0 40px rgba(74,222,128,0.12)" : "none",
          transition: "all 0.3s",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
                Parlamentarisk grundlag
              </div>
              <div style={{ position: "relative", height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "visible", marginBottom: 8 }}>
                <div style={{
                  height: "100%", borderRadius: 5,
                  width: `${Math.min(100, (coalitionSeats / 179) * 100)}%`,
                  background: hasMajority ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #3b82f6, #60a5fa)",
                  transition: "width 0.4s ease",
                }} />
                <div style={{ position: "absolute", top: -3, left: `${(90 / 179) * 100}%`, width: 2, height: 16, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#64748b" }}>
                <span>{coalitionSeats} / 179 mandater</span>
                <span>↑ 90 nødvendige</span>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace" }}>
                  Reg. {govSeats} mand.{govParties.length > 0 ? ` (${govParties.map(pk => PARTIES[pk].short).join(", ")})` : ""}
                </span>
                <span style={{ fontSize: "12px", color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}>
                  Støt. {supportSeats} mand.{supportParties.length > 0 ? ` (${supportParties.map(pk => PARTIES[pk].short).join(", ")})` : ""}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "40px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, color: hasMajority ? "#4ade80" : "#f8fafc" }}>
                {coalitionSeats}
              </div>
              <div style={{ fontSize: "12px", color: hasMajority ? "#4ade80" : "#64748b", marginTop: 4 }}>
                {hasMajority ? "✓ Flertal opnået!" : `Mangler ${90 - coalitionSeats} mandater`}
              </div>
            </div>
          </div>
        </div>

        {/* Prediction button + reveal */}
        {selectedPM && (
          predictionExpanded ? (
            <div>
              {/* Shareable card — this is what gets captured as an image */}
              <div ref={predictionRef} style={{
                background: "linear-gradient(135deg, #0d1f4a 0%, #122050 100%)",
                border: "1.5px solid rgba(147,197,253,0.3)", borderRadius: "14px", padding: "24px",
                marginBottom: 12,
              }}>
                {/* PM header with photo */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `3px solid ${PARTIES[selectedPM].color}` }}>
                    <img
                      src={`/Leaders/${selectedPM}.jpg`}
                      alt={PARTY_LEADERS[selectedPM]}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                      Min forudsigelse
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", lineHeight: 1.2 }}>
                      {PARTY_LEADERS[selectedPM]} 👑
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: 2 }}>
                      {PARTIES[selectedPM].name}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "15px", color: "#e2e8f0", lineHeight: 1.75, margin: "0 0 18px", fontWeight: 500 }}>
                  {predictionText}
                </p>

                {/* Coalition party pills with letter badges */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {govParties.map(pk => (
                    <div key={pk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 6px", background: `${PARTIES[pk].color}20`, border: `1px solid ${PARTIES[pk].color}70`, borderRadius: 20 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: PARTIES[pk].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {PARTIES[pk].short}
                      </span>
                      <span style={{ fontSize: "11px", color: PARTIES[pk].color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        Reg.
                      </span>
                    </div>
                  ))}
                  {supportParties.map(pk => (
                    <div key={pk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 6px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 20 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: PARTIES[pk].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {PARTIES[pk].short}
                      </span>
                      <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        Støt.
                      </span>
                    </div>
                  ))}
                </div>

                {/* Seat count footer */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: hasMajority ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", borderRadius: 8, border: `1px solid ${hasMajority ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                  <span style={{ fontSize: "22px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: hasMajority ? "#4ade80" : "#f8fafc" }}>
                    {coalitionSeats}
                  </span>
                  <span style={{ fontSize: "12px", color: hasMajority ? "#4ade80" : "#64748b" }}>
                    {hasMajority ? "mandater — flertal opnået ✓" : `mandater — mangler ${90 - coalitionSeats}`}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>
                    valgidanmark.dk
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={sharePrediction} disabled={sharing} style={{
                  flex: 1, minWidth: 160, padding: "12px 20px", fontSize: "14px", fontWeight: 700,
                  cursor: sharing ? "default" : "pointer",
                  background: "linear-gradient(135deg, rgba(147,197,253,0.15) 0%, rgba(59,130,246,0.08) 100%)",
                  color: sharing ? "#475569" : "#93c5fd",
                  border: `1.5px solid ${sharing ? "rgba(255,255,255,0.08)" : "rgba(147,197,253,0.4)"}`,
                  borderRadius: "10px", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
                }}>
                  {sharing ? "Gemmer..." : "Del forudsigelse →"}
                </button>
                <button onClick={() => setPredictionExpanded(false)} style={{
                  padding: "12px 18px", fontSize: "13px", cursor: "pointer",
                  background: "transparent", color: "#64748b",
                  border: "1px solid #334155", borderRadius: "10px", fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  Rediger
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPredictionExpanded(true)} style={{
              width: "100%", padding: "14px 20px", fontSize: "15px", fontWeight: 700, cursor: "pointer",
              background: hasMajority
                ? "linear-gradient(135deg, rgba(74,222,128,0.18) 0%, rgba(34,197,94,0.08) 100%)"
                : "rgba(255,255,255,0.05)",
              color: hasMajority ? "#4ade80" : "#64748b",
              border: `1.5px solid ${hasMajority ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "12px", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
            }}>
              Dette er min forudsigelse →
            </button>
          )
        )}

      </div>
    </div>
  );
}
