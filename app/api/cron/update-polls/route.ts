/**
 * Vercel Cron Job — runs every hour.
 * Scrapes the Danish Wikipedia poll table and inserts any new polls into the DB.
 *
 * Required env vars:
 *   CRON_SECRET  – set automatically by Vercel for cron authentication
 *   SLACK_WEBHOOK_URL – (optional) Slack incoming webhook for new-poll alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pollExists, insertPoll } from "@/lib/db";
import { scrapeWikiPolls } from "@/app/api/scrape-wiki/route";
import type { Poll } from "@/app/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CronResult = { ok: boolean; newPolls: number; skipped: number; total: number; errors: string[] };

async function runSync(): Promise<NextResponse> {
  const result: CronResult = { ok: true, newPolls: 0, skipped: 0, total: 0, errors: [] };

  try {
    const { polls: wikiPolls, warnings } = await scrapeWikiPolls();
    result.total = wikiPolls.length;
    warnings.forEach(w => console.log(`[cron] ${w}`));

    for (const wp of wikiPolls) {
      try {
        const exists = await pollExists(wp.date, wp.pollster);
        if (exists) { result.skipped++; continue; }

        // Convert WikiPoll (parties nested) → Poll (parties flat)
        const poll: Poll = {
          date: wp.date,
          pollster: wp.pollster,
          n: wp.n,
          ...Object.fromEntries(
            Object.entries(wp.parties)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, v as number])
          ),
        };
        await insertPoll(poll, "wikipedia-da");
        result.newPolls++;
        await notifySlack(poll);
      } catch (err) {
        result.errors.push(String(err));
      }
    }

    if (result.newPolls > 0) {
      revalidatePath("/");
      revalidatePath("/statsminister");
      console.log(`[cron] Added ${result.newPolls} new polls from Wikipedia`);
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(String(err));
    console.error("[cron] Fatal error:", err);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return runSync();
}

// POST: manual trigger from admin UI (no auth required)
export async function POST(): Promise<NextResponse> {
  return runSync();
}

async function notifySlack(poll: Poll): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📊 *Ny måling tilføjet*\n*${poll.pollster}* · ${poll.date} · n=${poll.n}\nA: ${poll["A"] ?? "–"}% · V: ${poll["V"] ?? "–"}% · F: ${poll["F"] ?? "–"}%`,
      }),
    });
  } catch { /* non-critical */ }
}
