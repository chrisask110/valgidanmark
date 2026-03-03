import { PARTY_KEYS, ROD_BLOK, BLAA_BLOK, calcPartySeats } from "./data";

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
  simulations = 5000
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

    const rodSeats  = ROD_BLOK.reduce((s, pk)  => s + (seats[pk] || 0), 0);
    const blaaSeats = BLAA_BLOK.reduce((s, pk) => s + (seats[pk] || 0), 0);

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
