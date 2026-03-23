import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Parse .env.local
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = match?.[1];
if (!dbUrl) { console.error('No DATABASE_URL found'); process.exit(1); }

// Load compiled data — read the TS file and extract the array
// Since we can't import TS directly in .mjs, parse it as text
const tsContent = readFileSync(new URL('../lib/data-2022-kommuner.ts', import.meta.url), 'utf8');
// Extract the array by eval-ing a stripped version
const arrayMatch = tsContent.match(/export const KOMMUNER_2022[^=]+=\s*(\[[\s\S]+\]);/);
if (!arrayMatch) { console.error('Could not extract KOMMUNER_2022 array'); process.exit(1); }
const KOMMUNER_2022 = eval(arrayMatch[1]);

const sql = neon(dbUrl);

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
        ${kommune.kommunekode}, ${kommune.kommune_navn}, ${kommune.storkreds},
        ${parti.bogstav}, ${parti.navn}, ${parti.stemmer}, ${parti.stemmePct}
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
console.log(`Seeded ${inserted} rows across ${KOMMUNER_2022.length} kommuner`);
