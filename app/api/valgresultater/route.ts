import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

const KV_KEY = "valgresultater";
const KV_TS_KEY = "valgresultater:timestamp";

export async function GET() {
  try {
    const data = await kv.get(KV_KEY);
    const timestamp = await kv.get<string>(KV_TS_KEY);

    if (!data) {
      return NextResponse.json(
        { data: null, timestamp: null, message: "Ingen resultater endnu" },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
          },
        }
      );
    }

    return NextResponse.json(
      { data, timestamp },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
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
    const timestamp = new Date().toISOString();

    await kv.set(KV_KEY, body);
    await kv.set(KV_TS_KEY, timestamp);

    return NextResponse.json({ ok: true, timestamp }, { status: 200 });
  } catch (err) {
    console.error("[api/valgresultater POST] error:", err);
    return NextResponse.json({ error: "Fejl ved lagring af data" }, { status: 500 });
  }
}
