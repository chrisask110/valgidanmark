import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

export const dynamic = "force-dynamic";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_PAGE  = "Meningsmålinger_forud_for_folketingsvalget_2026";
const WIKI_API   = `https://da.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext&format=json&formatversion=2`;
const CACHE_FILE = "/tmp/wiki-polls-cache.json";
const ONE_HOUR   = 60 * 60 * 1000;

const WANTED_PARTIES = new Set(["A","B","C","F","I","M","O","V","Æ","Å","Ø","H"]);

const PARTY_ALIAS: Record<string, string> = {
  SF:"F", LA:"I", DD:"Æ", DF:"O", ALT:"Å", EL:"Ø", RV:"B", KF:"C", S:"A", BP:"H",
};

const INSTITUTE_MAP: [RegExp, string][] = [
  [/verian|kantar|gallup/i, "Verian"],
  [/epinion/i,              "Epinion"],
  [/megafon/i,              "Megafon"],
  [/voxmeter/i,             "Voxmeter"],
];

const DA_MONTHS: Record<string, string> = {
  januar:"01", februar:"02", marts:"03", april:"04",
  maj:"05", juni:"06", juli:"07", august:"08",
  september:"09", oktober:"10", november:"11", december:"12",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WikiPoll {
  date: string;
  pollster: string;
  n: number;
  parties: Record<string, number | null>;
}

type ColRole = "institute" | "date" | "n" | { party: string } | "skip";

interface ScrapeResult {
  polls: WikiPoll[];
  cachedAt: string;
  totalFound: number;
  warnings: string[];
}

// ─── Cell / text helpers ──────────────────────────────────────────────────────

function cleanCell(raw: string): string {
  let s = raw.trim();
  // Strip cell attributes: "style=... | content" → content
  if (/^[^|=]*=[^|]*\|[^|]/.test(s)) s = s.replace(/^.*?\|(?!\|)/, "").trim();
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<ref[^>]*\/>/gi, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\{\{[Pp]arty\|([^|}]+)[^}]*\}\}/g, "$1");
  s = s.replace(/\{\{[Aa]bbr\|([^|]+)\|[^}]+\}\}/g, "$1");
  s = s.replace(/\{\{[^}]*\}\}/g, "");
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  s = s.replace(/'{2,3}/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function parseDanishNumber(s: string): number | null {
  const c = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
}

function parseDanishDate(s: string, fallbackYear?: string): string | null {
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})\.?\s+(\w+)\s+(\d{4})$/);
  if (m1) { const mm = DA_MONTHS[m1[2].toLowerCase()]; if (mm) return `${m1[3]}-${mm}-${m1[1].padStart(2,"0")}`; }
  const m2 = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-\s](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`;
  // Try day+month without year using the section-heading year context
  if (fallbackYear) {
    const m3 = s.match(/^(\d{1,2})\.?\s+(\w+)$/);
    if (m3) { const mm = DA_MONTHS[m3[2].toLowerCase()]; if (mm) return `${fallbackYear}-${mm}-${m3[1].padStart(2,"0")}`; }
  }
  return null;
}

function metaRole(h: string): "institute" | "date" | "n" | null {
  const lo = h.toLowerCase();
  if (/institut|bureau|firma/.test(lo)) return "institute";
  if (/offentlig|^dato$|publiceret|published/.test(lo)) return "date";
  if (/størrelse|stikprøve|^n$|antal|sample/.test(lo)) return "n";
  return null;
}

function identifyColumn(h: string): ColRole {
  const mr = metaRole(h);
  if (mr) return mr;
  if (/periode|field|forespørgs/.test(h.toLowerCase())) return "skip";
  const upper = h.trim().toUpperCase();
  if (WANTED_PARTIES.has(upper)) return { party: upper };
  const alias = PARTY_ALIAS[upper];
  if (alias) return { party: alias };
  return "skip";
}

function mapInstitute(s: string): string | null {
  for (const [re, name] of INSTITUTE_MAP) if (re.test(s)) return name;
  return null;
}

// ─── Wikitext table parser ────────────────────────────────────────────────────

interface ParsedTable { headerRows: string[][]; rows: string[][]; fallbackYear?: string; }

/** Depth-scan to find {| ... |} blocks, then parse each. */
function parseWikiTables(wikitext: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  let i = 0;
  while (i < wikitext.length) {
    const start = wikitext.indexOf("{|", i);
    if (start === -1) break;
    let depth = 1, j = start + 2;
    while (j < wikitext.length && depth > 0) {
      if      (wikitext[j] === "{" && wikitext[j+1] === "|") { depth++; j += 2; }
      else if (wikitext[j] === "|" && wikitext[j+1] === "}") { depth--; if (depth > 0) j += 2; else break; }
      else j++;
    }
    // Find the most recent section heading containing a 4-digit year before this table
    const beforeTable = wikitext.slice(0, start);
    const yearMatches = [...beforeTable.matchAll(/^=+[^=\n]*?(\d{4})[^=\n]*?=+/gm)];
    const fallbackYear = yearMatches.length > 0 ? yearMatches[yearMatches.length - 1][1] : undefined;

    const t = parseOneTable(wikitext.slice(start, j + 2));
    if (t) { t.fallbackYear = fallbackYear; tables.push(t); }
    i = j + 2;
  }
  return tables;
}

function extractCells(line: string, delim: RegExp): string[] {
  return line.replace(/^[!|]+/, "").split(delim).map(cleanCell);
}

function parseOneTable(txt: string): ParsedTable | null {
  const headerRows: string[][] = [];
  const rows: string[][] = [];

  // Split into row-blocks by |-
  for (const block of txt.split(/\n\s*\|-[^\n]*\n?/)) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    if (first.startsWith("{|") || first.startsWith("|}") || first.startsWith("|+")) continue;

    if (first.startsWith("!")) {
      // Header block: cells separated by !! or each line starts with !
      const cells: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("!")) continue;
        cells.push(...extractCells(line, /\s*!!\s*/));
      }
      if (cells.length) headerRows.push(cells);
    } else if (first.startsWith("|")) {
      // Data block
      const cells: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("|") || line.startsWith("|}") || line.startsWith("|+")) continue;
        cells.push(...extractCells(line, /\s*\|\|\s*/));
      }
      if (cells.length) rows.push(cells);
    }
  }

  return (headerRows.length && rows.length) ? { headerRows, rows } : null;
}

// ─── Column map builder ───────────────────────────────────────────────────────

/**
 * Handles three common Wikipedia table structures:
 *
 * 1. Simple (single header row):
 *    ! Institut !! Dato !! Størrelse !! A !! F !! ...
 *
 * 2. Combined row + summary row (e.g. 2026 table):
 *    Row 1: ! Publiceret !! Analyseinstitut !! Størrelse !! A !! B !! ... !! Politiske blokke
 *    Row 2: ! Rød blok !! Blå blok !! ...  (bloc summaries — all "skip")
 *    → Row 1 has BOTH meta AND party cols, so use it directly.
 *
 * 3. Separate meta + party rows:
 *    Row 1: ! Institut !! Dato !! Størrelse !! Rød blok !! Blå blok
 *    Row 2: ! A !! F !! Ø !! B !! Å !! V !! I !! Æ !! C !! O !! M !! H
 *    → Row 1 has meta but no party; row 2 has party but no meta.
 */
function buildColumnMap(headerRows: string[][], warnings: string[]): ColRole[] {
  if (!headerRows.length) return [];

  // If just one row, map directly
  if (headerRows.length === 1) {
    return headerRows[0].map(h => identifyColumn(h));
  }

  // Case 2: a row that has BOTH meta cols AND party cols → use it directly
  for (const row of headerRows) {
    const hasMeta  = row.some(h => metaRole(h) !== null);
    const hasParty = row.some(h => { const r = identifyColumn(h); return typeof r === "object"; });
    if (hasMeta && hasParty) {
      warnings.push(`Combined meta+party header row: [${row.slice(0,8).join(", ")}...]`);
      return row.map(h => identifyColumn(h));
    }
  }

  // Case 3: find a meta-only row and a party-only row
  let metaRow: string[] | null = null;
  let partyRow: string[] | null = null;

  for (const row of headerRows) {
    const hasMeta  = row.some(h => metaRole(h) !== null);
    const hasParty = row.some(h => { const r = identifyColumn(h); return typeof r === "object"; });
    if (hasMeta && !hasParty && !metaRow)  metaRow  = row;
    if (hasParty && !partyRow)             partyRow = row;
  }

  // Fallback: use last header row
  if (!metaRow || !partyRow) {
    const combined = headerRows[headerRows.length - 1];
    warnings.push(`Could not find separate meta/party rows; using last header row: [${combined.slice(0,6).join(", ")}...]`);
    return combined.map(h => identifyColumn(h));
  }

  // Count how many meta (non-group-header) columns are in the meta row
  let partyBaseIdx = 0;
  const colMap: ColRole[] = [];

  for (const h of metaRow) {
    const r = metaRole(h);
    if (r) { colMap.push(r); partyBaseIdx++; }
    // Group headers like "Rød blok" → skip (they'll be replaced by party row)
  }

  for (const h of partyRow) {
    colMap.push(identifyColumn(h));
  }

  warnings.push(`Multi-level headers: ${partyBaseIdx} meta cols + ${partyRow.length} party cols = ${colMap.length} total`);
  return colMap;
}

// ─── Poll extraction ──────────────────────────────────────────────────────────

function extractPolls(tables: ParsedTable[], warnings: string[]): WikiPoll[] {
  const polls: WikiPoll[] = [];

  for (let ti = 0; ti < tables.length; ti++) {
    const { headerRows, rows, fallbackYear } = tables[ti];
    const colRoles = buildColumnMap(headerRows, warnings);

    const hasInstitute = colRoles.some(r => r === "institute");
    const hasDate      = colRoles.some(r => r === "date");
    const hasParty     = colRoles.some(r => typeof r === "object");

    if (!hasInstitute || !hasDate || !hasParty) {
      warnings.push(`Table ${ti+1}: skipped (no institute/date/party). Headers: [${headerRows.flat().slice(0,6).join(", ")}...]`);
      continue;
    }

    warnings.push(`Table ${ti+1}: using ${rows.length} data rows, col map: [${colRoles.slice(0,6).map(r => typeof r === "object" ? r.party : r).join(", ")}...]`);

    for (const row of rows) {
      let institute: string | null = null;
      let date: string | null      = null;
      let n = 0;
      const parties: Record<string, number | null> = {};

      for (let ci = 0; ci < colRoles.length; ci++) {
        const cell = row[ci] ?? "";
        const role = colRoles[ci];
        if (role === "skip") continue;

        if (role === "institute") {
          institute = institute ?? mapInstitute(cell);
        } else if (role === "date") {
          date = date ?? parseDanishDate(cell, fallbackYear);
        } else if (role === "n") {
          const num = parseDanishNumber(cell);
          if (num != null) n = Math.round(num);
        } else if (typeof role === "object") {
          if (!(role.party in parties)) {
            const isEmpty = cell === "" || /^[–\-−]$/.test(cell);
            parties[role.party] = isEmpty ? null : parseDanishNumber(cell);
          }
        }
      }

      if (!institute || !date) continue;
      polls.push({ date, pollster: institute, n, parties });
    }
  }

  // Deduplicate (same date+pollster: last one wins)
  const seen = new Map<string, WikiPoll>();
  for (const p of polls) seen.set(`${p.date}|${p.pollster}`, p);
  return Array.from(seen.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function loadCache(): ScrapeResult | null {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as ScrapeResult;
    return Date.now() - new Date(raw.cachedAt).getTime() < ONE_HOUR ? raw : null;
  } catch { return null; }
}

function saveCache(r: ScrapeResult) {
  try { writeFileSync(CACHE_FILE, JSON.stringify(r)); } catch { /* no-op */ }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  if (!new URL(req.url).searchParams.has("refresh")) {
    const cached = loadCache();
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const warnings: string[] = [];
  try {
    const res = await fetch(WIKI_API, {
      headers: { "User-Agent": "valgidanmark/1.0 (https://valgidanmark.dk)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
    const data = await res.json();
    const wikitext: string = data?.parse?.wikitext ?? "";
    if (!wikitext) throw new Error("Empty wikitext");

    const tables = parseWikiTables(wikitext);
    warnings.push(`Found ${tables.length} table(s)`);

    const polls = extractPolls(tables, warnings);
    const result: ScrapeResult = { polls, cachedAt: new Date().toISOString(), totalFound: polls.length, warnings };
    saveCache(result);
    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    return NextResponse.json(
      { polls: [], totalFound: 0, warnings: [String(err)], cachedAt: new Date().toISOString(), fromCache: false },
      { status: 500 }
    );
  }
}
