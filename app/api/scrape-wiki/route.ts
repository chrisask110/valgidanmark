import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

export const dynamic = "force-dynamic";

// ─── Config ───────────────────────────────────────────────────────────────────

const WIKI_PAGE   = "Meningsmålinger_forud_for_folketingsvalget_2026";
const WIKI_API    = `https://da.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext&format=json&formatversion=2`;
const CACHE_FILE  = "/tmp/wiki-polls-cache.json";
const ONE_HOUR_MS = 60 * 60 * 1000;

// Parties we want to include (matches PARTY_KEYS in data.ts)
const WANTED_PARTIES = new Set(["A", "B", "C", "F", "I", "M", "O", "V", "Æ", "Å", "Ø", "H"]);

// Aliases some Wikipedia tables use → our party key
const PARTY_ALIAS: Record<string, string> = {
  SF: "F", LA: "I", DD: "Æ", DF: "O", ALT: "Å", EL: "Ø", RV: "B", KF: "C", S: "A", BP: "H",
};

// Known institute name variants → canonical name
const INSTITUTE_MAP: [RegExp, string][] = [
  [/verian|kantar|gallup/i, "Verian"],
  [/epinion/i,              "Epinion"],
  [/megafon/i,              "Megafon"],
  [/voxmeter/i,             "Voxmeter"],
];

// Danish month names → zero-padded month number
const DA_MONTHS: Record<string, string> = {
  januar: "01", februar: "02", marts: "03", april: "04",
  maj: "05", juni: "06", juli: "07", august: "08",
  september: "09", oktober: "10", november: "11", december: "12",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WikiPoll {
  date: string;
  pollster: string;
  n: number;
  parties: Record<string, number | null>;
}

interface ScrapeResult {
  polls: WikiPoll[];
  cachedAt: string;
  totalFound: number;
  warnings: string[];
}

// ─── Wikitext cleaning helpers ────────────────────────────────────────────────

/** Strip all wiki/HTML markup and return plain text. */
function cleanCell(raw: string): string {
  let s = raw.trim();
  // Cell attributes: "style=... | content" — strip everything up to last lone |
  // A lone | is one not doubled (||). We detect: if there's = before the first |, it's an attr.
  if (/^[^|=]*=[^|]*\|[^|]/.test(s)) {
    s = s.replace(/^.*?\|(?!\|)/, "").trim();
  }
  // Remove <ref>...</ref> and self-closing refs
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<ref[^>]*\/>/gi, "");
  // Remove HTML tags (including <br />, <small>, etc.)
  s = s.replace(/<[^>]+>/g, " ");
  // {{party|X}} → X
  s = s.replace(/\{\{[Pp]arty\|([^|}]+)[^}]*\}\}/g, "$1");
  // {{Abbr|short|long}} → short
  s = s.replace(/\{\{[Aa]bbr\|([^|]+)\|[^}]+\}\}/g, "$1");
  // {{flagicon|...}} and other templates without useful content → ""
  s = s.replace(/\{\{[^}]*\}\}/g, "");
  // [[Page|Text]] → Text, [[Page]] → Page
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");
  s = s.replace(/\[\[([^\]]+)\]\]/g, "$1");
  // Bold/italic markup
  s = s.replace(/'{2,3}/g, "");
  // Normalize whitespace
  return s.replace(/\s+/g, " ").trim();
}

/** Convert Danish-formatted number string to float, or null if not a number. */
function parseDanishNumber(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Parse a Danish date string to ISO "YYYY-MM-DD", or null. */
function parseDanishDate(s: string): string | null {
  s = s.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // "29. januar 2026" or "29 januar 2026"
  const m1 = s.match(/^(\d{1,2})\.?\s+(\w+)\s+(\d{4})$/);
  if (m1) {
    const mm = DA_MONTHS[m1[2].toLowerCase()];
    if (mm) return `${m1[3]}-${mm}-${m1[1].padStart(2, "0")}`;
  }
  // "29/1/2026" or "29/1-2026" or "29-1-2026"
  const m2 = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-\s](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  return null;
}

/** Map a cleaned header string to a column role. */
function identifyColumn(h: string): "institute" | "date" | "n" | "party" | "skip" {
  const lo = h.toLowerCase();
  if (/^(institut|bureau|firma|company)/.test(lo)) return "institute";
  // Date: "offentliggjort", "dato", "publiceret", "published"
  if (/offentlig|^dato$|publiceret|published/.test(lo)) return "date";
  // Skip: fieldwork period, other dates
  if (/periode|field|forespørgs|int\.|intervju/.test(lo)) return "skip";
  // N / sample size
  if (/størrelse|stikprøve|^n$|antal|sample|respondent/.test(lo)) return "n";
  // Party letter
  const upper = h.trim().toUpperCase();
  if (WANTED_PARTIES.has(upper)) return "party";
  if (PARTY_ALIAS[upper]) return "party";
  return "skip";
}

/** Map a header to a canonical party key (or null). */
function headerToPartyKey(h: string): string | null {
  const upper = h.trim().toUpperCase();
  if (WANTED_PARTIES.has(upper)) return upper;
  return PARTY_ALIAS[upper] ?? null;
}

/** Map an institute string to a canonical pollster name, or null. */
function mapInstitute(s: string): string | null {
  for (const [re, name] of INSTITUTE_MAP) {
    if (re.test(s)) return name;
  }
  return null;
}

// ─── Wikitext table parser ────────────────────────────────────────────────────

interface ParsedTable {
  headers: string[];    // cleaned header strings
  rows: string[][];     // cleaned data cell strings
}

function parseWikiTables(wikitext: string): ParsedTable[] {
  const tables: ParsedTable[] = [];

  // Find each {| ... |} block (non-greedy, allowing nested braces in cell content)
  // We'll do a bracket-depth scan instead of regex to handle nested templates
  let i = 0;
  while (i < wikitext.length) {
    const start = wikitext.indexOf("{|", i);
    if (start === -1) break;
    // Find matching |}
    let depth = 1;
    let j = start + 2;
    while (j < wikitext.length && depth > 0) {
      if (wikitext[j] === "{" && wikitext[j + 1] === "|") { depth++; j += 2; }
      else if (wikitext[j] === "|" && wikitext[j + 1] === "}") { depth--; if (depth > 0) j += 2; else break; }
      else j++;
    }
    const tableText = wikitext.slice(start, j + 2);
    i = j + 2;

    const parsed = parseOneTable(tableText);
    if (parsed && parsed.headers.length > 0 && parsed.rows.length > 0) {
      tables.push(parsed);
    }
  }

  return tables;
}

function parseOneTable(tableText: string): ParsedTable | null {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Split into row-blocks by |- (with optional attributes after |-)
  const rowBlocks = tableText.split(/\n\s*\|-[^\n]*\n?/);

  for (const block of rowBlocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Determine block type by first meaningful line
    const firstLine = lines[0];
    if (firstLine.startsWith("{|") || firstLine.startsWith("|}") || firstLine.startsWith("|+")) continue;

    if (firstLine.startsWith("!")) {
      // Header block: cells separated by !! or on separate lines starting with !
      const cells: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("!")) continue;
        const parts = line.replace(/^!+/, "").split(/\s*!!\s*/);
        cells.push(...parts.map(cleanCell));
      }
      if (headers.length === 0 && cells.length > 0) {
        headers.push(...cells);
      }
    } else if (firstLine.startsWith("|")) {
      // Data block
      const cells: string[] = [];
      for (const line of lines) {
        if (!line.startsWith("|") || line.startsWith("|}") || line.startsWith("|+")) continue;
        const parts = line.replace(/^\|/, "").split(/\s*\|\|\s*/);
        cells.push(...parts.map(cleanCell));
      }
      if (cells.length > 0) rows.push(cells);
    }
  }

  return { headers, rows };
}

// ─── Poll extraction ──────────────────────────────────────────────────────────

function extractPolls(tables: ParsedTable[], warnings: string[]): WikiPoll[] {
  const polls: WikiPoll[] = [];

  for (const table of tables) {
    const { headers, rows } = table;

    // Build column mapping: index → role
    const colRoles: Array<"institute" | "date" | "n" | { party: string } | "skip"> = headers.map(h => {
      const role = identifyColumn(h);
      if (role === "party") {
        const pk = headerToPartyKey(h);
        return pk ? { party: pk } : "skip";
      }
      return role;
    });

    const hasInstitute = colRoles.some(r => r === "institute");
    const hasDate      = colRoles.some(r => r === "date");
    const hasParty     = colRoles.some(r => typeof r === "object");

    // Skip tables that don't look like poll tables
    if (!hasInstitute || !hasDate || !hasParty) continue;

    for (const row of rows) {
      let institute: string | null = null;
      let date: string | null = null;
      let n = 0;
      const parties: Record<string, number | null> = {};

      for (let ci = 0; ci < colRoles.length; ci++) {
        const cell = row[ci] ?? "";
        const role = colRoles[ci];
        if (role === "skip") continue;

        if (role === "institute") {
          institute = mapInstitute(cell);
        } else if (role === "date") {
          if (!date) date = parseDanishDate(cell); // use first date column found
        } else if (role === "n") {
          const num = parseDanishNumber(cell);
          n = num != null ? Math.round(num) : 0;
        } else if (typeof role === "object") {
          const val = cell === "" || /^[–\-−]$/.test(cell) ? null : parseDanishNumber(cell);
          // Only set if not already set (handle duplicate party columns)
          if (!(role.party in parties)) {
            parties[role.party] = val;
          }
        }
      }

      if (!institute || !date) {
        if (row.some(c => c.length > 0)) {
          warnings.push(`Skipped row (no institute or date): ${row.slice(0, 3).join(" | ")}`);
        }
        continue;
      }

      polls.push({ date, pollster: institute, n, parties });
    }
  }

  // Deduplicate (same date + pollster: keep latest occurrence in case of row spanning)
  const seen = new Map<string, WikiPoll>();
  for (const poll of polls) {
    seen.set(`${poll.date}|${poll.pollster}`, poll);
  }

  return Array.from(seen.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function loadCache(): ScrapeResult | null {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as ScrapeResult;
    if (Date.now() - new Date(raw.cachedAt).getTime() < ONE_HOUR_MS) return raw;
    return null;
  } catch { return null; }
}

function saveCache(result: ScrapeResult) {
  try { writeFileSync(CACHE_FILE, JSON.stringify(result)); } catch { /* no-op */ }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const forceRefresh = new URL(req.url).searchParams.has("refresh");

  // Return cache if fresh
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) return NextResponse.json({ ...cached, fromCache: true });
  }

  const warnings: string[] = [];

  try {
    const res = await fetch(WIKI_API, {
      headers: { "User-Agent": "valgidanmark/1.0 (https://valgidanmark.dk)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);

    const data = await res.json();
    const wikitext: string = data?.parse?.wikitext ?? "";
    if (!wikitext) throw new Error("No wikitext in response");

    const tables = parseWikiTables(wikitext);
    warnings.push(`Found ${tables.length} table(s) on the page`);

    const polls = extractPolls(tables, warnings);

    const result: ScrapeResult = {
      polls,
      cachedAt: new Date().toISOString(),
      totalFound: polls.length,
      warnings,
    };

    saveCache(result);
    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ polls: [], totalFound: 0, warnings: [msg], cachedAt: new Date().toISOString(), fromCache: false }, { status: 500 });
  }
}
