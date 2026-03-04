/**
 * Neon Postgres helpers.
 *
 * Requires DATABASE_URL set automatically when you link a Neon database in Vercel.
 * Run lib/schema.sql once in the Neon dashboard to create the table.
 */

import { neon } from "@neondatabase/serverless";
import { FALLBACK_POLLS, type Poll } from "@/app/lib/data";

// Lazy — created on first use so build-time evaluation doesn't throw
let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DBPoll = {
  id: number;
  date: string;
  pollster: string;
  n: number;
  parties: Record<string, number>;
  source_url: string | null;
  created_at: string;
};

// ─── Row → Poll mapper ────────────────────────────────────────────────────────

function rowToPoll(row: any): Poll {
  const parties: Record<string, number> =
    typeof row.parties === "string" ? JSON.parse(row.parties) : row.parties ?? {};
  const dateStr: string =
    row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date).slice(0, 10);
  return { date: dateStr, pollster: String(row.pollster), n: Number(row.n), ...parties };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch all polls from the DB, newest first.  Falls back to FALLBACK_POLLS. */
export async function getPolls(): Promise<Poll[]> {
  try {
    const rows = await sql()`
      SELECT date, pollster, n, parties
      FROM polls
      ORDER BY date DESC
      LIMIT 500
    `;
    if (rows.length === 0) return mergeFallback([]);
    return mergeFallback(rows.map(rowToPoll));
  } catch (err) {
    console.error("[db] getPolls error:", err);
    return FALLBACK_POLLS;
  }
}

/** Return true if a poll with this date + pollster already exists. */
export async function pollExists(date: string, pollster: string): Promise<boolean> {
  try {
    const rows = await sql()`
      SELECT 1 FROM polls WHERE date = ${date} AND pollster = ${pollster} LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Insert a poll row.  Silently skips on duplicate (date, pollster). */
export async function insertPoll(poll: Poll, sourceUrl?: string): Promise<void> {
  const parties: Record<string, number> = {};
  for (const [k, v] of Object.entries(poll)) {
    if (k !== "date" && k !== "pollster" && k !== "n") {
      parties[k] = Number(v);
    }
  }
  const partiesJson = JSON.stringify(parties);
  await sql()`
    INSERT INTO polls (date, pollster, n, parties, source_url)
    VALUES (${poll.date}, ${poll.pollster}, ${poll.n as number}, ${partiesJson}, ${sourceUrl ?? null})
    ON CONFLICT (date, pollster) DO NOTHING
  `;
}

// ─── Simulator submissions ────────────────────────────────────────────────────

export interface SimulatorSubmission {
  pmParty:            string;
  governmentParties:  string[];
  supportParties:     string[];
  coalitionSeats:     number;
  hasMajority:        boolean;
}

/** Record a simulator "Se min forudsigelse" submission. Fire-and-forget safe. */
export async function insertSimulatorSubmission(s: SimulatorSubmission): Promise<void> {
  await sql()`
    INSERT INTO simulator_submissions
      (pm_party, government_parties, support_parties, coalition_seats, has_majority)
    VALUES (
      ${s.pmParty},
      ${JSON.stringify(s.governmentParties)},
      ${JSON.stringify(s.supportParties)},
      ${s.coalitionSeats},
      ${s.hasMajority}
    )
  `;
}

/** Return aggregate statistics for the simulator dashboard. */
export async function getSimulatorStats() {
  const [pmCounts, totals] = await Promise.all([
    sql()`
      SELECT pm_party, COUNT(*)::int AS count
      FROM simulator_submissions
      GROUP BY pm_party
      ORDER BY count DESC
    `,
    sql()`
      SELECT
        COUNT(*)::int           AS total,
        SUM(CASE WHEN has_majority THEN 1 ELSE 0 END)::int AS with_majority
      FROM simulator_submissions
    `,
  ]);
  return {
    total:        totals[0]?.total        ?? 0,
    withMajority: totals[0]?.with_majority ?? 0,
    byPM:         pmCounts as { pm_party: string; count: number }[],
  };
}

/** Return the count of poll rows. */
export async function getPollCount(): Promise<number> {
  try {
    const rows = await sql()`SELECT COUNT(*)::int AS c FROM polls`;
    return rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

/** Seed the DB with FALLBACK_POLLS.  Safe to call multiple times (skips dupes). */
export async function seedFromFallback(): Promise<number> {
  let inserted = 0;
  for (const poll of FALLBACK_POLLS) {
    const exists = await pollExists(poll.date, poll.pollster);
    if (!exists) {
      await insertPoll(poll, "fallback");
      inserted++;
    }
  }
  return inserted;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Merge DB polls with FALLBACK_POLLS so that even before the cron first runs
 * the site shows meaningful data.  DB rows always win over fallback rows with
 * the same (date, pollster) key.
 */
function mergeFallback(dbPolls: Poll[]): Poll[] {
  const keys = new Set(dbPolls.map(p => `${p.date}|${p.pollster}`));
  const extra = FALLBACK_POLLS.filter(p => !keys.has(`${p.date}|${p.pollster}`));
  return [...dbPolls, ...extra].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}
