// Shared data layer — imported by app/page.tsx and app/statsminister/page.tsx

export const PARTIES: Record<string, { name: string; short: string; color: string; bloc: string; result2022: number }> = {
  A: { name: "Socialdemokraterne",          short: "A",  color: "#C8102E", bloc: "red",     result2022: 27.5 },
  F: { name: "SF – Socialistisk Folkeparti", short: "F", color: "#E4007C", bloc: "red",     result2022: 8.3  },
  V: { name: "Venstre",                      short: "V", color: "#254B8E", bloc: "blue",    result2022: 13.3 },
  I: { name: "Liberal Alliance",             short: "I", color: "#00B0CA", bloc: "blue",    result2022: 7.9  },
  Æ: { name: "Danmarksdemokraterne",         short: "Æ", color: "#005F6B", bloc: "blue",    result2022: 8.1  },
  C: { name: "Det Konservative Folkeparti",  short: "C", color: "#00583C", bloc: "blue",    result2022: 5.5  },
  Ø: { name: "Enhedslisten",                 short: "Ø", color: "#991B1E", bloc: "red",     result2022: 5.3  },
  B: { name: "Radikale Venstre",             short: "B", color: "#733280", bloc: "red",     result2022: 3.7  },
  O: { name: "Dansk Folkeparti",             short: "O", color: "#E4B828", bloc: "blue",    result2022: 2.6  },
  Å: { name: "Alternativet",                 short: "Å", color: "#2ECC71", bloc: "red",     result2022: 3.3  },
  M: { name: "Moderaterne",                  short: "M", color: "#8B5CF6", bloc: "neutral", result2022: 9.3  },
  H: { name: "Borgernes Parti",              short: "H", color: "#0084FF", bloc: "blue",    result2022: 0.0  },
  // Fixed constituency seats — not polled
  FO: { name: "Færøerne",  short: "FO", color: "#003F87", bloc: "neutral", result2022: 0 },
  GL: { name: "Grønland",  short: "GL", color: "#009A44", bloc: "neutral", result2022: 0 },
};

/** Fixed seat counts for Faroe Islands and Greenland (not determined by DK polls) */
export const FO_GL_SEATS: Record<string, number> = { FO: 2, GL: 2 };

export const POLLSTERS: Record<string, { rating: number; grade: string; avgError: number; methodology: string; client: string; sampleSize: string; weight: number; desc: string }> = {
  "Verian":   { rating: 92, grade: "A",  avgError: 0.65, methodology: "Telefon + Onlinepanel",       client: "Berlingske",       sampleSize: "~1.700",       weight: 1.35, desc: "Laveste gennemsnitlige afvigelse blandt danske institutter. Tidligere Kantar Gallup." },
  "Epinion":  { rating: 87, grade: "A-", avgError: 0.95, methodology: "Kombineret (telefon + web)",  client: "DR & Altinget",    sampleSize: "~1.600–2.000", weight: 1.20, desc: "Store stikprøver og stærk metodik. Udfører målinger for public service-kanalen DR." },
  "Megafon":  { rating: 84, grade: "B+", avgError: 0.95, methodology: "Onlinepanel + telefon",       client: "TV 2 & Politiken", sampleSize: "~1.000",       weight: 1.10, desc: "Stabil præstation med moderate huseffekter. Udfører målinger for TV 2." },
  "Voxmeter": { rating: 81, grade: "B+", avgError: 1.60, methodology: "Telefon + webpanel",          client: "Ritzaus Bureau",   sampleSize: "~1.000",       weight: 0.90, desc: "Hyppigste institut med ugentlige udgivelser. Giver fremragende trenddata trods større fejlmargin." },
};

export const PARTY_KEYS = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "O", "Å", "M", "H"] as const;
export const ROD_BLOK  = ["A", "F", "Ø", "B", "Å"] as const;
export const BLAA_BLOK = ["V", "I", "Æ", "C", "O", "H"] as const;
export const ELECTION_DATE = new Date("2026-03-24T08:00:00+01:00");

export type Poll = {
  date: string;
  pollster: string;
  n: number;
  [key: string]: string | number;
};

export const FALLBACK_POLLS: Poll[] = [
  { date: "2026-02-27", pollster: "Epinion",  n: 2034, A: 21.6, V: 10.8, M: 5.8,  F: 13.5, Æ: 8.5,  I: 10.0, C: 6.8, Ø: 6.8, B: 4.8, Å: 2.2, O: 6.9, H: 1.8 },
  { date: "2026-02-27", pollster: "Megafon",  n: 1012, A: 22.0, V: 10.5, M: 6.2,  F: 13.2, Æ: 8.7,  I: 10.2, C: 6.5, Ø: 6.5, B: 4.5, Å: 2.0, O: 7.2, H: 1.9 },
  { date: "2026-02-22", pollster: "Voxmeter", n: 1005, A: 21.5, V: 11.0, M: 6.4,  F: 13.5, Æ: 9.2,  I: 10.0, C: 6.8, Ø: 6.2, B: 4.3, Å: 2.1, O: 6.5, H: 2.1 },
  { date: "2026-02-15", pollster: "Voxmeter", n: 1005, A: 21.2, V: 11.5, M: 6.7,  F: 13.8, Æ: 9.7,  I: 9.6,  C: 6.6, Ø: 6.1, B: 4.1, Å: 1.9, O: 5.7, H: 2.3 },
  { date: "2026-02-08", pollster: "Voxmeter", n: 1003, A: 22.5, V: 11.2, M: 6.3,  F: 13.0, Æ: 9.0,  I: 10.1, C: 6.5, Ø: 6.3, B: 4.5, Å: 2.0, O: 6.0, H: 2.0 },
  { date: "2026-02-04", pollster: "Megafon",  n: 1008, A: 22.7, V: 10.8, M: 5.9,  F: 13.4, Æ: 8.3,  I: 10.5, C: 7.0, Ø: 6.4, B: 4.3, Å: 1.9, O: 6.8, H: 1.5 },
  { date: "2026-01-29", pollster: "Verian",   n: 1700, A: 21.6, V: 10.6, M: 6.1,  F: 13.3, Æ: 8.9,  I: 10.3, C: 6.6, Ø: 6.6, B: 4.4, Å: 2.2, O: 6.5, H: 2.1 },
  { date: "2026-01-22", pollster: "Epinion",  n: 2034, A: 21.6, V: 10.5, M: 4.6,  F: 14.2, Æ: 9.2,  I: 10.8, C: 7.0, Ø: 6.5, B: 4.5, Å: 2.0, O: 7.0, H: 1.8 },
  { date: "2026-01-18", pollster: "Voxmeter", n: 1005, A: 22.0, V: 11.0, M: 5.5,  F: 13.5, Æ: 9.0,  I: 10.5, C: 6.8, Ø: 6.5, B: 4.5, Å: 2.0, O: 6.2, H: 2.0 },
  { date: "2025-12-21", pollster: "Voxmeter", n: 1005, A: 18.9, V: 12.2, M: 2.8,  F: 13.9, Æ: 10.0, I: 11.2, C: 7.9, Ø: 6.1, B: 5.4, Å: 2.1, O: 6.8, H: 2.3 },
  { date: "2025-12-14", pollster: "Voxmeter", n: 1000, A: 18.6, V: 11.7, M: 2.4,  F: 14.3, Æ: 9.2,  I: 11.7, C: 7.8, Ø: 7.0, B: 5.2, Å: 2.0, O: 8.0, H: 1.7 },
  { date: "2025-12-11", pollster: "Epinion",  n: 2034, A: 16.5, V: 11.6, M: 1.5,  F: 16.0, Æ: 9.9,  I: 10.4, C: 8.5, Ø: 6.8, B: 5.1, Å: 1.7, O: 9.3, H: 2.2 },
  { date: "2025-12-07", pollster: "Voxmeter", n: 1005, A: 18.0, V: 11.3, M: 2.7,  F: 15.6, Æ: 8.6,  I: 12.2, C: 7.0, Ø: 7.7, B: 4.6, Å: 1.6, O: 8.1, H: 2.0 },
  { date: "2025-12-04", pollster: "Megafon",  n: 1008, A: 17.7, V: 12.7, M: 2.2,  F: 14.8, Æ: 8.4,  I: 11.9, C: 8.6, Ø: 7.3, B: 4.7, Å: 1.7, O: 7.9, H: 1.1 },
  { date: "2025-12-02", pollster: "Verian",   n: 1672, A: 19.5, V: 11.3, M: 3.3,  F: 15.7, Æ: 9.6,  I: 11.0, C: 7.3, Ø: 5.7, B: 4.8, Å: 1.7, O: 8.7, H: 1.0 },
  { date: "2025-11-30", pollster: "Voxmeter", n: 1002, A: 19.4, V: 12.0, M: 2.9,  F: 14.7, Æ: 8.5,  I: 10.9, C: 7.2, Ø: 7.0, B: 4.0, Å: 2.2, O: 8.9, H: 2.0 },
  { date: "2025-11-25", pollster: "Epinion",  n: 2034, A: 17.5, V: 11.5, M: 1.8,  F: 14.1, Æ: 10.5, I: 11.8, C: 8.8, Ø: 6.5, B: 3.7, Å: 3.0, O: 8.7, H: 1.4 },
  { date: "2025-11-23", pollster: "Voxmeter", n: 1024, A: 19.3, V: 11.5, M: 2.4,  F: 13.0, Æ: 8.2,  I: 12.8, C: 7.3, Ø: 7.6, B: 5.2, Å: 1.7, O: 8.3, H: 2.0 },
  { date: "2025-11-16", pollster: "Voxmeter", n: 1007, A: 19.9, V: 10.4, M: 2.9,  F: 12.1, Æ: 9.2,  I: 11.4, C: 7.2, Ø: 7.7, B: 6.2, Å: 2.1, O: 8.3, H: 2.1 },
  { date: "2025-11-09", pollster: "Voxmeter", n: 1005, A: 21.1, V: 9.6,  M: 3.1,  F: 12.2, Æ: 9.5,  I: 9.9,  C: 7.9, Ø: 6.6, B: 5.8, Å: 1.8, O: 8.4, H: 3.1 },
  { date: "2025-11-06", pollster: "Megafon",  n: 1006, A: 19.8, V: 11.2, M: 2.8,  F: 16.2, Æ: 8.0,  I: 10.9, C: 7.0, Ø: 7.2, B: 4.4, Å: 1.9, O: 9.4, H: 0.4 },
  { date: "2025-11-04", pollster: "Verian",   n: 1784, A: 22.8, V: 10.5, M: 3.3,  F: 12.5, Æ: 7.6,  I: 10.5, C: 7.9, Ø: 7.3, B: 3.8, Å: 1.3, O: 10.1, H: 0.9 },
  { date: "2025-11-02", pollster: "Voxmeter", n: 1005, A: 21.1, V: 10.5, M: 3.5,  F: 12.3, Æ: 8.0,  I: 10.8, C: 7.1, Ø: 7.0, B: 5.4, Å: 2.1, O: 9.6, H: 2.1 },
  { date: "2025-10-26", pollster: "Voxmeter", n: 1002, A: 21.2, V: 10.4, M: 4.4,  F: 12.6, Æ: 9.3,  I: 11.3, C: 6.3, Ø: 6.7, B: 4.1, Å: 1.8, O: 9.4, H: 2.2 },
  { date: "2025-10-19", pollster: "Voxmeter", n: 1004, A: 20.0, V: 11.8, M: 3.7,  F: 12.4, Æ: 9.0,  I: 11.0, C: 6.4, Ø: 7.2, B: 4.2, Å: 2.3, O: 9.2, H: 2.0 },
  { date: "2025-10-12", pollster: "Voxmeter", n: 1004, A: 20.3, V: 10.7, M: 3.3,  F: 12.5, Æ: 9.5,  I: 12.2, C: 6.2, Ø: 6.3, B: 5.2, Å: 2.9, O: 8.9, H: 1.5 },
  { date: "2025-10-05", pollster: "Voxmeter", n: 1031, A: 19.2, V: 9.5,  M: 4.2,  F: 13.1, Æ: 9.1,  I: 13.0, C: 6.9, Ø: 7.3, B: 4.8, Å: 2.2, O: 8.3, H: 1.8 },
  { date: "2025-10-02", pollster: "Epinion",  n: 2052, A: 20.9, V: 9.1,  M: 2.7,  F: 12.5, Æ: 7.9,  I: 11.4, C: 6.2, Ø: 7.6, B: 4.8, Å: 2.4, O: 12.0, H: 1.4 },
  { date: "2025-09-30", pollster: "Verian",   n: 1638, A: 22.1, V: 10.3, M: 3.1,  F: 14.2, Æ: 8.6,  I: 12.3, C: 5.7, Ø: 7.2, B: 4.2, Å: 1.2, O: 9.2, H: 0.9 },
  { date: "2025-09-28", pollster: "Voxmeter", n: 1006, A: 20.4, V: 10.0, M: 3.4,  F: 12.0, Æ: 9.6,  I: 11.7, C: 7.0, Ø: 7.3, B: 4.2, Å: 2.7, O: 8.1, H: 2.3 },
  { date: "2025-09-25", pollster: "Megafon",  n: 1014, A: 21.6, V: 9.0,  M: 3.2,  F: 12.6, Æ: 8.8,  I: 12.8, C: 8.1, Ø: 7.2, B: 4.9, Å: 1.7, O: 7.8, H: 1.7 },
  { date: "2025-09-21", pollster: "Voxmeter", n: 1014, A: 21.7, V: 10.7, M: 3.0,  F: 12.5, Æ: 8.4,  I: 12.3, C: 6.6, Ø: 8.2, B: 3.5, Å: 2.0, O: 8.4, H: 2.1 },
  { date: "2025-09-14", pollster: "Voxmeter", n: 1006, A: 22.0, V: 9.2,  M: 3.0,  F: 12.6, Æ: 9.2,  I: 12.8, C: 6.0, Ø: 7.8, B: 3.6, Å: 3.2, O: 7.8, H: 1.4 },
  { date: "2025-09-07", pollster: "Voxmeter", n: 1000, A: 21.4, V: 11.0, M: 3.2,  F: 13.3, Æ: 10.2, I: 11.8, C: 6.2, Ø: 7.4, B: 3.9, Å: 2.6, O: 6.5, H: 1.9 },
  { date: "2025-08-31", pollster: "Voxmeter", n: 1001, A: 19.5, V: 9.4,  M: 3.2,  F: 14.7, Æ: 9.3,  I: 13.3, C: 7.1, Ø: 6.8, B: 4.4, Å: 2.3, O: 7.8, H: 1.3 },
  { date: "2025-08-24", pollster: "Voxmeter", n: 1004, A: 20.3, V: 10.6, M: 3.3,  F: 14.5, Æ: 10.0, I: 11.6, C: 6.7, Ø: 6.3, B: 5.1, Å: 2.1, O: 7.5, H: 1.0 },
  { date: "2025-08-20", pollster: "Epinion",  n: 1582, A: 19.5, V: 10.0, M: 3.9,  F: 15.2, Æ: 8.9,  I: 12.5, C: 6.0, Ø: 7.3, B: 4.3, Å: 2.1, O: 8.1, H: 1.0 },
  { date: "2025-08-17", pollster: "Voxmeter", n: 1065, A: 21.6, V: 9.6,  M: 2.7,  F: 13.0, Æ: 9.4,  I: 12.8, C: 7.2, Ø: 7.2, B: 4.5, Å: 2.5, O: 6.9, H: 1.8 },
  { date: "2025-06-29", pollster: "Voxmeter", n: 1002, A: 22.4, V: 11.0, M: 4.0,  F: 13.0, Æ: 8.7,  I: 13.1, C: 6.2, Ø: 7.0, B: 4.3, Å: 1.9, O: 5.8, H: 2.5 },
  { date: "2025-06-22", pollster: "Voxmeter", n: 1052, A: 21.6, V: 10.9, M: 2.9,  F: 13.8, Æ: 10.2, I: 12.2, C: 6.1, Ø: 7.3, B: 3.7, Å: 2.6, O: 5.6, H: 2.5 },
  { date: "2025-06-19", pollster: "Megafon",  n: 1018, A: 22.2, V: 11.3, M: 3.3,  F: 14.2, Æ: 7.7,  I: 12.0, C: 7.5, Ø: 6.5, B: 5.1, Å: 1.7, O: 6.7, H: 1.5 },
  { date: "2025-06-15", pollster: "Voxmeter", n: 1007, A: 22.7, V: 10.1, M: 3.1,  F: 13.2, Æ: 10.1, I: 12.5, C: 6.2, Ø: 8.2, B: 4.2, Å: 3.1, O: 4.8, H: 1.4 },
  { date: "2025-06-08", pollster: "Voxmeter", n: 1011, A: 23.8, V: 11.1, M: 3.6,  F: 12.5, Æ: 10.5, I: 10.8, C: 6.1, Ø: 7.5, B: 4.4, Å: 2.5, O: 5.0, H: 1.7 },
  { date: "2025-06-02", pollster: "Epinion",  n: 1582, A: 21.1, V: 9.4,  M: 4.1,  F: 14.3, Æ: 9.5,  I: 11.7, C: 5.4, Ø: 7.5, B: 4.1, Å: 2.8, O: 7.6, H: 1.8 },
  { date: "2025-05-25", pollster: "Voxmeter", n: 1003, A: 23.8, V: 10.9, M: 4.4,  F: 13.2, Æ: 8.5,  I: 13.1, C: 6.6, Ø: 6.7, B: 4.5, Å: 2.4, O: 3.7, H: 2.1 },
  { date: "2025-05-18", pollster: "Voxmeter", n: 1001, A: 24.0, V: 10.0, M: 3.3,  F: 13.9, Æ: 9.6,  I: 13.3, C: 5.7, Ø: 6.7, B: 4.9, Å: 2.1, O: 4.4, H: 1.7 },
  { date: "2025-05-11", pollster: "Voxmeter", n: 1007, A: 23.4, V: 10.6, M: 3.4,  F: 12.8, Æ: 9.3,  I: 12.3, C: 6.2, Ø: 7.3, B: 4.2, Å: 3.0, O: 5.2, H: 0.9 },
  { date: "2025-05-04", pollster: "Voxmeter", n: 1003, A: 22.9, V: 9.2,  M: 3.8,  F: 14.1, Æ: 9.9,  I: 13.5, C: 5.4, Ø: 8.0, B: 4.7, Å: 1.9, O: 5.2, H: 1.1 },
  { date: "2025-04-29", pollster: "Epinion",  n: 1483, A: 22.9, V: 10.3, M: 3.9,  F: 13.6, Æ: 10.4, I: 13.1, C: 5.7, Ø: 7.1, B: 4.4, Å: 2.6, O: 5.7, H: 1.1 },
  { date: "2025-04-27", pollster: "Voxmeter", n: 1005, A: 22.4, V: 9.5,  M: 3.5,  F: 13.7, Æ: 9.6,  I: 14.0, C: 6.4, Ø: 7.8, B: 4.0, Å: 2.0, O: 4.9, H: 1.7 },
  { date: "2025-04-20", pollster: "Voxmeter", n: 1002, A: 23.5, V: 10.0, M: 3.5,  F: 12.7, Æ: 9.2,  I: 13.1, C: 5.6, Ø: 7.6, B: 4.9, Å: 2.1, O: 4.8, H: 2.4 },
  { date: "2025-04-13", pollster: "Voxmeter", n: 1007, A: 22.6, V: 9.2,  M: 3.5,  F: 13.9, Æ: 9.2,  I: 12.2, C: 6.1, Ø: 7.1, B: 6.4, Å: 2.9, O: 4.1, H: 1.9 },
  { date: "2025-04-06", pollster: "Voxmeter", n: 1016, A: 22.8, V: 10.1, M: 4.3,  F: 14.0, Æ: 9.2,  I: 13.8, C: 5.6, Ø: 6.2, B: 5.3, Å: 2.2, O: 4.5, H: 1.5 },
  { date: "2025-04-01", pollster: "Verian",   n: 1641, A: 22.5, V: 10.8, M: 3.8,  F: 15.0, Æ: 8.3,  I: 12.9, C: 5.8, Ø: 6.9, B: 4.0, Å: 1.6, O: 5.3, H: 1.8 },
  { date: "2025-03-30", pollster: "Voxmeter", n: 1076, A: 22.6, V: 10.4, M: 3.2,  F: 13.3, Æ: 10.4, I: 13.0, C: 6.4, Ø: 6.9, B: 4.8, Å: 2.0, O: 4.7, H: 1.8 },
  { date: "2025-03-26", pollster: "Epinion",  n: 1640, A: 23.2, V: 9.3,  M: 3.6,  F: 14.9, Æ: 10.8, I: 12.8, C: 5.5, Ø: 6.6, B: 4.7, Å: 2.0, O: 4.5, H: 1.2 },
  { date: "2025-03-23", pollster: "Voxmeter", n: 1002, A: 23.8, V: 9.3,  M: 4.0,  F: 12.5, Æ: 9.4,  I: 12.2, C: 7.0, Ø: 6.3, B: 5.2, Å: 2.2, O: 5.2, H: 1.9 },
  { date: "2025-03-16", pollster: "Voxmeter", n: 1005, A: 23.4, V: 10.5, M: 3.4,  F: 13.2, Æ: 10.4, I: 11.8, C: 6.5, Ø: 6.5, B: 4.0, Å: 2.5, O: 4.8, H: 2.1 },
  { date: "2025-03-09", pollster: "Voxmeter", n: 1002, A: 23.2, V: 9.8,  M: 3.3,  F: 14.4, Æ: 10.1, I: 11.2, C: 6.8, Ø: 6.9, B: 4.6, Å: 2.2, O: 4.8, H: 1.3 },
  { date: "2025-03-04", pollster: "Verian",   n: 1797, A: 21.9, V: 11.1, M: 4.3,  F: 14.5, Æ: 9.2,  I: 10.5, C: 7.6, Ø: 6.5, B: 4.4, Å: 2.2, O: 5.3, H: 1.6 },
  { date: "2025-02-23", pollster: "Voxmeter", n: 1013, A: 21.8, V: 10.5, M: 3.5,  F: 13.6, Æ: 10.0, I: 13.2, C: 6.2, Ø: 6.5, B: 4.3, Å: 2.7, O: 4.2, H: 2.2 },
  { date: "2025-02-16", pollster: "Voxmeter", n: 1002, A: 21.0, V: 10.3, M: 4.1,  F: 14.2, Æ: 9.7,  I: 12.2, C: 6.7, Ø: 6.9, B: 4.5, Å: 2.7, O: 5.3, H: 1.3 },
  { date: "2025-02-09", pollster: "Voxmeter", n: 1028, A: 19.9, V: 10.7, M: 4.0,  F: 14.2, Æ: 9.3,  I: 11.6, C: 6.9, Ø: 8.0, B: 4.5, Å: 2.3, O: 4.7, H: 1.6 },
  { date: "2025-02-04", pollster: "Verian",   n: 1897, A: 23.0, V: 11.4, M: 4.0,  F: 14.4, Æ: 9.6,  I: 9.2,  C: 7.2, Ø: 6.6, B: 4.4, Å: 1.8, O: 5.4, H: 1.8 },
  { date: "2025-02-02", pollster: "Voxmeter", n: 1012, A: 22.6, V: 11.1, M: 3.5,  F: 15.0, Æ: 10.0, I: 12.1, C: 6.2, Ø: 5.8, B: 4.0, Å: 2.3, O: 4.2, H: 1.7 },
  { date: "2025-01-26", pollster: "Voxmeter", n: 1009, A: 19.7, V: 8.6,  M: 4.4,  F: 15.8, Æ: 11.5, I: 11.6, C: 6.8, Ø: 6.8, B: 4.1, Å: 2.4, O: 4.9, H: 1.8 },
  { date: "2025-01-19", pollster: "Voxmeter", n: 1020, A: 19.3, V: 10.3, M: 4.5,  F: 14.2, Æ: 9.3,  I: 12.6, C: 7.9, Ø: 6.2, B: 4.5, Å: 2.1, O: 5.7, H: 2.3 },
  { date: "2025-01-12", pollster: "Voxmeter", n: 1002, A: 20.4, V: 8.4,  M: 4.1,  F: 14.9, Æ: 10.0, I: 12.3, C: 7.4, Ø: 6.8, B: 5.4, Å: 2.1, O: 5.4, H: 1.8 },
];

export function calcWeightedAverage(polls: Poll[], partyKey: string, asOfDate?: string): number | null {
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const relevant = polls
    .filter(p => p[partyKey] !== undefined && p[partyKey] !== null && p[partyKey] !== "")
    .map(p => {
      const daysDiff = (now.getTime() - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-daysDiff / 30);
      const pollsterWeight = POLLSTERS[p.pollster]?.weight || 1.0;
      const sizeWeight = Math.sqrt((p.n || 1000) / 1000);
      return { value: Number(p[partyKey]), weight: recency * pollsterWeight * sizeWeight };
    });
  if (relevant.length === 0) return null;
  const totalWeight = relevant.reduce((s, r) => s + r.weight, 0);
  return relevant.reduce((s, r) => s + r.value * r.weight, 0) / totalWeight;
}

export function calcPartySeats(partyPct: Record<string, number>): Record<string, number> {
  const TOTAL = 175; // Danish mainland seats only (Faroe Islands + Greenland = 4 separate)
  const qualifying = PARTY_KEYS.filter(pk => (partyPct[pk] || 0) >= 2);
  const totalQualifyingPct = qualifying.reduce((s, pk) => s + (partyPct[pk] || 0), 0);
  const seats: Record<string, number> = Object.fromEntries(PARTY_KEYS.map(pk => [pk, 0]));
  if (!totalQualifyingPct) return seats;

  // Hamilton / largest-remainder method — guarantees sum === TOTAL
  const quotas = qualifying.map(pk => {
    const exact = (partyPct[pk] / totalQualifyingPct) * TOTAL;
    return { pk, floor: Math.floor(exact), rem: exact % 1 };
  });
  let assigned = quotas.reduce((s, q) => s + q.floor, 0);
  quotas.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < TOTAL - assigned; i++) quotas[i].floor++;
  quotas.forEach(q => { seats[q.pk] = q.floor; });

  // Enforce minimum 4 seats for any qualifying party.
  // If bumping a party up would push total > 175, take a seat from the largest party.
  for (const pk of qualifying) {
    while (seats[pk] < 4) {
      seats[pk]++;
      const donor = qualifying
        .filter(p => p !== pk && seats[p] > 4)
        .sort((a, b) => seats[b] - seats[a])[0];
      if (donor) seats[donor]--;
    }
  }

  return seats;
}
