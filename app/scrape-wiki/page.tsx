"use client";

import { useEffect, useState } from "react";
import { PARTY_KEYS, PARTIES, FALLBACK_POLLS } from "@/app/lib/data";

// The parties we expect from the scraper (PARTY_KEYS already excludes FO/GL)
const DISPLAY_PARTIES: string[] = [...PARTY_KEYS];

interface WikiPoll {
  date: string;
  pollster: string;
  n: number;
  parties: Record<string, number | null>;
}

interface ScrapeResult {
  polls: WikiPoll[];
  totalFound: number;
  cachedAt: string;
  fromCache: boolean;
  warnings: string[];
}

function pctCell(val: number | null | undefined) {
  if (val == null) return (
    <td className="px-2 py-1 text-center text-[10px] text-muted-foreground/40 border-r border-border/30">—</td>
  );
  return (
    <td className="px-2 py-1 text-center text-[11px] font-mono tabular-nums border-r border-border/30">
      {val.toFixed(1)}
    </td>
  );
}

export default function ScrapeWikiPage() {
  const [result, setResult]   = useState<ScrapeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/scrape-wiki?refresh" : "/api/scrape-wiki";
      const res = await fetch(url);
      const data: ScrapeResult = await res.json();
      if (!res.ok) throw new Error(data.warnings?.[0] ?? "Unknown error");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Build a set of existing poll keys from FALLBACK_POLLS for comparison
  const existingKeys = new Set(FALLBACK_POLLS.map(p => `${p.date}|${p.pollster}`));

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold font-mono">Wikipedia Poll Scraper — Verifikation</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Data scraped from{" "}
            <a
              href="https://da.wikipedia.org/wiki/Meningsmålinger_forud_for_folketingsvalget_2026"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              da.wikipedia.org
            </a>
            {" "}· Ikke importeret til databasen endnu
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="text-xs font-mono px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {refreshing ? "Henter…" : "↺ Genindlæs fra Wikipedia"}
        </button>
      </div>

      {loading && (
        <div className="text-sm font-mono text-muted-foreground">Henter data fra Wikipedia…</div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-mono text-red-400">
          Fejl: {error}
        </div>
      )}

      {result && !loading && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-muted">
              {result.totalFound} målinger fundet
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted">
              {result.polls.filter(p => !existingKeys.has(`${p.date}|${p.pollster}`)).length} nye (ikke i nuværende datasæt)
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted">
              Scraped: {new Date(result.cachedAt).toLocaleString("da-DK")}
              {result.fromCache && " (cache)"}
            </span>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <details className="mb-4 text-xs font-mono text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                {result.warnings.length} parser-noter (klik for at udvide)
              </summary>
              <ul className="mt-2 space-y-0.5 ml-4 list-disc">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}

          {/* Legend */}
          <div className="flex gap-4 mb-3 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/40" />
              Ny måling (ikke i nuværende datasæt)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-muted" />
              Allerede i datasættet
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-mono text-[11px]">
                  <th className="px-3 py-2 text-left border-r border-border/50 sticky left-0 bg-muted/50">Dato</th>
                  <th className="px-3 py-2 text-left border-r border-border/50">Institut</th>
                  <th className="px-3 py-2 text-right border-r border-border/50">N</th>
                  {DISPLAY_PARTIES.map(pk => (
                    <th
                      key={pk}
                      className="px-2 py-2 text-center border-r border-border/30 min-w-[40px]"
                      style={{ color: PARTIES[pk]?.color }}
                    >
                      {pk}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.polls.map((poll, idx) => {
                  const isNew = !existingKeys.has(`${poll.date}|${poll.pollster}`);
                  return (
                    <tr
                      key={`${poll.date}|${poll.pollster}|${idx}`}
                      className={`border-t border-border/30 ${isNew ? "bg-green-500/5" : ""}`}
                    >
                      <td className={`px-3 py-1.5 font-mono tabular-nums border-r border-border/50 sticky left-0 ${isNew ? "bg-green-500/5" : "bg-background"}`}>
                        <span className="flex items-center gap-1.5">
                          {isNew && (
                            <span className="text-[9px] px-1 rounded bg-green-500/20 text-green-400 font-semibold">NY</span>
                          )}
                          {poll.date}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 border-r border-border/50">{poll.pollster}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums border-r border-border/50 text-muted-foreground">
                        {poll.n === 0 ? "NA" : poll.n.toLocaleString("da-DK")}
                      </td>
                      {DISPLAY_PARTIES.map(pk => pctCell(poll.parties[pk]))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.polls.length === 0 && (
            <div className="mt-6 text-sm font-mono text-muted-foreground text-center">
              Ingen målinger fundet — tjek parser-noterne ovenfor.
            </div>
          )}
        </>
      )}
    </main>
  );
}
