import { PARTY_KEYS, ROD_BLOK, BLAA_BLOK, calcPartySeats } from "./data";

// ─── FO + GL subjective probability ──────────────────────────────────────────
// Each of the 4 seats (FO×2, GL×2) is independently assigned to rød blok
// with this probability. 0.5 = 50/50, 0.65 = historically red-leaning.
// Adjust freely — there is no hard polling data for FO/GL.
export const FO_GL_RED_PROBABILITY = 0.5;

// Box-Muller transform — standard normal random variable
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export interface MonteCarloResult {
  rodBlokChance: number;   // 0–1
  blaaBlokChance: number;  // 0–1
  rodMedianSeats: number;
  blaaMedianSeats: number;
}

export function runMonteCarlo(
  partyPct: Record<string, number>,
  simulations = 25000
): MonteCarloResult {
  let rodCount = 0;
  let blaaCount = 0;
  const rodSeatsList: number[] = [];
  const blaaSeatsList: number[] = [];

  for (let i = 0; i < simulations; i++) {
    // Shared systematic polling bias (affects all parties equally)
    const systematic = randn() * 1.2;

    // Simulate each party's vote share
    const simPct: Record<string, number> = {};
    for (const pk of PARTY_KEYS) {
      const individual = randn() * 0.9;
      // Same-bloc parties get a slight correlation via systematic component
      simPct[pk] = Math.max(0, (partyPct[pk] || 0) + systematic * 0.3 + individual);
    }

    // Normalize so percentages sum to 100
    const total = (Object.values(simPct) as number[]).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const pk of PARTY_KEYS) simPct[pk] = (simPct[pk] / total) * 100;
    }

    // Calculate seats with 2% threshold
    const seats = calcPartySeats(simPct);

    const dkRodSeats  = ROD_BLOK.reduce((s, pk)  => s + (seats[pk] || 0), 0);
    const dkBlaaSeats = BLAA_BLOK.reduce((s, pk) => s + (seats[pk] || 0), 0);

    // FO + GL: 4 swing seats — see FO_GL_RED_PROBABILITY above
    let foGlRed = 0;
    for (let j = 0; j < 4; j++) if (Math.random() < FO_GL_RED_PROBABILITY) foGlRed++;

    const rodSeats  = dkRodSeats  + foGlRed;
    const blaaSeats = dkBlaaSeats + (4 - foGlRed);

    rodSeatsList.push(rodSeats);
    blaaSeatsList.push(blaaSeats);

    if (rodSeats  >= 90) rodCount++;
    if (blaaSeats >= 90) blaaCount++;
  }

  // Median seats
  rodSeatsList.sort((a, b) => a - b);
  blaaSeatsList.sort((a, b) => a - b);
  const mid = Math.floor(simulations / 2);

  return {
    rodBlokChance:   rodCount  / simulations,
    blaaBlokChance:  blaaCount / simulations,
    rodMedianSeats:  rodSeatsList[mid],
    blaaMedianSeats: blaaSeatsList[mid],
  };
}

/**
 * Returns the probability (0–100) that a custom coalition of parties
 * collectively reaches 90+ seats, given their current poll percentages.
 * `fixedSeats` = FO/GL seats already assigned to this coalition.
 */
export function runCoalitionMonteCarlo(
  partyPct: Record<string, number>,
  coalitionParties: string[],
  fixedSeats = 0,
  simulations = 10000
): number {
  let count = 0;
  for (let i = 0; i < simulations; i++) {
    const systematic = randn() * 1.2;
    const simPct: Record<string, number> = {};
    for (const pk of PARTY_KEYS) {
      simPct[pk] = Math.max(0, (partyPct[pk] || 0) + systematic * 0.3 + randn() * 0.9);
    }
    const total = (Object.values(simPct) as number[]).reduce((s, v) => s + v, 0);
    if (total > 0) for (const pk of PARTY_KEYS) simPct[pk] = (simPct[pk] / total) * 100;
    const seats = calcPartySeats(simPct);
    const coalitionSeats = coalitionParties.reduce((s, pk) => s + (seats[pk] || 0), 0) + fixedSeats;
    if (coalitionSeats >= 90) count++;
  }
  return (count / simulations) * 100;
}
