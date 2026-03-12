import { NextResponse } from "next/server";
import { createSign } from "crypto";

export const dynamic = "force-dynamic";

const BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

function buildHeaders(path: string): Record<string, string> {
  const keyId = process.env.KALSHI_API_KEY_ID;
  const rawKey = process.env.KALSHI_PRIVATE_KEY;
  if (!keyId || !rawKey) throw new Error("Missing env vars");
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const timestamp = Date.now().toString();
  const message = timestamp + "GET" + path;
  const sign = createSign("RSA-SHA256");
  sign.update(message);
  const signature = sign.sign(privateKey, "base64");
  return {
    "Kalshi-Access-Key": keyId,
    "Kalshi-Access-Timestamp": timestamp,
    "Kalshi-Access-Signature": signature,
    "Accept": "application/json",
  };
}

export async function GET() {
  const path = `/trade-api/v2/markets`;
  const headers = buildHeaders(path);
  const res = await fetch(`${BASE_URL}/markets?event_ticker=KXSOCDEMSEATS-26MAR24`, {
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  return NextResponse.json({ status: res.status, body: JSON.parse(text) });
}
