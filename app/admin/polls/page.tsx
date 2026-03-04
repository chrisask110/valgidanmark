/**
 * /admin/polls — Manual poll entry + DB overview.
 * Protected by HTTP Basic Auth (see middleware.ts).
 *
 * Set in Vercel env vars:
 *   ADMIN_USERNAME  (default: admin)
 *   ADMIN_PASSWORD  (default: changeme — CHANGE THIS!)
 */

import { revalidatePath } from "next/cache";
import { insertPoll, getPolls, getPollCount } from "@/lib/db";
import { PARTIES, PARTY_KEYS, type Poll } from "@/app/lib/data";

// ─── Server action ────────────────────────────────────────────────────────────

async function addPollAction(formData: FormData) {
  "use server";

  const date = formData.get("date") as string;
  const pollster = formData.get("pollster") as string;
  const n = parseInt(formData.get("n") as string) || 0;

  const poll: Poll = { date, pollster, n };
  for (const pk of PARTY_KEYS) {
    const raw = formData.get(pk) as string;
    const val = parseFloat(raw);
    if (!isNaN(val)) poll[pk] = val;
  }

  await insertPoll(poll, "manual");
  revalidatePath("/");
  revalidatePath("/statsminister");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPollsPage() {
  const count = await getPollCount();
  const recent = (await getPolls()).slice(0, 10);

  const inputCls =
    "w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none";
  const labelCls = "block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono">
      <h1 className="text-xl font-bold mb-1">Admin · Målinger</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {count} rækker i databasen &middot; Seneste 10 vises nedenfor
      </p>

      {/* ── Add poll form ─────────────────────────────────────────── */}
      <section className="mb-10 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-bold mb-4 text-zinc-200 uppercase tracking-wider">
          Tilføj måling manuelt
        </h2>
        <form action={addPollAction} className="space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Dato</label>
              <input name="date" type="date" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Institut</label>
              <select name="pollster" required className={inputCls}>
                <option value="">Vælg…</option>
                {["Verian", "Epinion", "Megafon", "Voxmeter"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stikprøve (n)</label>
              <input name="n" type="number" min="0" placeholder="1000" className={inputCls} />
            </div>
          </div>

          {/* Party percentages */}
          <div>
            <p className={`${labelCls} mb-2`}>Partiprocenter (%)</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {PARTY_KEYS.map(pk => (
                <div key={pk}>
                  <label
                    className="block text-[11px] font-mono mb-0.5"
                    style={{ color: PARTIES[pk].color }}
                  >
                    {PARTIES[pk].short} {PARTIES[pk].name.split("–")[0].trim().slice(0, 14)}
                  </label>
                  <input
                    name={pk}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Gem måling →
          </button>
        </form>
      </section>

      {/* ── Seed helper ───────────────────────────────────────────── */}
      <section className="mb-10 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-bold mb-2 text-zinc-200 uppercase tracking-wider">
          Initialiser database
        </h2>
        <p className="text-zinc-400 text-xs mb-3">
          Kør dette én gang efter første deployment for at fylde databasen med
          FALLBACK_POLLS. Efterfølgende opdaterer cron-jobbet automatisk.
        </p>
        <pre className="bg-zinc-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">
{`curl -X POST https://valgidanmark.dk/api/admin/seed \\
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"`}
        </pre>
      </section>

      {/* ── Recent polls table ────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-bold mb-4 text-zinc-200 uppercase tracking-wider">
          Seneste 10 målinger i databasen
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 pr-4 text-zinc-400">Dato</th>
                <th className="text-left py-2 pr-4 text-zinc-400">Institut</th>
                <th className="text-left py-2 pr-4 text-zinc-400">n</th>
                {["A", "F", "V", "I", "M"].map(pk => (
                  <th key={pk} className="text-right py-2 px-2 text-zinc-400"
                    style={{ color: PARTIES[pk].color }}>
                    {pk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((p, i) => (
                <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800/50">
                  <td className="py-1.5 pr-4 text-zinc-200">{p.date}</td>
                  <td className="py-1.5 pr-4 text-zinc-300">{p.pollster}</td>
                  <td className="py-1.5 pr-4 text-zinc-400">{p.n}</td>
                  {["A", "F", "V", "I", "M"].map(pk => (
                    <td key={pk} className="py-1.5 px-2 text-right tabular-nums"
                      style={{ color: PARTIES[pk].color }}>
                      {p[pk] != null ? Number(p[pk]).toFixed(1) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
