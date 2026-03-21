require("dotenv").config();

import { neon } from "@neondatabase/serverless";

// ---------------------------------------------------------------------------
// Hardcoded national 2022 fallback
// ---------------------------------------------------------------------------

const NATIONAL_2022 = [
  { bogstav: "A", navn: "Socialdemokratiet",     stemmer: 895159, stemmePct: 27.5, mandater: 50 },
  { bogstav: "V", navn: "Venstre",               stemmer: 432721, stemmePct: 13.3, mandater: 23 },
  { bogstav: "M", navn: "Moderaterne",           stemmer: 302453, stemmePct:  9.3, mandater: 16 },
  { bogstav: "Æ", navn: "Danmarksdemokraterne",  stemmer: 263371, stemmePct:  8.1, mandater: 14 },
  { bogstav: "F", navn: "SF",                    stemmer: 269871, stemmePct:  8.3, mandater: 15 },
  { bogstav: "I", navn: "Liberal Alliance",      stemmer: 256920, stemmePct:  7.9, mandater: 14 },
  { bogstav: "C", navn: "Konservative",          stemmer: 178875, stemmePct:  5.5, mandater: 10 },
  { bogstav: "Ø", navn: "Enhedslisten",          stemmer: 172362, stemmePct:  5.3, mandater:  9 },
  { bogstav: "D", navn: "Nye Borgerlige",        stemmer: 120295, stemmePct:  3.7, mandater:  6 },
  { bogstav: "B", navn: "Radikale Venstre",      stemmer: 120279, stemmePct:  3.7, mandater:  7 },
  { bogstav: "Å", navn: "Alternativet",          stemmer: 107297, stemmePct:  3.3, mandater:  6 },
  { bogstav: "O", navn: "Dansk Folkeparti",      stemmer:  84566, stemmePct:  2.6, mandater:  5 },
  { bogstav: "Q", navn: "Frie Grønne",           stemmer:  29284, stemmePct:  0.9, mandater:  0 },
];

// ---------------------------------------------------------------------------
// Statistikbanken API types
// ---------------------------------------------------------------------------

interface StatbankVariable {
  id: string;
  text: string;
  values: Array<{ id: string; text: string }>;
}

interface StatbankTableInfo {
  variables: StatbankVariable[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[${new Date().toISOString()}] WARN: ${msg}`);
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Statistikbanken: fetch table info
// ---------------------------------------------------------------------------

async function fetchTableInfo(table: string): Promise<StatbankTableInfo | null> {
  try {
    log(`Fetching table info for ${table}...`);
    const info = await postJSON<StatbankTableInfo>(
      "https://api.statbank.dk/v1/tableinfo",
      { table, format: "JSON" }
    );
    log(`Table ${table} variables: ${info.variables.map((v) => v.id).join(", ")}`);
    return info;
  } catch (err) {
    warn(`Could not fetch table info for ${table}: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Statistikbanken: fetch CSV data
// ---------------------------------------------------------------------------

interface StorkredsCsvRow {
  kreds: string;
  kredsNavn: string;
  parti: string;
  partiNavn: string;
  stemmer: number;
}

async function fetchStorkredsCsv(): Promise<StorkredsCsvRow[] | null> {
  // Try FVKOMI (kommuner) first, fall back to FV22KREDS
  const tables = ["FVKOMI", "FV22KREDS"];

  for (const table of tables) {
    const info = await fetchTableInfo(table);
    if (!info) continue;

    const varIds = info.variables.map((v) => v.id.toUpperCase());
    log(`Table ${table} variable IDs: ${varIds.join(", ")}`);

    // We need at least a geography variable, a party variable, and a votes variable
    // Try to identify them by common names
    const geoVar = info.variables.find((v) =>
      ["KREDS", "STORKREDS", "KOMMUNE", "OMRÅDE"].includes(v.id.toUpperCase())
    );
    const partiVar = info.variables.find((v) =>
      ["PARTI", "PARTY"].includes(v.id.toUpperCase())
    );
    const stemVar = info.variables.find((v) =>
      ["STEM", "STEMMER", "VOTES"].includes(v.id.toUpperCase())
    );

    if (!geoVar || !partiVar || !stemVar) {
      warn(
        `Table ${table}: could not identify required variables ` +
          `(geo=${geoVar?.id}, parti=${partiVar?.id}, stem=${stemVar?.id})`
      );
      continue;
    }

    log(
      `Using table ${table}: geo=${geoVar.id}, parti=${partiVar.id}, stemmer=${stemVar.id}`
    );

    try {
      const csvText = await postJSON<string>(
        "https://api.statbank.dk/v1/data",
        {
          table,
          format: "CSV",
          delimiter: ";",
          variables: [
            { code: geoVar.id, values: ["*"] },
            { code: partiVar.id, values: ["*"] },
            { code: stemVar.id, values: ["*"] },
          ],
        }
      );

      if (typeof csvText !== "string") {
        warn(`Table ${table}: expected CSV string, got ${typeof csvText}`);
        continue;
      }

      const rows = parseCsv(csvText, geoVar.id, partiVar.id, stemVar.id);
      if (rows.length > 0) {
        log(`Table ${table}: parsed ${rows.length} rows`);
        return rows;
      }
      warn(`Table ${table}: parsed 0 rows`);
    } catch (err) {
      warn(`Table ${table} data fetch failed: ${(err as Error).message}`);
    }
  }

  return null;
}

function parseCsv(
  csv: string,
  geoCol: string,
  partiCol: string,
  stemCol: string
): StorkredsCsvRow[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(";").map((h) => h.replace(/"/g, "").toUpperCase());
  const geoIdx = headers.indexOf(geoCol.toUpperCase());
  const partiIdx = headers.indexOf(partiCol.toUpperCase());
  const stemIdx = headers.indexOf(stemCol.toUpperCase());

  if (geoIdx === -1 || partiIdx === -1 || stemIdx === -1) {
    warn(
      `CSV header mismatch. Headers: ${headers.join(", ")} | ` +
        `Looking for: ${geoCol}, ${partiCol}, ${stemCol}`
    );
    return [];
  }

  const rows: StorkredsCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/"/g, ""));
    if (cols.length <= Math.max(geoIdx, partiIdx, stemIdx)) continue;

    const stemmerStr = cols[stemIdx].replace(/\s/g, "").replace(",", ".");
    const stemmer = parseInt(stemmerStr, 10);
    if (isNaN(stemmer)) continue;

    rows.push({
      kreds: cols[geoIdx],
      kredsNavn: cols[geoIdx], // same for now; name lookup would need extra API call
      parti: cols[partiIdx],
      partiNavn: cols[partiIdx],
      stemmer,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

async function createTable(sql: ReturnType<typeof neon>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS election_results_2022 (
      id SERIAL PRIMARY KEY,
      niveau TEXT NOT NULL,
      omraade TEXT NOT NULL,
      omraade_kode TEXT,
      parti_bogstav TEXT NOT NULL,
      parti_navn TEXT NOT NULL,
      stemmer INTEGER NOT NULL,
      stemmer_pct NUMERIC(5,2),
      mandater INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  log("Table election_results_2022 ensured.");
}

async function countExistingRows(sql: ReturnType<typeof neon>): Promise<number> {
  const result = await sql`SELECT COUNT(*)::int AS cnt FROM election_results_2022`;
  return (result[0] as { cnt: number }).cnt;
}

async function clearTable(sql: ReturnType<typeof neon>): Promise<void> {
  await sql`DELETE FROM election_results_2022`;
  log("Cleared existing data from election_results_2022.");
}

async function insertNationalData(sql: ReturnType<typeof neon>): Promise<void> {
  log("Inserting national 2022 results...");
  for (const row of NATIONAL_2022) {
    await sql`
      INSERT INTO election_results_2022
        (niveau, omraade, omraade_kode, parti_bogstav, parti_navn, stemmer, stemmer_pct, mandater)
      VALUES
        ('national', 'national', NULL, ${row.bogstav}, ${row.navn}, ${row.stemmer}, ${row.stemmePct}, ${row.mandater})
    `;
  }
  log(`Inserted ${NATIONAL_2022.length} national rows.`);
}

async function insertStorkredsCsvData(
  sql: ReturnType<typeof neon>,
  rows: StorkredsCsvRow[]
): Promise<void> {
  log(`Inserting ${rows.length} storkreds/kommune rows from Statistikbanken...`);
  let inserted = 0;
  for (const row of rows) {
    await sql`
      INSERT INTO election_results_2022
        (niveau, omraade, omraade_kode, parti_bogstav, parti_navn, stemmer, stemmer_pct, mandater)
      VALUES
        ('storkreds', ${row.kredsNavn}, ${row.kreds}, ${row.parti}, ${row.partiNavn}, ${row.stemmer}, NULL, NULL)
    `;
    inserted++;
  }
  log(`Inserted ${inserted} storkreds rows.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  const sql = neon(dbUrl);

  await createTable(sql);

  const existing = await countExistingRows(sql);
  if (existing > 0 && !force) {
    log(
      `Table already has ${existing} rows. Use --force to re-import. Exiting.`
    );
    return;
  }

  if (existing > 0 && force) {
    await clearTable(sql);
  }

  // Always insert national data
  await insertNationalData(sql);

  // Attempt to fetch storkreds data from Statistikbanken
  log("Attempting to fetch storkreds data from Statistikbanken...");
  const storkredsCsvRows = await fetchStorkredsCsv();

  if (storkredsCsvRows && storkredsCsvRows.length > 0) {
    await insertStorkredsCsvData(sql, storkredsCsvRows);
  } else {
    warn(
      "Could not fetch storkreds data from Statistikbanken. " +
        "Only national data was inserted."
    );
  }

  const finalCount = await countExistingRows(sql);
  log(`Import complete. Total rows in election_results_2022: ${finalCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
