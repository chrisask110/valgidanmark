"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AfstemningsomraadeResult {
  nummer: number;
  navn: string;
  dagiId?: number;
  resultatart: string;
  afgivneStemmer: number;
  stemmeberettigede: number;
  partier: Array<{ bogstav: string; stemmer: number; stemmeProcent: number }>;
}

interface KommuneData {
  navn: string;
  kommunekode: number;
  storkreds: string;
  afgivneStemmer: number;
  gyldigeStemmer: number;
  stemmeberettigede: number;
  optalteAfstemningsomraader: number;
  partier: Array<{ bogstav: string; navn: string; stemmer: number; stemmeProcent: number }>;
  afstemningsomraader: AfstemningsomraadeResult[];
}

interface Election2022Party {
  bogstav: string;
  stemmePct: number;
  mandater: number;
}

interface Kommune2022Summary {
  kommunekode: string;
  kommune_navn: string;
  storkreds: string;
  winner: string;
  partier: { bogstav: string; navn: string; stemmePct: number }[];
}

interface DenmarkMapProps {
  perKommune: Record<string, KommuneData>;
  hasData: boolean;
  results2022?: Election2022Party[];
  /** Controls which data is visualised:
   *  - "waiting"  → all kommuner gray (before election, 2026 slot)
   *  - "2022"     → color by 2022 winner per kommune
   *  - "live"     → color by leading party from live data (gray = not yet counted)
   */
  mode?: "waiting" | "2022" | "live";
  results2022Kommuner?: Record<string, Kommune2022Summary>;
}

interface TooltipState {
  x: number;
  y: number;
  kommuneKey: string;
  navn: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTIES: Record<string, { name: string; color: string; bloc: "red" | "blue" }> = {
  A: { name: "Socialdemokraterne",           color: "#C8102E", bloc: "red"  },
  F: { name: "SF – Socialistisk Folkeparti", color: "#E4007C", bloc: "red"  },
  V: { name: "Venstre",                      color: "#254B8E", bloc: "blue" },
  I: { name: "Liberal Alliance",             color: "#00B0CA", bloc: "blue" },
  Æ: { name: "Danmarksdemokraterne",         color: "#005F6B", bloc: "blue" },
  C: { name: "Det Konservative Folkeparti",  color: "#00583C", bloc: "blue" },
  Ø: { name: "Enhedslisten",                 color: "#991B1E", bloc: "red"  },
  B: { name: "Radikale Venstre",             color: "#733280", bloc: "red"  },
  O: { name: "Dansk Folkeparti",             color: "#E4B828", bloc: "blue" },
  Å: { name: "Alternativet",                 color: "#2ECC71", bloc: "red"  },
  M: { name: "Moderaterne",                  color: "#8B5CF6", bloc: "blue" },
  H: { name: "Borgernes Parti",              color: "#0084FF", bloc: "blue" },
};

const RESULTS_2022: Record<string, number> = {
  A: 27.5, F: 8.3, V: 13.3, I: 7.9, Æ: 8.1,
  C: 5.5,  Ø: 5.3, B: 3.7,  O: 2.6, Å: 3.3,
  M: 9.3,  H: 0.0,
};

const NO_DATA_COLOR = "#9ca3af";
const STROKE_COLOR  = "rgba(0,0,0,0.25)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLeadingParty(partier: KommuneData["partier"]): { bogstav: string; stemmeProcent: number } | null {
  if (!partier || partier.length === 0) return null;
  const sorted = [...partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent);
  return sorted[0] ? { bogstav: sorted[0].bogstav, stemmeProcent: sorted[0].stemmeProcent } : null;
}

function formatNumber(n: number): string {
  return n.toLocaleString("da-DK");
}

// ─── Afstemningsområde Row ─────────────────────────────────────────────────────

function AfstemningsomraadeRow({ omraade }: { omraade: AfstemningsomraadeResult }) {
  const [expanded, setExpanded] = useState(false);

  const topParty = omraade.partier.length > 0
    ? [...omraade.partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent)[0]
    : null;

  const isForeloebig = omraade.resultatart?.toLowerCase().includes("foreløbig") ||
    omraade.resultatart?.toLowerCase().includes("forelobig");
  const hasResult = omraade.afgivneStemmer > 0 || omraade.partier.length > 0;

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-300 truncate">{omraade.navn}</span>
          {hasResult ? (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                isForeloebig
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {isForeloebig ? "Foreløbig" : omraade.resultatart || "Optalt"}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 bg-gray-500/20 text-gray-500">
              Ingen data
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {topParty && (
            <div className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: PARTIES[topParty.bogstav]?.color ?? "#888" }}
              />
              <span className="text-xs font-mono text-white">{topParty.stemmeProcent.toFixed(1)}%</span>
            </div>
          )}
          <span className="text-gray-500 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && omraade.partier.length > 0 && (
        <div className="px-3 pb-3 border-t border-white/5">
          <div className="mt-2 space-y-1">
            {[...omraade.partier]
              .sort((a, b) => b.stemmeProcent - a.stemmeProcent)
              .map((p) => {
                const color = PARTIES[p.bogstav]?.color ?? "#888";
                const maxPct = omraade.partier[0]?.stemmeProcent ?? 1;
                const barW = (p.stemmeProcent / maxPct) * 100;
                return (
                  <div key={p.bogstav}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold" style={{ color }}>{p.bogstav}</span>
                      </div>
                      <span className="font-mono text-white">{p.stemmeProcent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barW}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          {omraade.afgivneStemmer > 0 && (
            <p className="text-[10px] text-gray-500 mt-2">
              {formatNumber(omraade.afgivneStemmer)} afgivne stemmer
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function KommuneDetailPanel({
  navn,
  data,
  onClose,
  results2022Prop,
}: {
  navn: string;
  data: KommuneData | null;
  onClose: () => void;
  results2022Prop?: Election2022Party[];
}) {
  const [showAfstemning, setShowAfstemning] = useState(false);

  // Build 2022 reference map
  const ref2022: Record<string, number> = {};
  if (results2022Prop && results2022Prop.length > 0) {
    results2022Prop.forEach((p) => { ref2022[p.bogstav] = p.stemmePct; });
  } else {
    Object.assign(ref2022, RESULTS_2022);
  }

  const topPartier = [...(data?.partier ?? [])]
    .sort((a, b) => b.stemmeProcent - a.stemmeProcent)
    .slice(0, 8);

  const maxPct = topPartier[0]?.stemmeProcent ?? 1;

  const results2022Partier = Object.entries(ref2022)
    .sort(([, a], [, b]) => b - a)
    .map(([bogstav, pct]) => ({ bogstav, stemmeProcent: pct }));
  const max2022 = results2022Partier[0]?.stemmeProcent ?? 1;

  const hasLiveData = data && data.partier && data.partier.length > 0;
  const turnoutPct = data && data.stemmeberettigede > 0
    ? (data.afgivneStemmer / data.stemmeberettigede) * 100
    : null;

  const afstemninger = data?.afstemningsomraader ?? [];

  return (
    <div className="h-full overflow-y-auto bg-[#0f172a]">
      {/* Header */}
      <div className="sticky top-0 bg-[#0f172a] border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white leading-tight truncate">
            {data?.navn ?? navn}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{data?.storkreds ?? "Ingen data endnu"}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 flex-shrink-0 ml-2"
          aria-label="Luk"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Optalt badge */}
        {data ? (
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full font-medium">
              {data.optalteAfstemningsomraader > 0
                ? `${data.optalteAfstemningsomraader} afstemningsområder optalt`
                : "Ingen data endnu"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-gray-500/20 text-gray-400 text-xs px-2.5 py-1 rounded-full font-medium">
              Viser 2022-data
            </span>
          </div>
        )}

        {/* Party bars — live data */}
        {hasLiveData ? (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Partiresultater (foreløbige)
            </h4>
            <div className="space-y-2">
              {topPartier.map((p) => {
                const party = PARTIES[p.bogstav];
                const color = party?.color ?? "#888";
                const barW  = (p.stemmeProcent / maxPct) * 100;
                const ref   = ref2022[p.bogstav];
                const diff  = ref !== undefined ? p.stemmeProcent - ref : null;
                return (
                  <div key={p.bogstav}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold flex-shrink-0" style={{ color }}>
                          {p.bogstav}
                        </span>
                        <span className="text-gray-400 truncate max-w-[100px]">
                          {p.navn || party?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono font-semibold text-white">
                          {p.stemmeProcent.toFixed(1)}%
                        </span>
                        {diff !== null && (
                          <span
                            className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                              diff > 0
                                ? "text-green-400 bg-green-500/10"
                                : diff < 0
                                ? "text-red-400 bg-red-500/10"
                                : "text-gray-500"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${barW}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {results2022Prop && results2022Prop.length > 0 && (
              <p className="text-[10px] text-gray-500 mt-2 italic">
                +/− ift. nationalt 2022
              </p>
            )}
          </div>
        ) : (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              2022-resultater (nationale)
            </h4>
            <div className="space-y-2">
              {results2022Partier.map(({ bogstav, stemmeProcent }) => {
                const party = PARTIES[bogstav];
                const color = party?.color ?? "#888";
                const barW = (stemmeProcent / max2022) * 100;
                return (
                  <div key={bogstav}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-semibold" style={{ color }}>{bogstav}</span>
                        <span className="text-gray-400 truncate max-w-[120px]">{party?.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-white">{stemmeProcent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barW}%`, backgroundColor: color, opacity: 0.6 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">Kommunedata for 2026 ikke tilgængeligt endnu</p>
          </div>
        )}

        {/* Valgdeltagelse */}
        {data && data.afgivneStemmer > 0 && turnoutPct !== null && (
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Valgdeltagelse
            </h4>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">
                {formatNumber(data.afgivneStemmer)} af {formatNumber(data.stemmeberettigede)} stemmeberettigede
              </span>
              <span className="font-mono font-semibold text-white">{turnoutPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-300"
                style={{ width: `${Math.min(turnoutPct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Afstemningsområder */}
        {afstemninger.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <button
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 hover:text-gray-200 transition-colors"
              onClick={() => setShowAfstemning((p) => !p)}
            >
              <span>Afstemningsområder ({afstemninger.length})</span>
              <span className="normal-case font-normal text-gray-500">{showAfstemning ? "Skjul ▲" : "Vis ▼"}</span>
            </button>
            {showAfstemning && (
              <div className="space-y-1.5">
                {afstemninger.map((omr) => (
                  <AfstemningsomraadeRow key={omr.nummer} omraade={omr} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DenmarkMap({ perKommune, hasData, results2022, mode = "live", results2022Kommuner }: DenmarkMapProps) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const insetRef     = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);

  const [geojson, setGeojson]       = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [geoError, setGeoError]     = useState<string | null>(null);

  const [tooltip, setTooltip]           = useState<TooltipState | null>(null);
  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<KommuneData | null>(null);
  const [selectedNavn, setSelectedNavn] = useState<string>("");

  // Search state
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ key: string; navn: string }>>([]);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown]   = useState(false);
  const [allKommuner, setAllKommuner]     = useState<Array<{ key: string; navn: string }>>([]);

  // Fetch GeoJSON once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/dk-kommuner.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setGeojson(data);
          setLoadingGeo(false);
          // Extract all kommuner for search
          const pairs: Array<{ key: string; navn: string }> = data.features.map((f: any) => ({
            key: f.properties.lau_1,
            navn: f.properties.label_dk ?? f.properties.lau_1,
          }));
          setAllKommuner(pairs.sort((a, b) => a.navn.localeCompare(b.navn, "da")));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGeoError(err.message);
          setLoadingGeo(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Filter search results when query changes
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setHighlightedKeys(new Set());
      setShowDropdown(false);
      return;
    }
    const filtered = allKommuner
      .filter((k) => k.navn.toLowerCase().includes(q))
      .slice(0, 8);
    setSearchResults(filtered);
    setHighlightedKeys(new Set(filtered.map((k) => k.key)));
    setShowDropdown(filtered.length > 0);
  }, [searchQuery, allKommuner]);

  // Apply highlight strokes via D3
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll("path")
      .attr("stroke-width", (d: any) =>
        highlightedKeys.has(d?.properties?.lau_1) ? 2.5 : 0.5
      )
      .attr("stroke", (d: any) =>
        highlightedKeys.has(d?.properties?.lau_1) ? "#ffffff" : STROKE_COLOR
      );
  }, [highlightedKeys]);

  // Build 2022 reference map for coloring
  const ref2022Map: Record<string, number> = {};
  if (results2022 && results2022.length > 0) {
    results2022.forEach((p) => { ref2022Map[p.bogstav] = p.stemmePct; });
  } else {
    Object.assign(ref2022Map, RESULTS_2022);
  }

  const winner2022 = Object.entries(ref2022Map).sort(([, a], [, b]) => b - a)[0]?.[0];

  // Draw main map
  useEffect(() => {
    if (!geojson || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = 600;
    const H = 700;

    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const bornholmCode = "400";
    const mainFeatures = geojson.features.filter(
      (f: any) => f.properties.lau_1 !== bornholmCode
    );
    const bornholmFeature = geojson.features.find(
      (f: any) => f.properties.lau_1 === bornholmCode
    );

    const mainGeo = { type: "FeatureCollection", features: mainFeatures };

    const projection = d3.geoMercator().fitExtent(
      [[20, 20], [W - 20, H - 20]],
      mainGeo as any
    );

    const path = d3.geoPath().projection(projection);

    function getFillColor(feature: any): string {
      const key = feature.properties.lau_1;
      if (mode === "waiting") return NO_DATA_COLOR;
      if (mode === "2022") {
        const winner = results2022Kommuner?.[key]?.winner ?? winner2022;
        return winner ? (PARTIES[winner]?.color ?? NO_DATA_COLOR) : NO_DATA_COLOR;
      }
      // mode === "live"
      const kommune = perKommune[key];
      if (kommune && kommune.partier && kommune.partier.length > 0) {
        const leader = getLeadingParty(kommune.partier);
        if (leader) return PARTIES[leader.bogstav]?.color ?? NO_DATA_COLOR;
      }
      return NO_DATA_COLOR;
    }

    function getFillOpacity(feature: any): number {
      if (mode === "waiting") return 0.6;
      if (mode === "2022") return 0.85;
      // mode === "live"
      const key = feature.properties.lau_1;
      const kommune = perKommune[key];
      if (kommune && kommune.partier && kommune.partier.length > 0) return 0.85;
      return 0.45;
    }

    const g = svg.append("g");

    g.selectAll("path")
      .data(mainFeatures)
      .join("path")
      .attr("d", (d: any) => path(d) ?? "")
      .attr("fill", (d: any) => getFillColor(d))
      .attr("fill-opacity", (d: any) => getFillOpacity(d))
      .attr("stroke", STROKE_COLOR)
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event: MouseEvent, d: any) {
        d3.select(this).attr("stroke-width", 1.5).attr("stroke", "#ffffff80");
        const key      = d.properties.lau_1;
        const kommune  = perKommune[key];
        const leader   = kommune ? getLeadingParty(kommune.partier) : null;
        const rect     = svgRef.current!.getBoundingClientRect();
        const optalt   = kommune?.optalteAfstemningsomraader ?? 0;
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          kommuneKey: key,
          navn: d.properties.label_dk,
        });
        // Stash extra info for tooltip
        (this as any)._leader = leader;
        (this as any)._optalt = optalt;
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((prev) =>
          prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev
        );
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-width", 0.5).attr("stroke", STROKE_COLOR);
        setTooltip(null);
      })
      .on("click", function (_event: MouseEvent, d: any) {
        const key = d.properties.lau_1;
        setSelectedKey(key);
        setSelectedData(perKommune[key] ?? null);
        setSelectedNavn(d.properties.label_dk ?? "");
        // Scroll panel into view on mobile
        setTimeout(() => {
          panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      });

    // Draw Bornholm inset
    if (bornholmFeature && insetRef.current) {
      const insetSvg = d3.select(insetRef.current);
      insetSvg.selectAll("*").remove();

      const IW = 100;
      const IH = 80;
      insetSvg.attr("viewBox", `0 0 ${IW} ${IH}`);

      const insetProjection = d3.geoMercator().fitExtent(
        [[5, 5], [IW - 5, IH - 5]],
        bornholmFeature as any
      );
      const insetPath = d3.geoPath().projection(insetProjection);

      const bKey   = bornholmFeature.properties.lau_1;
      const bKomm  = perKommune[bKey];
      let bColor: string;
      let bOpacity: number;
      if (mode === "waiting") {
        bColor = NO_DATA_COLOR;
        bOpacity = 0.6;
      } else if (mode === "2022") {
        const bWinner = results2022Kommuner?.[bKey]?.winner ?? winner2022;
        bColor = bWinner ? (PARTIES[bWinner]?.color ?? NO_DATA_COLOR) : NO_DATA_COLOR;
        bOpacity = 0.85;
      } else {
        const bLeader = bKomm ? getLeadingParty(bKomm.partier) : null;
        bColor = bLeader ? (PARTIES[bLeader.bogstav]?.color ?? NO_DATA_COLOR) : NO_DATA_COLOR;
        bOpacity = bKomm && bKomm.partier.length > 0 ? 0.85 : 0.45;
      }

      insetSvg.append("rect")
        .attr("width", IW).attr("height", IH)
        .attr("fill", "transparent")
        .attr("rx", 4);

      insetSvg.append("path")
        .datum(bornholmFeature)
        .attr("d", (d: any) => insetPath(d) ?? "")
        .attr("fill", bColor)
        .attr("fill-opacity", bOpacity)
        .attr("stroke", STROKE_COLOR)
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", () => {
          setSelectedKey(bKey);
          setSelectedData(perKommune[bKey] ?? null);
          setSelectedNavn(bornholmFeature.properties.label_dk ?? "Bornholm");
          setTimeout(() => {
            panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 50);
        });

      insetSvg.append("text")
        .attr("x", IW / 2).attr("y", IH - 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "8")
        .attr("fill", "#9ca3af")
        .text("Bornholm");
    }
  }, [geojson, perKommune, winner2022, mode, results2022Kommuner]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingGeo) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Indlæser kortdata...</p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Kortdata kunne ikke indlæses: {geoError}
      </div>
    );
  }

  const tooltipKommune = tooltip ? perKommune[tooltip.kommuneKey] : null;
  const tooltipLeader  = tooltipKommune ? getLeadingParty(tooltipKommune.partier) : null;
  const tooltipOptalt  = tooltipKommune?.optalteAfstemningsomraader ?? 0;

  // 2022 winner for tooltip fallback
  const ref2022Winner = Object.entries(ref2022Map).sort(([, a], [, b]) => b - a)[0];

  function handleSearchSelect(item: { key: string; navn: string }) {
    setSearchQuery(item.navn);
    setShowDropdown(false);
    setSelectedKey(item.key);
    setSelectedData(perKommune[item.key] ?? null);
    setSelectedNavn(item.navn);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  return (
    <div className="w-full select-none">
      {/* Search box */}
      <div className="relative mb-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Find kommune eller afstemningssted..."
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:bg-muted/70 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setHighlightedKeys(new Set());
                setShowDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-base leading-none"
              aria-label="Ryd søgning"
            >
              ×
            </button>
          )}
        </div>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
            {searchResults.map((item) => (
              <button
                key={item.key}
                onMouseDown={() => handleSearchSelect(item)}
                className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors flex items-center justify-between"
              >
                <span>{item.navn}</span>
                {(perKommune[item.key] || results2022Kommuner?.[item.key]) && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {perKommune[item.key]?.storkreds ?? results2022Kommuner?.[item.key]?.storkreds}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map + panel flex container */}
      <div className="flex flex-col sm:flex-row gap-0 transition-all duration-300">
        {/* Map SVG container — shrinks when panel open */}
        <div className={`transition-all duration-300 ${selectedKey ? "sm:w-3/5" : "w-full"}`}>
          <div className="relative">
            <svg
              ref={svgRef}
              className="w-full"
              style={{ maxHeight: "700px" }}
            />

            {/* Bornholm inset */}
            <div className="absolute bottom-10 right-4 w-24 shadow-xl rounded overflow-hidden border border-border bg-card">
              <svg ref={insetRef} className="w-full" />
            </div>

            {/* No-data badge */}
            {mode === "waiting" && (
              <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                Ingen data endnu · Opdateres automatisk
              </div>
            )}
            {mode === "2022" && (
              <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                Resultater fra Folketingsvalget 2022
              </div>
            )}

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-30 pointer-events-none bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs max-w-[220px]"
                style={{
                  left: Math.min(tooltip.x + 12, 460),
                  top: tooltip.y - 8,
                  transform: tooltip.x > 400 ? "translateX(-110%)" : undefined,
                }}
              >
                <div className="font-semibold text-popover-foreground mb-0.5">{tooltip.navn}</div>
                {mode === "waiting" ? (
                  <div className="text-muted-foreground">Ingen data endnu</div>
                ) : mode === "2022" ? (() => {
                  const k2022 = results2022Kommuner?.[tooltip.kommuneKey];
                  const winner = k2022?.winner ?? ref2022Winner?.[0];
                  const topPct = k2022?.partier[0]?.stemmePct ?? ref2022Winner?.[1];
                  return winner ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PARTIES[winner]?.color ?? "#888" }} />
                      <span>2022: {winner} {topPct != null ? topPct.toFixed(1) : "–"}%</span>
                    </div>
                  ) : <div className="text-muted-foreground">Ingen data</div>;
                })() : tooltipLeader ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PARTIES[tooltipLeader.bogstav]?.color ?? "#888" }}
                    />
                    <span>
                      Ledende: {tooltipLeader.bogstav} {tooltipLeader.stemmeProcent.toFixed(1)}%
                      {tooltipOptalt > 0 && ` · ${tooltipOptalt} omr. optalt`}
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Ikke optalt endnu</div>
                )}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground px-1">
            <span className="font-medium text-foreground mr-1">Ledende parti:</span>
            {Object.entries(PARTIES).map(([key, party]) => (
              <span key={key} className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: party.color }}
                />
                <span style={{ color: party.color }} className="font-semibold">{key}</span>
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NO_DATA_COLOR }} />
              Ikke optalt
            </span>
          </div>
        </div>

        {/* Detail panel — slide in from right on desktop, below map on mobile */}
        {selectedKey !== null && (
          <div
            ref={panelRef}
            className="sm:w-2/5 sm:pl-4 border-t sm:border-t-0 sm:border-l border-border mt-4 sm:mt-0 transition-all duration-300"
            style={{ minHeight: "200px", maxHeight: "700px" }}
          >
            <KommuneDetailPanel
              navn={selectedNavn}
              data={selectedData}
              onClose={() => {
                setSelectedKey(null);
                setSelectedData(null);
                setSelectedNavn("");
              }}
              results2022Prop={results2022}
            />
          </div>
        )}
      </div>
    </div>
  );
}
