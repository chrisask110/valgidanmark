import { NextResponse } from "next/server";
import { createSign } from "crypto";

const BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

// Kalshi event tickers for Denmark markets
const EVENTS = {
  gainSeats:   "KXDENMARKGAIN-26MAR24",
  secondPlace: "KXDENMARK2ND-26MAR24-2",
  thirdPlace:  "KXDENMARK3RD-26MAR24-3",
  socdemSeats: "KXSOCDEMSEATS-26MAR24",
} as const;

// Map Kalshi party names/codes → our party keys
const PARTY_NAME_MAP: Record<string, string> = {
  // Short codes (used as market subtitles in e.g. KXDENMARKGAIN)
  "a":   "A",
  "v":   "V",
  "i":   "I",
  "m":   "M",
  "ae":  "Æ",  // Kalshi uses AE for Æ (Danmarksdemokraterne)
  "c":   "C",
  "o":   "O",
  "b":   "B",
  "f":   "F",
  "å":   "Å",
  "aa":  "Å",
  "ø":   "Ø",
  "h":   "H",
  // Full names
  "socialdemokraterne":          "A",
  "socialdemokratiet":           "A",
  "social democrats":            "A",
  "venstre":                     "V",
  "liberal alliance":            "I",
  "moderaterne":                 "M",
  "moderates":                   "M",
  "danmarksdemokraterne":        "Æ",
  "denmark democrats":           "Æ",
  "det konservative folkeparti": "C",
  "konservative":                "C",
  "conservatives":               "C",
  "enhedslisten":                "Ø",
  "unity list":                  "Ø",
  "radikale venstre":            "B",
  "de radikale":                 "B",
  "social liberal party":        "B",
  "dansk folkeparti":            "O",
  "danish people's party":       "O",
  "alternativet":                "Å",
  "the alternative":             "Å",
  "sf":                          "F",
  "socialistisk folkeparti":     "F",
  "socialist people's party":    "F",
  "borgernes parti":             "H",
};

function resolvePartyKey(text: string): string | null {
  const lower = text.toLowerCase().trim();
  // Direct match
  if (PARTY_NAME_MAP[lower]) return PARTY_NAME_MAP[lower];
  // Partial match
  for (const [name, key] of Object.entries(PARTY_NAME_MAP)) {
    if (lower.includes(name)) return key;
  }
  return null;
}

// Build Kalshi auth headers for a GET request
function buildHeaders(path: string): Record<string, string> {
  const keyId = process.env.KALSHI_API_KEY_ID;
  const rawKey = process.env.KALSHI_PRIVATE_KEY;

  if (!keyId || !rawKey) {
    throw new Error("Missing KALSHI_API_KEY_ID or KALSHI_PRIVATE_KEY env vars");
  }

  // Support both literal \n and real newlines in the env var
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const timestamp = Date.now().toString();
  const message = timestamp + "GET" + path;

  const sign = createSign("RSA-SHA256");
  sign.update(message);
  const signature = sign.sign(privateKey, "base64");

  return {
    "Kalshi-Access-Key":       keyId,
    "Kalshi-Access-Timestamp": timestamp,
    "Kalshi-Access-Signature": signature,
    "Accept":                  "application/json",
    "User-Agent":              "valgidanmark/1.0",
  };
}

// Extract mid-price probability (0–1) from a market object
// Kalshi prices are in cents (0–99)
function extractProb(market: Record<string, unknown>): number {
  const yesBid  = typeof market.yes_bid  === "number" ? market.yes_bid  : null;
  const yesAsk  = typeof market.yes_ask  === "number" ? market.yes_ask  : null;
  const lastPrice = typeof market.last_price === "number" ? market.last_price : null;

  if (yesBid != null && yesAsk != null) return (yesBid + yesAsk) / 2 / 100;
  if (lastPrice != null) return lastPrice / 100;
  return 0;
}

// Extract a human-readable label from a market title/subtitle
function extractLabel(market: Record<string, unknown>): string {
  return (
    (market.subtitle as string) ||
    (market.title as string) ||
    (market.ticker as string) ||
    "Unknown"
  );
}

async function fetchEvent(eventTicker: string): Promise<Record<string, unknown> | null> {
  const path = `/trade-api/v2/events/${eventTicker}?with_nested_markets=true`;
  try {
    const headers = buildHeaders(`/trade-api/v2/events/${eventTicker}`);
    const res = await fetch(`${BASE_URL}/events/${eventTicker}?with_nested_markets=true`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[kalshi] ${eventTicker} → HTTP ${res.status}`);
      // Log body for debugging unknown errors
      const text = await res.text().catch(() => "");
      console.error(`[kalshi] ${eventTicker} response body:`, text.slice(0, 500));
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`[kalshi] ${eventTicker} fetch error:`, err);
    return null;
  }
}

// Get nested markets from the event response
// Kalshi returns either event.markets or just markets at top level
function getMarkets(data: Record<string, unknown>): Record<string, unknown>[] {
  const event = data.event as Record<string, unknown> | undefined;
  if (Array.isArray(event?.markets)) return event!.markets as Record<string, unknown>[];
  if (Array.isArray(data.markets)) return data.markets as Record<string, unknown>[];
  // Log unknown structure to help debug
  console.warn("[kalshi] unexpected event structure keys:", Object.keys(data));
  return [];
}

export interface KalshiEntry {
  label:    string;
  partyKey: string | null;
  probability: number;
  url:      string;
}

export interface KalshiData {
  gainSeats:   KalshiEntry[];
  secondPlace: KalshiEntry[];
  thirdPlace:  KalshiEntry[];
  socdemSeats: KalshiEntry[];
}

function marketUrl(seriesTicker: string, eventTicker: string): string {
  return `https://kalshi.com/markets/${seriesTicker}/${eventTicker}`;
}

export async function GET() {
  try {
    // Fetch all 4 events in parallel
    const [gainData, secondData, thirdData, socdemData] = await Promise.all([
      fetchEvent(EVENTS.gainSeats),
      fetchEvent(EVENTS.secondPlace),
      fetchEvent(EVENTS.thirdPlace),
      fetchEvent(EVENTS.socdemSeats),
    ]);

    // --- gainSeats: yes/no per party ---
    const gainSeats: KalshiEntry[] = gainData
      ? getMarkets(gainData)
          .filter(m => m.status !== "settled")
          .map(m => ({
            label:       extractLabel(m),
            partyKey:    resolvePartyKey(extractLabel(m)),
            probability: extractProb(m),
            url:         marketUrl("kxdenmarkgain", EVENTS.gainSeats),
          }))
          .filter(e => e.probability > 0)
          .sort((a, b) => b.probability - a.probability)
      : [];

    // --- secondPlace: ranked list ---
    const secondPlace: KalshiEntry[] = secondData
      ? getMarkets(secondData)
          .filter(m => m.status !== "settled")
          .map(m => ({
            label:       extractLabel(m),
            partyKey:    resolvePartyKey(extractLabel(m)),
            probability: extractProb(m),
            url:         marketUrl("kxdenmark2nd", EVENTS.secondPlace),
          }))
          .filter(e => e.probability > 0.005)
          .sort((a, b) => b.probability - a.probability)
      : [];

    // --- thirdPlace: ranked list ---
    const thirdPlace: KalshiEntry[] = thirdData
      ? getMarkets(thirdData)
          .filter(m => m.status !== "settled")
          .map(m => ({
            label:       extractLabel(m),
            partyKey:    resolvePartyKey(extractLabel(m)),
            probability: extractProb(m),
            url:         marketUrl("kxdenmark3rd", EVENTS.thirdPlace),
          }))
          .filter(e => e.probability > 0.005)
          .sort((a, b) => b.probability - a.probability)
      : [];

    // --- socdemSeats: seat count distribution (keep all buckets, sorted by label) ---
    const socdemSeats: KalshiEntry[] = socdemData
      ? getMarkets(socdemData)
          .filter(m => m.status !== "settled")
          .map(m => ({
            label:       extractLabel(m),
            partyKey:    "A",
            probability: extractProb(m),
            url:         marketUrl("kxsocdemseats", EVENTS.socdemSeats),
          }))
          .filter(e => e.probability > 0)
          // Keep natural order (label order) for seat distribution
          .sort((a, b) => a.label.localeCompare(b.label, "da", { numeric: true }))
      : [];

    const responseData: KalshiData = { gainSeats, secondPlace, thirdPlace, socdemSeats };

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    console.error("[kalshi] unhandled error:", err);
    return NextResponse.json(
      { gainSeats: [], secondPlace: [], thirdPlace: [], socdemSeats: [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
    );
  }
}
