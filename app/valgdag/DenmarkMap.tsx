"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KommuneData {
  navn: string;
  kommunekode: number;
  storkreds: string;
  afgivneStemmer: number;
  gyldigeStemmer: number;
  stemmeberettigede: number;
  optalteAfstemningsomraader: number;
  partier: Array<{ bogstav: string; navn: string; stemmer: number; stemmeProcent: number }>;
}

interface DenmarkMapProps {
  perKommune: Record<string, KommuneData>;
  hasData: boolean;
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

const NO_DATA_COLOR = "#374151";
const STROKE_COLOR  = "#111827";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLeadingParty(partier: KommuneData["partier"]): { bogstav: string; stemmeProcent: number } | null {
  if (!partier || partier.length === 0) return null;
  const sorted = [...partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent);
  return sorted[0] ? { bogstav: sorted[0].bogstav, stemmeProcent: sorted[0].stemmeProcent } : null;
}

function formatNumber(n: number): string {
  return n.toLocaleString("da-DK");
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function KommuneDetailPanel({
  kommuneKey,
  data,
  onClose,
}: {
  kommuneKey: string;
  data: KommuneData | null;
  onClose: () => void;
}) {
  if (!data) return null;

  const topPartier = [...data.partier]
    .sort((a, b) => b.stemmeProcent - a.stemmeProcent)
    .slice(0, 8);

  const maxPct = topPartier[0]?.stemmeProcent ?? 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f172a] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{data.navn}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{data.storkreds}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            aria-label="Luk"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Optalt info */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Optalt</span>
              <span className="font-semibold text-white">
                {data.optalteAfstemningsomraader > 0
                  ? `${data.optalteAfstemningsomraader} afstemningsområder`
                  : "Ingen data endnu"}
              </span>
            </div>
            {data.afgivneStemmer > 0 && (
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="text-gray-400">Afgivne stemmer</span>
                <span className="font-semibold text-white">{formatNumber(data.afgivneStemmer)}</span>
              </div>
            )}
            {data.stemmeberettigede > 0 && (
              <div className="flex items-center justify-between text-sm mt-1.5">
                <span className="text-gray-400">Stemmeberettigede</span>
                <span className="font-semibold text-white">{formatNumber(data.stemmeberettigede)}</span>
              </div>
            )}
          </div>

          {/* Party bars */}
          {topPartier.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Partiresultater
              </h4>
              <div className="space-y-2">
                {topPartier.map((p) => {
                  const party = PARTIES[p.bogstav];
                  const color = party?.color ?? "#888";
                  const barW  = (p.stemmeProcent / maxPct) * 100;
                  return (
                    <div key={p.bogstav}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold" style={{ color }}>
                            {p.bogstav}
                          </span>
                          <span className="text-gray-400 truncate max-w-[140px]">
                            {p.navn || party?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono font-semibold text-white">
                            {p.stemmeProcent.toFixed(1)}%
                          </span>
                          <span className="text-gray-500 hidden sm:inline">
                            {formatNumber(p.stemmer)}
                          </span>
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
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Ingen partidata tilgængelig</p>
          )}

          {/* 2022 national reference */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Nationalt 2022 (reference)
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(RESULTS_2022)
                .sort(([, a], [, b]) => b - a)
                .map(([bogstav, pct]) => {
                  const party = PARTIES[bogstav];
                  return (
                    <div key={bogstav} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: party?.color ?? "#888" }}
                      />
                      <span className="font-semibold w-5" style={{ color: party?.color ?? "#888" }}>
                        {bogstav}
                      </span>
                      <span className="text-gray-400">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DenmarkMap({ perKommune, hasData }: DenmarkMapProps) {
  const svgRef      = useRef<SVGSVGElement>(null);
  const insetRef    = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [geojson, setGeojson]       = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [geoError, setGeoError]     = useState<string | null>(null);

  const [tooltip, setTooltip]           = useState<TooltipState | null>(null);
  const [selectedKey, setSelectedKey]   = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<KommuneData | null>(null);

  // Fetch GeoJSON once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("https://dawa.aws.dk/kommuner?format=geojson&srid=4326")
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setGeojson(data);
          setLoadingGeo(false);
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

  // Draw main map
  useEffect(() => {
    if (!geojson || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = 600;
    const H = 700;

    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // Separate Bornholm from mainland for inset
    const bornholmCode = "400";
    const mainFeatures = geojson.features.filter(
      (f: any) => parseInt(f.properties.kode).toString() !== bornholmCode
    );
    const bornholmFeature = geojson.features.find(
      (f: any) => parseInt(f.properties.kode).toString() === bornholmCode
    );

    const mainGeo = { type: "FeatureCollection", features: mainFeatures };

    // Projection fitted to mainland
    const projection = d3.geoMercator().fitExtent(
      [[20, 20], [W - 20, H - 20]],
      mainGeo as any
    );

    const path = d3.geoPath().projection(projection);

    function getFillColor(feature: any): string {
      const key = parseInt(feature.properties.kode).toString();
      const kommune = perKommune[key];
      if (!kommune || !kommune.partier || kommune.partier.length === 0) return NO_DATA_COLOR;
      const leader = getLeadingParty(kommune.partier);
      if (!leader) return NO_DATA_COLOR;
      return PARTIES[leader.bogstav]?.color ?? NO_DATA_COLOR;
    }

    function getFillOpacity(feature: any): number {
      const key = parseInt(feature.properties.kode).toString();
      const kommune = perKommune[key];
      if (!kommune || !kommune.partier || kommune.partier.length === 0) return 1;
      return 0.85;
    }

    // Draw mainland municipalities
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
        const key  = parseInt(d.properties.kode).toString();
        const kommune = perKommune[key];
        const leader  = kommune ? getLeadingParty(kommune.partier) : null;
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          kommuneKey: key,
          navn: d.properties.navn,
        });
        // Store leader info for tooltip rendering
        (this as any)._tooltipLeader = leader;
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
        const key = parseInt(d.properties.kode).toString();
        setSelectedKey(key);
        setSelectedData(perKommune[key] ?? null);
      });

    // Draw Bornholm inset (bottom-right corner)
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

      const bKey   = parseInt(bornholmFeature.properties.kode).toString();
      const bKomm  = perKommune[bKey];
      const bLeader = bKomm ? getLeadingParty(bKomm.partier) : null;
      const bColor  = bLeader ? (PARTIES[bLeader.bogstav]?.color ?? NO_DATA_COLOR) : NO_DATA_COLOR;

      insetSvg.append("rect")
        .attr("width", IW).attr("height", IH)
        .attr("fill", "#1e293b")
        .attr("rx", 4);

      insetSvg.append("path")
        .datum(bornholmFeature)
        .attr("d", (d: any) => insetPath(d) ?? "")
        .attr("fill", bColor)
        .attr("fill-opacity", bKomm ? 0.85 : 1)
        .attr("stroke", STROKE_COLOR)
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", () => {
          setSelectedKey(bKey);
          setSelectedData(perKommune[bKey] ?? null);
        });

      insetSvg.append("text")
        .attr("x", IW / 2).attr("y", IH - 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "8")
        .attr("fill", "#9ca3af")
        .text("Bornholm");
    }
  }, [geojson, perKommune]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingGeo) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Indlæser kortdata...</p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Kortdata kunne ikke indlæses: {geoError}
      </div>
    );
  }

  const tooltipKommune = tooltip ? perKommune[tooltip.kommuneKey] : null;
  const tooltipLeader  = tooltipKommune ? getLeadingParty(tooltipKommune.partier) : null;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Map container */}
      <div className="relative">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ maxHeight: "700px" }}
        />

        {/* Bornholm inset */}
        <div className="absolute bottom-10 right-4 w-24 shadow-xl rounded overflow-hidden border border-white/10">
          <svg ref={insetRef} className="w-full" />
        </div>

        {/* No-data overlay */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Venter på data...</p>
              <p className="text-gray-400 text-sm mt-1">Kommunekortet opdateres, når optællingen begynder</p>
            </div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-30 pointer-events-none bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs max-w-[200px]"
            style={{
              left: Math.min(tooltip.x + 12, 500),
              top: tooltip.y - 8,
              transform: tooltip.x > 400 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="font-semibold text-white mb-0.5">{tooltip.navn}</div>
            {tooltipLeader ? (
              <div className="flex items-center gap-1.5 text-gray-300">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PARTIES[tooltipLeader.bogstav]?.color ?? "#888" }}
                />
                <span>{tooltipLeader.bogstav}: {tooltipLeader.stemmeProcent.toFixed(1)}%</span>
              </div>
            ) : (
              <div className="text-gray-500">Ikke optalt endnu</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400 px-1">
        <span className="font-medium text-gray-300 mr-1">Ledende parti:</span>
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

      {/* Detail panel modal */}
      {selectedKey !== null && (
        <KommuneDetailPanel
          kommuneKey={selectedKey}
          data={selectedData}
          onClose={() => { setSelectedKey(null); setSelectedData(null); }}
        />
      )}
    </div>
  );
}
