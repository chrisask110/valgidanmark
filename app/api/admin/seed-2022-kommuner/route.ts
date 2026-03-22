import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { KOMMUNER_2022 } from "@/lib/data-2022-kommuner";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? req.headers.get("x-api-key");
  if (!key || key !== process.env.VALGDAG_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "No DATABASE_URL configured" }, { status: 500 });
  }

  const sql = neon(dbUrl);

  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS election_results_2022_kommune (
      kommunekode   VARCHAR(10)    NOT NULL,
      kommune_navn  VARCHAR(100)   NOT NULL,
      storkreds     VARCHAR(100),
      parti_bogstav VARCHAR(5)     NOT NULL,
      parti_navn    VARCHAR(100)   NOT NULL,
      stemmer       INTEGER        NOT NULL DEFAULT 0,
      stemmer_pct   NUMERIC(6,2),
      PRIMARY KEY (kommunekode, parti_bogstav)
    )
  `;

  let inserted = 0;

  for (const kommune of KOMMUNER_2022) {
    for (const parti of kommune.partier) {
      await sql`
        INSERT INTO election_results_2022_kommune
          (kommunekode, kommune_navn, storkreds, parti_bogstav, parti_navn, stemmer, stemmer_pct)
        VALUES (
          ${kommune.kommunekode},
          ${kommune.kommune_navn},
          ${kommune.storkreds},
          ${parti.bogstav},
          ${parti.navn},
          ${parti.stemmer},
          ${parti.stemmePct}
        )
        ON CONFLICT (kommunekode, parti_bogstav) DO UPDATE SET
          kommune_navn  = EXCLUDED.kommune_navn,
          storkreds     = EXCLUDED.storkreds,
          parti_navn    = EXCLUDED.parti_navn,
          stemmer       = EXCLUDED.stemmer,
          stemmer_pct   = EXCLUDED.stemmer_pct
      `;
      inserted++;
    }
  }

  return NextResponse.json({
    ok: true,
    kommuner: KOMMUNER_2022.length,
    rows: inserted,
  });
}
