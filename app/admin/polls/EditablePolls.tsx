"use client";

import { useEffect, useState } from "react";
import { PARTY_KEYS, PARTIES } from "@/app/lib/data";

interface DBPoll {
  id: number;
  date: string;
  pollster: string;
  n: number;
  parties: Record<string, number | null>;
  source_url: string | null;
}

interface EditState {
  n: number;
  parties: Record<string, string>;
}

export default function EditablePolls() {
  const [polls, setPolls]           = useState<DBPoll[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editId, setEditId]         = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditState>({ n: 0, parties: {} });
  const [saving, setSaving]         = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [syncMsg, setSyncMsg]       = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/db-polls");
    const data = await res.json();
    setPolls(data.polls ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(poll: DBPoll) {
    const parties: Record<string, string> = {};
    for (const pk of PARTY_KEYS) {
      const v = poll.parties[pk];
      parties[pk] = v == null ? "" : String(v);
    }
    setEditId(poll.id);
    setEditValues({ n: poll.n, parties });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    const parties: Record<string, number | null> = {};
    for (const pk of PARTY_KEYS) {
      const raw = editValues.parties[pk];
      parties[pk] = raw === "" ? null : parseFloat(raw);
    }
    await fetch(`/api/polls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n: editValues.n, parties }),
    });
    setSaving(false);
    setEditId(null);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Slet denne måling permanent?")) return;
    await fetch(`/api/polls/${id}`, { method: "DELETE" });
    await load();
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    const res  = await fetch("/api/cron/update-polls", { method: "POST" });
    const data = await res.json();
    setSyncMsg(`✓ ${data.newPolls} nye tilføjet (${data.total} fundet)`);
    if (data.newPolls > 0) await load();
    setSyncing(false);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
          Alle målinger i databasen ({polls.length})
        </h2>
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className="text-xs font-mono text-zinc-400">{syncMsg}</span>
          )}
          <button
            onClick={syncNow}
            disabled={syncing}
            className="px-3 py-1.5 rounded-md border border-zinc-700 text-xs font-mono text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {syncing ? "Henter…" : "↺ Synkroniser fra Wikipedia"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-xs">Henter…</p>
      ) : polls.length === 0 ? (
        <p className="text-zinc-400 text-xs text-center py-8">
          Ingen målinger — klik &quot;Synkroniser fra Wikipedia&quot; for at importere data.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-mono">
                <th className="text-left py-2 pr-3 text-zinc-400 sticky left-0 bg-zinc-900">Dato</th>
                <th className="text-left py-2 pr-3 text-zinc-400">Institut</th>
                <th className="text-right py-2 pr-3 text-zinc-400">N</th>
                {PARTY_KEYS.map(pk => (
                  <th key={pk} className="py-2 px-1 text-center min-w-[44px]"
                    style={{ color: PARTIES[pk]?.color }}>
                    {pk}
                  </th>
                ))}
                <th className="py-2 px-3 text-center text-zinc-400 min-w-[130px]">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {polls.map(poll => {
                const isEditing = editId === poll.id;
                return (
                  <tr key={poll.id} className={`border-b border-zinc-900 ${isEditing ? "bg-zinc-800/50" : "hover:bg-zinc-800/30"}`}>
                    <td className={`py-1.5 pr-3 font-mono tabular-nums text-zinc-200 sticky left-0 ${isEditing ? "bg-zinc-800/50" : "bg-zinc-900"}`}>
                      {poll.date}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-300 whitespace-nowrap">{poll.pollster}</td>
                    <td className="py-1 pr-3 text-right">
                      {isEditing ? (
                        <input type="number" value={editValues.n}
                          onChange={e => setEditValues(v => ({ ...v, n: parseInt(e.target.value) || 0 }))}
                          className="w-20 text-right bg-zinc-950 border border-zinc-700 rounded px-1 font-mono text-xs text-white" />
                      ) : (
                        <span className={`tabular-nums ${poll.n === 0 ? "text-zinc-600" : "text-zinc-300"}`}>
                          {poll.n === 0 ? "NA" : poll.n.toLocaleString("da-DK")}
                        </span>
                      )}
                    </td>
                    {PARTY_KEYS.map(pk => (
                      <td key={pk} className="py-1 px-1 text-center">
                        {isEditing ? (
                          <input type="number" step="0.1" min="0" max="100"
                            value={editValues.parties[pk] ?? ""}
                            onChange={e => setEditValues(v => ({ ...v, parties: { ...v.parties, [pk]: e.target.value } }))}
                            className="w-[44px] text-center bg-zinc-950 border border-zinc-700 rounded px-0.5 font-mono text-[10px] text-white" />
                        ) : (
                          poll.parties[pk] == null
                            ? <span className="text-zinc-700">—</span>
                            : <span className="font-mono tabular-nums" style={{ color: PARTIES[pk]?.color }}>
                                {(poll.parties[pk] as number).toFixed(1)}
                              </span>
                        )}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-center whitespace-nowrap">
                      {isEditing ? (
                        <span className="flex gap-1.5 justify-center">
                          <button onClick={() => saveEdit(poll.id)} disabled={saving}
                            className="text-[10px] font-mono px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors">
                            {saving ? "…" : "Gem"}
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="text-[10px] font-mono px-2.5 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
                            Annuller
                          </button>
                        </span>
                      ) : (
                        <span className="flex gap-1.5 justify-center">
                          <button onClick={() => startEdit(poll)}
                            className="text-[10px] font-mono px-2.5 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors">
                            Rediger
                          </button>
                          <button onClick={() => handleDelete(poll.id)}
                            className="text-[10px] font-mono px-2.5 py-1 rounded border border-red-800/60 text-red-400 hover:bg-red-900/20 transition-colors">
                            Slet
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
