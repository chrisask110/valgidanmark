"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  PARTIES, PARTY_KEYS, FALLBACK_POLLS,
  calcWeightedAverage, calcPartySeats, type Poll,
} from "@/app/lib/data";
import { ShareBar } from "@/app/components/ShareBar";

// ─── FO / GL individual seat definitions ─────────────────────────────────────
// Each constituency sends 2 MPs — treated as separate 1-seat entries so they
// can be assigned to different blocs independently.
const FO_GL_INDIVIDUAL = [
  { key: "FO1", name: "Færøerne – Mandat 1", short: "FO", color: PARTIES.FO.color },
  { key: "FO2", name: "Færøerne – Mandat 2", short: "FO", color: PARTIES.FO.color },
  { key: "GL1", name: "Grønland – Mandat 1",  short: "GL", color: PARTIES.GL.color },
  { key: "GL2", name: "Grønland – Mandat 2",  short: "GL", color: PARTIES.GL.color },
] as const;

const FO_GL_KEYS = FO_GL_INDIVIDUAL.map(e => e.key);

// ─── Static data ─────────────────────────────────────────────────────────────

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
type DataSource = "model" | "Verian" | "Epinion" | "Megafon" | "Voxmeter";

const CAT_CONFIG: Record<Category, { label: string; color: string; bg: string; border: string }> = {
  government: { label: "Regeringsparti", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.4)"  },
  support:    { label: "Støtteparti",    color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.4)"  },
  opposition: { label: "Opposition",    color: "#64748b", bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.2)" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function StatsministerPage() {
  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [dataSource, setDataSource] = useState<DataSource>("model");
  const [categories, setCategories] = useState<Record<string, Category>>(
    () => Object.fromEntries(
      [...PARTY_KEYS, ...FO_GL_KEYS].map(k => [k, "opposition" as Category])
    )
  );
  const [selectedPM, setSelectedPM] = useState<string | null>(null);
  const [predictionExpanded, setPredictionExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const predictionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/polls")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.polls) && data.polls.length > 0) setPolls(data.polls);
      })
      .catch(() => {});
  }, []);

  const partyPct = useMemo((): Record<string, number> => {
    const today = new Date().toISOString().slice(0, 10);
    if (dataSource === "model") {
      return Object.fromEntries(PARTY_KEYS.map(pk => [pk, calcWeightedAverage(polls, pk, today) ?? 0]));
    }
    const latestByInstitute = [...polls]
      .filter(p => p.pollster === dataSource)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return Object.fromEntries(PARTY_KEYS.map(pk => [pk, Number(latestByInstitute?.[pk]) || 0]));
  }, [polls, dataSource]);

  const partySeats = useMemo(() => calcPartySeats(partyPct), [partyPct]);

  const visibleParties = PARTY_KEYS.filter(pk => (partyPct[pk] || 0) >= 0.5);
  const pmCandidates   = PARTY_KEYS.filter(pk => (partyPct[pk] || 0) >= 2);

  // DK parties by role
  const govParties     = visibleParties.filter(pk => categories[pk] === "government");
  const supportParties = visibleParties.filter(pk => categories[pk] === "support");

  // FO/GL individual seats by role
  const govFoGl     = FO_GL_INDIVIDUAL.filter(e => categories[e.key] === "government");
  const supportFoGl = FO_GL_INDIVIDUAL.filter(e => categories[e.key] === "support");

  const govSeats     = govParties.reduce((s, pk) => s + (partySeats[pk] || 0), 0) + govFoGl.length;
  const supportSeats = supportParties.reduce((s, pk) => s + (partySeats[pk] || 0), 0) + supportFoGl.length;
  const coalitionSeats = govSeats + supportSeats;
  const hasMajority = coalitionSeats >= 90;

  const selectPM = (pk: string) => {
    const next = selectedPM === pk ? null : pk;
    setSelectedPM(next);
    if (next) setCategories(prev => ({ ...prev, [pk]: "government" }));
    setPredictionExpanded(false);
  };

  const cycleCategory = (key: string) => {
    const order: Category[] = ["government", "support", "opposition"];
    setCategories(prev => {
      const next = order[(order.indexOf(prev[key]) + 1) % 3];
      return { ...prev, [key]: next };
    });
    setPredictionExpanded(false);
  };

  const predictionText = useMemo(() => {
    if (!selectedPM) return "";
    const pmName = PARTY_LEADERS[selectedPM];
    const govOthers = govParties.filter(pk => pk !== selectedPM);
    const parts: string[] = [];
    parts.push(`Jeg forudsiger at ${pmName} (${PARTIES[selectedPM].name}) bliver Danmarks næste statsminister.`);

    const govOtherParts = [
      ...govOthers.map(pk => `${PARTIES[pk].short} (${PARTIES[pk].name.split("–")[0].trim()})`),
      ...govFoGl.map(e => e.name),
    ];
    if (govOtherParts.length > 0)
      parts.push(`Regeringen dannes med ${govOtherParts.join(", ")}.`);

    const supportParts = [
      ...supportParties.map(pk => PARTIES[pk].short),
      ...supportFoGl.map(e => e.name),
    ];
    if (supportParts.length > 0)
      parts.push(`Parlamentarisk grundlag sikres af ${supportParts.join(", ")}.`);

    parts.push(`Koalitionen har ${coalitionSeats} af de nødvendige 90 mandater${hasMajority ? " — flertal opnået!" : "."}`);
    return parts.join(" ");
  }, [selectedPM, govParties, govFoGl, supportParties, supportFoGl, coalitionSeats, hasMajority]);

  const saveAsImage = async () => {
    if (!predictionRef.current) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(predictionRef.current, {
        cacheBust: true, pixelRatio: 2, backgroundColor: "#0f172a",
      });
      const blob  = await (await fetch(dataUrl)).blob();
      const file  = new File([blob], "min-forudsigelse.png", { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Min valgforudsigelse – valgidanmark.dk" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = "min-forudsigelse.png"; a.click();
      }
    } catch (err) { console.error(err); }
    finally { setSharing(false); }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* ── Page title ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          Hvem bliver Danmarks næste statsminister?
        </h1>
        <p className="text-sm font-mono text-muted-foreground max-w-xl leading-relaxed">
          Vælg din kandidat, fordel partierne og se om dit hold kan danne flertal.
          Der kræves mindst <strong className="text-foreground">90 mandater</strong> ud af 179.
        </p>
      </div>

      {/* ── Data source toggle ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-mono text-muted-foreground tracking-widest">DATAKILDE:</span>
        {(["model", "Verian", "Epinion", "Megafon", "Voxmeter"] as const).map(id => (
          <button
            key={id}
            onClick={() => setDataSource(id)}
            className="text-xs font-mono px-3 py-1.5 rounded-md border transition-all"
            style={{
              borderColor: dataSource === id ? "hsl(var(--accent))" : "hsl(var(--border))",
              background:  dataSource === id ? "hsl(var(--accent)/0.12)" : "transparent",
              color:       dataSource === id ? "hsl(var(--accent))"  : "hsl(var(--muted-foreground))",
            }}
          >
            {id === "model" ? "Vægtet model" : id}
          </button>
        ))}
      </div>

      {/* ── Step 1: PM candidate ────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
          Trin 1 · Vælg statsministerkandidat
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pmCandidates.map(pk => {
            const isSel = selectedPM === pk;
            return (
              <button
                key={pk}
                onClick={() => selectPM(pk)}
                className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  borderColor: isSel ? PARTIES[pk].color : "hsl(var(--border))",
                  background:  isSel ? `${PARTIES[pk].color}16` : "hsl(var(--card))",
                  boxShadow:   isSel ? `0 0 0 1px ${PARTIES[pk].color}30, 0 4px 16px ${PARTIES[pk].color}18` : "none",
                }}
              >
                <div
                  className="flex-shrink-0 rounded-full overflow-hidden"
                  style={{
                    width: 48, height: 48,
                    border:     `2.5px solid ${isSel ? PARTIES[pk].color : "hsl(var(--border))"}`,
                    background: PARTIES[pk].color,
                  }}
                >
                  <img
                    src={`/Leaders/${pk}.jpg`}
                    alt={PARTY_LEADERS[pk]}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {PARTY_LEADERS[pk]}{isSel ? " 👑" : ""}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {PARTIES[pk].short} · {(partyPct[pk] || 0).toFixed(1)}% · {partySeats[pk] ?? 0} mand.
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Step 2 + Coalition counter ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Step 2: Party assignment */}
        <section className="lg:col-span-2 space-y-3">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            Trin 2 · Fordel partierne
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            Klik for at skifte rolle: Regeringsparti → Støtteparti → Opposition
          </p>

          {/* DK parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleParties.map(pk => {
              const cat   = categories[pk];
              const cfg   = CAT_CONFIG[cat];
              const isPM  = pk === selectedPM;
              return (
                <div
                  key={pk}
                  onClick={() => cycleCategory(pk)}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all"
                  style={{
                    borderColor: isPM ? PARTIES[pk].color : cfg.border,
                    background:  cfg.bg,
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ background: PARTIES[pk].color }}
                    >
                      {PARTIES[pk].short}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {isPM ? `${PARTY_LEADERS[pk]} 👑` : PARTIES[pk].name.split("–")[0].trim()}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {(partyPct[pk] || 0).toFixed(1)}% · {partySeats[pk] ?? 0} mand.
                      </div>
                    </div>
                  </div>
                  <span
                    className="flex-shrink-0 text-[10px] font-bold font-mono uppercase tracking-wider"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* FO + GL — 4 individual 1-seat entries */}
          <div className="mt-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Færøerne & Grønland · Faste mandater · ingen valgmåling
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FO_GL_INDIVIDUAL.map(entry => {
                const cat = categories[entry.key];
                const cfg = CAT_CONFIG[cat];
                return (
                  <div
                    key={entry.key}
                    onClick={() => cycleCategory(entry.key)}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all"
                    style={{ borderColor: cfg.border, background: cfg.bg }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: entry.color }}
                      >
                        {entry.short}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{entry.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">1 mand. (fast)</div>
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px] font-bold font-mono uppercase tracking-wider"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sticky coalition counter */}
        <aside className="lg:sticky lg:top-20 space-y-3">
          <div
            className="rounded-xl border p-5 transition-all duration-300"
            style={{
              borderColor: hasMajority ? "rgba(74,222,128,0.45)" : "hsl(var(--border))",
              background:  hasMajority ? "rgba(74,222,128,0.06)" : "hsl(var(--card))",
              boxShadow:   hasMajority ? "0 0 32px rgba(74,222,128,0.08)" : "none",
            }}
          >
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Parlamentarisk grundlag
            </p>

            <div
              className="text-5xl font-bold font-mono leading-none tabular-nums"
              style={{ color: hasMajority ? "#4ade80" : "hsl(var(--foreground))" }}
            >
              {coalitionSeats}
            </div>
            <div className="text-sm font-mono text-muted-foreground mt-1 mb-4">
              af 179 &middot;{" "}
              {hasMajority
                ? <span className="text-green-400">✓ Flertal opnået!</span>
                : `mangler ${90 - coalitionSeats}`
              }
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 rounded-full bg-muted overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width:      `${Math.min(100, (coalitionSeats / 179) * 100)}%`,
                  background: hasMajority
                    ? "linear-gradient(90deg,#22c55e,#4ade80)"
                    : "linear-gradient(90deg,#3b82f6,#60a5fa)",
                }}
              />
              {/* 90-seat marker — uses foreground color so it's visible on both light and dark */}
              <div
                className="absolute top-0 h-full w-px bg-foreground/40"
                style={{ left: `${(90 / 179) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-5">
              <span>{coalitionSeats} mand.</span>
              <span>flertal ↑ 90</span>
            </div>

            {/* Breakdown */}
            <div className="space-y-1 text-xs font-mono">
              <div className="flex gap-2">
                <span className="text-amber-400 w-10">Reg.</span>
                <span className="text-muted-foreground">
                  {govSeats} mand.
                  {(govParties.length > 0 || govFoGl.length > 0) && ` · ${[
                    ...govParties.map(p => PARTIES[p].short),
                    ...govFoGl.map(e => e.short),
                  ].join(", ")}`}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-green-400 w-10">Støt.</span>
                <span className="text-muted-foreground">
                  {supportSeats} mand.
                  {(supportParties.length > 0 || supportFoGl.length > 0) && ` · ${[
                    ...supportParties.map(p => PARTIES[p].short),
                    ...supportFoGl.map(e => e.short),
                  ].join(", ")}`}
                </span>
              </div>
            </div>
          </div>

          {selectedPM && !predictionExpanded && (
            <button
              onClick={() => setPredictionExpanded(true)}
              className="w-full py-3 px-4 rounded-xl border font-mono text-sm font-semibold transition-all"
              style={{
                borderColor: hasMajority ? "rgba(74,222,128,0.45)" : "hsl(var(--border))",
                background:  hasMajority ? "rgba(74,222,128,0.1)"  : "hsl(var(--muted))",
                color:       hasMajority ? "#4ade80"               : "hsl(var(--muted-foreground))",
              }}
            >
              {hasMajority ? "Se min forudsigelse →" : "Gem forudsigelse →"}
            </button>
          )}
        </aside>
      </div>

      {/* ── Prediction card + share ──────────────────────────────────── */}
      {selectedPM && predictionExpanded && (
        <section className="space-y-4 border-t border-border pt-8">
          <div
            ref={predictionRef}
            className="rounded-xl p-6 space-y-5"
            style={{
              background: "linear-gradient(135deg,#0d1f4a 0%,#0f172a 100%)",
              border: "1.5px solid rgba(147,197,253,0.2)",
            }}
          >
            {/* PM header */}
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 rounded-full overflow-hidden"
                style={{
                  width: 72, height: 72,
                  border: `3px solid ${PARTIES[selectedPM].color}`,
                  background: PARTIES[selectedPM].color,
                }}
              >
                <img
                  src={`/Leaders/${selectedPM}.jpg`}
                  alt={PARTY_LEADERS[selectedPM]}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                  Min forudsigelse
                </div>
                <div className="text-xl font-bold text-white leading-tight">
                  {PARTY_LEADERS[selectedPM]} 👑
                </div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {PARTIES[selectedPM].name}
                </div>
              </div>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed">{predictionText}</p>

            {/* Coalition pills */}
            <div className="flex flex-wrap gap-2">
              {govParties.map(pk => (
                <span
                  key={pk}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold"
                  style={{ background: `${PARTIES[pk].color}22`, border: `1px solid ${PARTIES[pk].color}55`, color: PARTIES[pk].color }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: PARTIES[pk].color }}>
                    {PARTIES[pk].short}
                  </span>
                  Reg.
                </span>
              ))}
              {govFoGl.map(e => (
                <span
                  key={e.key}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold"
                  style={{ background: `${e.color}22`, border: `1px solid ${e.color}55`, color: e.color }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: e.color }}>
                    {e.short}
                  </span>
                  Reg.
                </span>
              ))}
              {supportParties.map(pk => (
                <span
                  key={pk}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80" }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: PARTIES[pk].color }}>
                    {PARTIES[pk].short}
                  </span>
                  Støt.
                </span>
              ))}
              {supportFoGl.map(e => (
                <span
                  key={e.key}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.35)", color: "#4ade80" }}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: e.color }}>
                    {e.short}
                  </span>
                  Støt.
                </span>
              ))}
            </div>

            {/* Seat footer */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{
                background: hasMajority ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${hasMajority ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <span className="text-2xl font-bold font-mono tabular-nums" style={{ color: hasMajority ? "#4ade80" : "#f8fafc" }}>
                {coalitionSeats}
              </span>
              <span className="text-sm" style={{ color: hasMajority ? "#4ade80" : "#64748b" }}>
                {hasMajority ? "mandater — flertal opnået ✓" : `mandater — mangler ${90 - coalitionSeats}`}
              </span>
              <span className="ml-auto text-[10px] font-mono text-slate-700">valgidanmark.dk</span>
            </div>
          </div>

          <ShareBar
            pmName={PARTY_LEADERS[selectedPM]}
            coalitionShorts={[
              ...govParties.map(pk => PARTIES[pk].short),
              ...govFoGl.map(e => e.short),
              ...supportParties.map(pk => PARTIES[pk].short),
              ...supportFoGl.map(e => e.short),
            ]}
            coalitionSeats={coalitionSeats}
          />

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={saveAsImage}
              disabled={sharing}
              className="flex-1 min-w-[160px] py-3 px-5 rounded-xl border font-mono text-sm font-semibold transition-all"
              style={{
                borderColor: sharing ? "hsl(var(--border))" : "rgba(147,197,253,0.4)",
                background:  sharing ? "transparent"        : "rgba(147,197,253,0.08)",
                color:       sharing ? "hsl(var(--muted-foreground))" : "#93c5fd",
              }}
            >
              {sharing ? "Gemmer..." : "Gem som billede →"}
            </button>
            <button
              onClick={() => setPredictionExpanded(false)}
              className="py-3 px-5 rounded-xl border border-border font-mono text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Rediger
            </button>
          </div>
        </section>
      )}

    </main>
  );
}
