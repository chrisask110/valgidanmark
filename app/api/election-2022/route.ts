import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Hardcoded fallback — always works even before import script is run
// ---------------------------------------------------------------------------

const NATIONAL_2022 = [
  { bogstav: "A", navn: "Socialdemokratiet",    stemmer: 895159, stemmePct: 27.5, mandater: 50 },
  { bogstav: "V", navn: "Venstre",              stemmer: 432721, stemmePct: 13.3, mandater: 23 },
  { bogstav: "M", navn: "Moderaterne",          stemmer: 302453, stemmePct:  9.3, mandater: 16 },
  { bogstav: "Æ", navn: "Danmarksdemokraterne", stemmer: 263371, stemmePct:  8.1, mandater: 14 },
  { bogstav: "F", navn: "SF",                   stemmer: 269871, stemmePct:  8.3, mandater: 15 },
  { bogstav: "I", navn: "Liberal Alliance",     stemmer: 256920, stemmePct:  7.9, mandater: 14 },
  { bogstav: "C", navn: "Konservative",         stemmer: 178875, stemmePct:  5.5, mandater: 10 },
  { bogstav: "Ø", navn: "Enhedslisten",         stemmer: 172362, stemmePct:  5.3, mandater:  9 },
  { bogstav: "D", navn: "Nye Borgerlige",       stemmer: 120295, stemmePct:  3.7, mandater:  6 },
  { bogstav: "B", navn: "Radikale Venstre",     stemmer: 120279, stemmePct:  3.7, mandater:  7 },
  { bogstav: "Å", navn: "Alternativet",         stemmer: 107297, stemmePct:  3.3, mandater:  6 },
  { bogstav: "O", navn: "Dansk Folkeparti",     stemmer:  84566, stemmePct:  2.6, mandater:  5 },
  { bogstav: "Q", navn: "Frie Grønne",          stemmer:  29284, stemmePct:  0.9, mandater:  0 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartiResult2022 {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmePct: number;
  mandater: number | null;
}

interface DbRow {
  parti_bogstav: string;
  parti_navn: string;
  stemmer: number;
  stemmer_pct: string | number | null;
  mandater: number | null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET() {
  let national: PartiResult2022[] = [];
  let source: "neon" | "hardcoded" = "hardcoded";
  let updatedAt: string = new Date().toISOString();

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT parti_bogstav, parti_navn, stemmer, stemmer_pct, mandater
        FROM election_results_2022
        WHERE niveau = 'national'
        ORDER BY stemmer DESC
      ` as DbRow[];

      if (rows.length > 0) {
        national = rows.map((row) => ({
          bogstav: row.parti_bogstav,
          navn: row.parti_navn,
          stemmer: Number(row.stemmer),
          stemmePct: row.stemmer_pct != null ? Number(row.stemmer_pct) : 0,
          mandater: row.mandater != null ? Number(row.mandater) : null,
        }));
        source = "neon";
        updatedAt = new Date().toISOString();
      }
    } catch (err) {
      console.error("[election-2022] DB error, falling back to hardcoded:", err);
    }
  }

  if (source === "hardcoded") {
    national = NATIONAL_2022.map((row) => ({
      bogstav: row.bogstav,
      navn: row.navn,
      stemmer: row.stemmer,
      stemmePct: row.stemmePct,
      mandater: row.mandater,
    }));
  }

  return NextResponse.json(
    { national, source, updatedAt },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600",
      },
    }
  );
}
