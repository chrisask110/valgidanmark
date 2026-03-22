import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { KOMMUNER_2022, getWinner2022 } from "@/lib/data-2022-kommuner";

export const dynamic = "force-dynamic";

export interface Kommune2022Summary {
  kommunekode: string;
  kommune_navn: string;
  storkreds: string;
  winner: string;
  partier: { bogstav: string; navn: string; stemmePct: number }[];
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT kommunekode, kommune_navn, storkreds, parti_bogstav, parti_navn, stemmer_pct
        FROM election_results_2022_kommune
        ORDER BY kommunekode, stemmer_pct DESC
      ` as { kommunekode: string; kommune_navn: string; storkreds: string; parti_bogstav: string; parti_navn: string; stemmer_pct: string }[];

      if (rows.length > 0) {
        const map: Record<string, Kommune2022Summary> = {};
        for (const row of rows) {
          if (!map[row.kommunekode]) {
            map[row.kommunekode] = {
              kommunekode: row.kommunekode,
              kommune_navn: row.kommune_navn,
              storkreds: row.storkreds ?? "",
              winner: row.parti_bogstav,
              partier: [],
            };
          }
          map[row.kommunekode].partier.push({
            bogstav: row.parti_bogstav,
            navn: row.parti_navn,
            stemmePct: row.stemmer_pct != null ? Number(row.stemmer_pct) : 0,
          });
        }
        // Winner is already set to the first row (highest pct due to ORDER BY)
        return NextResponse.json(map, {
          headers: { "Cache-Control": "public, s-maxage=3600" },
        });
      }
    } catch (err) {
      console.error("[election-2022-kommuner] DB error, falling back to hardcoded:", err);
    }
  }

  // Hardcoded fallback
  const map: Record<string, Kommune2022Summary> = {};
  for (const k of KOMMUNER_2022) {
    map[k.kommunekode] = {
      kommunekode: k.kommunekode,
      kommune_navn: k.kommune_navn,
      storkreds: k.storkreds,
      winner: getWinner2022(k),
      partier: k.partier.map((p) => ({ bogstav: p.bogstav, navn: p.navn, stemmePct: p.stemmePct })),
    };
  }

  return NextResponse.json(map, {
    headers: { "Cache-Control": "public, s-maxage=3600" },
  });
}
