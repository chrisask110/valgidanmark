"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface AggregatedResults {
  perStorkreds: Record<string, any>;
  perKommune: Record<string, KommuneData>;
  optaltProcent: number;
  optalteAfstemningsomraader: number;
  totalAfstemningsomraader: number;
}

interface Kommune2022Summary {
  kommunekode: string;
  kommune_navn: string;
  storkreds: string;
  winner: string;
  partier: { bogstav: string; navn: string; stemmePct: number }[];
}

interface ResultsTableProps {
  results: AggregatedResults | null;
  results2022Kommuner: Record<string, Kommune2022Summary>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  A: "#C8102E", F: "#E4007C", V: "#254B8E", I: "#00B0CA",
  Æ: "#005F6B", C: "#00583C", Ø: "#991B1E", B: "#733280",
  O: "#E4B828", Å: "#2ECC71", M: "#8B5CF6", H: "#0084FF",
  D: "#1d4ed8",
};

const STORKREDSE_ORDER = [
  "Københavns Storkreds",
  "Københavns Omegns Storkreds",
  "Nordsjællands Storkreds",
  "Bornholms Storkreds",
  "Sjællands Storkreds",
  "Fyns Storkreds",
  "Sydjyllands Storkreds",
  "Østjyllands Storkreds",
  "Vestjyllands Storkreds",
  "Nordjyllands Storkreds",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLeadingParty(partier: Array<{ bogstav: string; stemmeProcent: number }>) {
  if (!partier || partier.length === 0) return null;
  return [...partier].sort((a, b) => b.stemmeProcent - a.stemmeProcent)[0];
}

function PartyDot({ bogstav }: { bogstav: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: PARTY_COLORS[bogstav] ?? "#888" }}
      />
      <span className="font-bold text-xs" style={{ color: PARTY_COLORS[bogstav] ?? "#888" }}>
        {bogstav}
      </span>
    </span>
  );
}

// Top N parties as mini badges
function TopParties({ partier, max = 4 }: { partier: Array<{ bogstav: string; stemmeProcent?: number; stemmePct?: number }>; max?: number }) {
  const sorted = [...partier]
    .sort((a, b) => (b.stemmeProcent ?? b.stemmePct ?? 0) - (a.stemmeProcent ?? a.stemmePct ?? 0))
    .slice(0, max);
  return (
    <div className="flex gap-2 flex-wrap">
      {sorted.map((p) => {
        const pct = p.stemmeProcent ?? p.stemmePct ?? 0;
        return (
          <span key={p.bogstav} className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <span className="font-semibold" style={{ color: PARTY_COLORS[p.bogstav] ?? "#888" }}>
              {p.bogstav}
            </span>
            <span>{pct.toFixed(1)}%</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Afstemningssted Row ──────────────────────────────────────────────────────

function AfstemningsstedRow({ omr }: { omr: AfstemningsomraadeResult }) {
  const isOptalt = omr.resultatart?.toLowerCase().includes("optalt") || omr.afgivneStemmer > 0;
  const leader = getLeadingParty(omr.partier);

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      <td className="py-1.5 pl-10 pr-2 text-xs text-muted-foreground">
        <span className="mr-1 opacity-40">·</span>
        {omr.navn}
      </td>
      <td className="py-1.5 px-2 text-xs">
        {isOptalt ? (
          <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
            Optalt
          </span>
        ) : (
          <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px]">
            Afventer
          </span>
        )}
      </td>
      <td className="py-1.5 px-2 text-xs">
        {leader ? <PartyDot bogstav={leader.bogstav} /> : <span className="text-muted-foreground">–</span>}
      </td>
      <td className="py-1.5 px-2 text-xs hidden md:table-cell">
        {omr.partier.length > 0 && <TopParties partier={omr.partier} max={3} />}
      </td>
    </tr>
  );
}

// ─── Kommune Row ──────────────────────────────────────────────────────────────

function KommuneRow({
  kommuneKey,
  liveData,
  data2022,
  hasLive,
}: {
  kommuneKey: string;
  liveData: KommuneData | undefined;
  data2022: Kommune2022Summary | undefined;
  hasLive: boolean;
}) {
  const [open, setOpen] = useState(false);

  const navn = liveData?.navn ?? data2022?.kommune_navn ?? kommuneKey;
  const storkreds = liveData?.storkreds ?? data2022?.storkreds ?? "";
  const partier = liveData?.partier ?? [];
  const partier2022 = data2022?.partier ?? [];
  const liveLeader = getLeadingParty(partier);
  const leader2022 = data2022?.winner;
  const leaderBogstav = liveLeader?.bogstav ?? (hasLive ? null : leader2022);
  const optalte = liveData?.optalteAfstemningsomraader ?? 0;
  const afstemninger = liveData?.afstemningsomraader ?? [];

  const canExpand = hasLive && afstemninger.length > 0;

  return (
    <>
      <tr
        className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${canExpand ? "cursor-pointer" : ""}`}
        onClick={canExpand ? () => setOpen((o) => !o) : undefined}
      >
        <td className="py-2 pl-6 pr-2 text-sm">
          <div className="flex items-center gap-1">
            {canExpand && (
              <span className="text-muted-foreground text-xs w-3">{open ? "▾" : "▸"}</span>
            )}
            {!canExpand && <span className="w-3" />}
            <span className="font-medium">{navn}</span>
          </div>
          <div className="text-[10px] text-muted-foreground pl-4">{storkreds}</div>
        </td>
        <td className="py-2 px-2 text-sm">
          {leaderBogstav ? (
            <PartyDot bogstav={leaderBogstav} />
          ) : (
            <span className="text-muted-foreground text-xs">–</span>
          )}
        </td>
        <td className="py-2 px-2 text-xs hidden sm:table-cell">
          {hasLive && partier.length > 0 ? (
            <TopParties partier={partier} max={4} />
          ) : !hasLive && partier2022.length > 0 ? (
            <TopParties partier={partier2022} max={4} />
          ) : (
            <span className="text-muted-foreground">–</span>
          )}
        </td>
        <td className="py-2 px-2 text-xs text-right text-muted-foreground whitespace-nowrap">
          {hasLive
            ? optalte > 0 ? `${optalte} omr.` : "–"
            : <span className="text-[10px]">2022</span>
          }
        </td>
      </tr>
      {open && afstemninger.map((omr) => (
        <AfstemningsstedRow key={omr.nummer} omr={omr} />
      ))}
    </>
  );
}

// ─── Storkreds Row ────────────────────────────────────────────────────────────

function StorkredsRow({
  storkreds,
  kommuneKeys,
  liveKommuner,
  kommuner2022,
  hasLive,
}: {
  storkreds: string;
  kommuneKeys: string[];
  liveKommuner: Record<string, KommuneData>;
  kommuner2022: Record<string, Kommune2022Summary>;
  hasLive: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Aggregate live data for this storkreds
  const liveData = kommuneKeys.map((k) => liveKommuner[k]).filter(Boolean);
  const allPartier: Record<string, { stemmer: number; stemmerTotal: number }> = {};
  let optalteOmr = 0;

  for (const k of liveData) {
    for (const p of k.partier) {
      if (!allPartier[p.bogstav]) allPartier[p.bogstav] = { stemmer: 0, stemmerTotal: 0 };
      allPartier[p.bogstav].stemmer += p.stemmer;
    }
    optalteOmr += k.optalteAfstemningsomraader;
  }

  // Calculate percentages from aggregated stems
  const totalStemmer = Object.values(allPartier).reduce((s, p) => s + p.stemmer, 0);
  const aggregatedPartier = Object.entries(allPartier).map(([bogstav, data]) => ({
    bogstav,
    stemmeProcent: totalStemmer > 0 ? (data.stemmer / totalStemmer) * 100 : 0,
  }));

  const liveLeader = hasLive && aggregatedPartier.length > 0 ? getLeadingParty(aggregatedPartier) : null;

  // 2022 fallback: most common winner in storkreds
  const winners2022 = kommuneKeys.map((k) => kommuner2022[k]?.winner).filter(Boolean) as string[];
  const winnerCount: Record<string, number> = {};
  for (const w of winners2022) winnerCount[w] = (winnerCount[w] ?? 0) + 1;
  const leader2022 = Object.entries(winnerCount).sort(([, a], [, b]) => b - a)[0]?.[0];

  const leaderBogstav = liveLeader?.bogstav ?? (hasLive ? null : leader2022);

  return (
    <>
      <tr
        className="border-b border-border/50 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="py-2.5 px-3 text-sm font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs w-3">{open ? "▾" : "▸"}</span>
            {storkreds}
          </div>
        </td>
        <td className="py-2.5 px-2 text-sm">
          {leaderBogstav ? (
            <PartyDot bogstav={leaderBogstav} />
          ) : (
            <span className="text-muted-foreground text-xs">–</span>
          )}
        </td>
        <td className="py-2.5 px-2 text-xs hidden sm:table-cell">
          {hasLive && aggregatedPartier.length > 0 ? (
            <TopParties partier={aggregatedPartier} max={4} />
          ) : !hasLive ? (
            <span className="text-muted-foreground text-xs">{kommuneKeys.length} kommuner</span>
          ) : (
            <span className="text-muted-foreground">–</span>
          )}
        </td>
        <td className="py-2.5 px-2 text-xs text-right text-muted-foreground whitespace-nowrap">
          {hasLive
            ? optalteOmr > 0 ? `${optalteOmr} omr.` : "–"
            : <span className="text-[10px]">2022</span>
          }
        </td>
      </tr>
      {open && kommuneKeys.map((kKey) => (
        <KommuneRow
          key={kKey}
          kommuneKey={kKey}
          liveData={liveKommuner[kKey]}
          data2022={kommuner2022[kKey]}
          hasLive={hasLive}
        />
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsTable({ results, results2022Kommuner }: ResultsTableProps) {
  const hasLive = results !== null && results.optalteAfstemningsomraader > 0;

  // Build storkreds → kommuneKeys mapping
  // Use 2022 data for structure (available always), supplemented by live keys
  const storkredsMap: Record<string, Set<string>> = {};

  // Add all 2022 kommuner to their storkreds
  for (const [kode, k] of Object.entries(results2022Kommuner)) {
    const sk = k.storkreds;
    if (!storkredsMap[sk]) storkredsMap[sk] = new Set();
    storkredsMap[sk].add(kode);
  }

  // Also add any live kommuner not in 2022 data (shouldn't happen but be safe)
  if (results) {
    for (const [kode, k] of Object.entries(results.perKommune)) {
      const sk = k.storkreds;
      if (sk) {
        if (!storkredsMap[sk]) storkredsMap[sk] = new Set();
        storkredsMap[sk].add(kode);
      }
    }
  }

  // Order storkredse
  const orderedStorkredse = [
    ...STORKREDSE_ORDER.filter((s) => storkredsMap[s]),
    ...Object.keys(storkredsMap).filter((s) => !STORKREDSE_ORDER.includes(s)),
  ];

  if (orderedStorkredse.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {hasLive ? "Resultater per område" : "Resultater 2022 per storkreds"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {hasLive
            ? "Klik på en storkreds for at se kommuner · Klik på en kommune for afstemningssteder"
            : "Klik på en storkreds for at se kommunerne · Viser 2022-resultater"}
        </p>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">Område</th>
                <th className="py-2 px-2 text-left font-medium">Ledende</th>
                <th className="py-2 px-2 text-left font-medium hidden sm:table-cell">Partier</th>
                <th className="py-2 px-2 text-right font-medium">Optalt</th>
              </tr>
            </thead>
            <tbody>
              {orderedStorkredse.map((sk) => (
                <StorkredsRow
                  key={sk}
                  storkreds={sk}
                  kommuneKeys={Array.from(storkredsMap[sk])}
                  liveKommuner={results?.perKommune ?? {}}
                  kommuner2022={results2022Kommuner}
                  hasLive={hasLive}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
