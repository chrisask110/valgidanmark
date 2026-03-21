import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

async function ensureTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS valgresultater (
      id        INTEGER PRIMARY KEY DEFAULT 1,
      data      JSONB        NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await sql()`SELECT data, updated_at FROM valgresultater WHERE id = 1`;
    if (rows.length === 0) {
      return NextResponse.json(
        { data: null, timestamp: null, message: "Ingen resultater endnu" },
        { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } }
      );
    }
    const row = rows[0];
    return NextResponse.json(
      { data: row.data, timestamp: row.updated_at },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } }
    );
  } catch (err) {
    console.error("[api/valgresultater GET] error:", err);
    return NextResponse.json({ error: "Fejl ved hentning af data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("key") ?? req.headers.get("x-api-key");
    if (secret !== process.env.VALGDAG_API_SECRET) {
      return NextResponse.json({ error: "Uautoriseret" }, { status: 401 });
    }
    const body = await req.json();
    await ensureTable();
    await sql()`
      INSERT INTO valgresultater (id, data, updated_at)
      VALUES (1, ${JSON.stringify(body)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET
        data       = ${JSON.stringify(body)}::jsonb,
        updated_at = NOW()
    `;
    const rows = await sql()`SELECT updated_at FROM valgresultater WHERE id = 1`;
    return NextResponse.json({ ok: true, timestamp: rows[0]?.updated_at }, { status: 200 });
  } catch (err) {
    console.error("[api/valgresultater POST] error:", err);
    return NextResponse.json({ error: "Fejl ved lagring af data" }, { status: 500 });
  }
}
