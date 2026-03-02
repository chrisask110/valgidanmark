"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";

// ── Parti-data ─────────────────────────────────────────────────────
const PARTIES = {
  A: { name: "Socialdemokraterne", short: "A", color: "#C8102E", bloc: "red", result2022: 27.5 },
  F: { name: "SF – Socialistisk Folkeparti", short: "F", color: "#E4007C", bloc: "red", result2022: 8.3 },
  V: { name: "Venstre", short: "V", color: "#254B8E", bloc: "blue", result2022: 13.3 },
  I: { name: "Liberal Alliance", short: "I", color: "#00B0CA", bloc: "blue", result2022: 7.9 },
  Æ: { name: "Danmarksdemokraterne", short: "Æ", color: "#005F6B", bloc: "blue", result2022: 8.1 },
  C: { name: "Det Konservative Folkeparti", short: "C", color: "#00583C", bloc: "blue", result2022: 5.5 },
  Ø: { name: "Enhedslisten", short: "Ø", color: "#991B1E", bloc: "red", result2022: 5.3 },
  B: { name: "Radikale Venstre", short: "B", color: "#733280", bloc: "red", result2022: 3.7 },
  O: { name: "Dansk Folkeparti", short: "O", color: "#E4B828", bloc: "blue", result2022: 2.6 },
  Å: { name: "Alternativet", short: "Å", color: "#2ECC71", bloc: "red", result2022: 3.3 },
  M: { name: "Moderaterne", short: "M", color: "#8B5CF6", bloc: "neutral", result2022: 9.3 },
  H: { name: "Borgerne", short: "H", color: "#F97316", bloc: "blue", result2022: 0.0 },
};

// ── Institut-vurderinger ────────────────────────────────────────────
const POLLSTERS = {
  "Verian": {
    rating: 92, grade: "A",
    avgError: 0.65, methodology: "Telefon + Onlinepanel",
    client: "Berlingske", sampleSize: "~1.700",
    weight: 1.35,
    desc: "Laveste gennemsnitlige afvigelse blandt danske institutter. Tidligere Kantar Gallup."
  },
  "Epinion": {
    rating: 87, grade: "A-",
    avgError: 0.95, methodology: "Kombineret (telefon + web)",
    client: "DR & Altinget", sampleSize: "~1.600–2.000",
    weight: 1.20,
    desc: "Store stikprøver og stærk metodik. Udfører målinger for public service-kanalen DR."
  },
  "Megafon": {
    rating: 84, grade: "B+",
    avgError: 0.95, methodology: "Onlinepanel + telefon",
    client: "TV 2 & Politiken", sampleSize: "~1.000",
    weight: 1.10,
    desc: "Stabil præstation med moderate huseffekter. Udfører målinger for TV 2."
  },
  "Voxmeter": {
    rating: 81, grade: "B+",
    avgError: 1.60, methodology: "Telefon + webpanel",
    client: "Ritzaus Bureau", sampleSize: "~1.000",
    weight: 0.90,
    desc: "Hyppigste institut med ugentlige udgivelser. Giver fremragende trenddata trods større fejlmargin."
  },
};

// ── Fallback-data (bruges kun hvis persisteret data ikke kan hentes) ──
const FALLBACK_POLLS = [
  { date: "2026-02-27", pollster: "Epinion", n: 2034, A: 21.6, V: 10.8, M: 5.8, F: 13.5, Æ: 8.5, I: 10.0, C: 6.8, Ø: 6.8, B: 4.8, Å: 2.2, O: 6.9, H: 1.8 },
  { date: "2026-02-27", pollster: "Megafon", n: 1012, A: 22.0, V: 10.5, M: 6.2, F: 13.2, Æ: 8.7, I: 10.2, C: 6.5, Ø: 6.5, B: 4.5, Å: 2.0, O: 7.2, H: 1.9 },
  { date: "2026-02-22", pollster: "Voxmeter", n: 1005, A: 21.5, V: 11.0, M: 6.4, F: 13.5, Æ: 9.2, I: 10.0, C: 6.8, Ø: 6.2, B: 4.3, Å: 2.1, O: 6.5, H: 2.1 },
  { date: "2026-02-15", pollster: "Voxmeter", n: 1005, A: 21.2, V: 11.5, M: 6.7, F: 13.8, Æ: 9.7, I: 9.6, C: 6.6, Ø: 6.1, B: 4.1, Å: 1.9, O: 5.7, H: 2.3 },
  { date: "2026-02-08", pollster: "Voxmeter", n: 1003, A: 22.5, V: 11.2, M: 6.3, F: 13.0, Æ: 9.0, I: 10.1, C: 6.5, Ø: 6.3, B: 4.5, Å: 2.0, O: 6.0, H: 2.0 },
  { date: "2026-02-04", pollster: "Megafon", n: 1008, A: 22.7, V: 10.8, M: 5.9, F: 13.4, Æ: 8.3, I: 10.5, C: 7.0, Ø: 6.4, B: 4.3, Å: 1.9, O: 6.8, H: 1.5 },
  { date: "2026-01-29", pollster: "Verian", n: 1700, A: 21.6, V: 10.6, M: 6.1, F: 13.3, Æ: 8.9, I: 10.3, C: 6.6, Ø: 6.6, B: 4.4, Å: 2.2, O: 6.5, H: 2.1 },
  { date: "2026-01-22", pollster: "Epinion", n: 2034, A: 21.6, V: 10.5, M: 4.6, F: 14.2, Æ: 9.2, I: 10.8, C: 7.0, Ø: 6.5, B: 4.5, Å: 2.0, O: 7.0, H: 1.8 },
  { date: "2026-01-18", pollster: "Voxmeter", n: 1005, A: 22.0, V: 11.0, M: 5.5, F: 13.5, Æ: 9.0, I: 10.5, C: 6.8, Ø: 6.5, B: 4.5, Å: 2.0, O: 6.2, H: 2.0 },
  { date: "2025-12-21", pollster: "Voxmeter", n: 1005, A: 18.9, V: 12.2, M: 2.8, F: 13.9, Æ: 10.0, I: 11.2, C: 7.9, Ø: 6.1, B: 5.4, Å: 2.1, O: 6.8, H: 2.3 },
  { date: "2025-12-14", pollster: "Voxmeter", n: 1000, A: 18.6, V: 11.7, M: 2.4, F: 14.3, Æ: 9.2, I: 11.7, C: 7.8, Ø: 7.0, B: 5.2, Å: 2.0, O: 8.0, H: 1.7 },
  { date: "2025-12-11", pollster: "Epinion", n: 2034, A: 16.5, V: 11.6, M: 1.5, F: 16.0, Æ: 9.9, I: 10.4, C: 8.5, Ø: 6.8, B: 5.1, Å: 1.7, O: 9.3, H: 2.2 },
  { date: "2025-12-07", pollster: "Voxmeter", n: 1005, A: 18.0, V: 11.3, M: 2.7, F: 15.6, Æ: 8.6, I: 12.2, C: 7.0, Ø: 7.7, B: 4.6, Å: 1.6, O: 8.1, H: 2.0 },
  { date: "2025-12-04", pollster: "Megafon", n: 1008, A: 17.7, V: 12.7, M: 2.2, F: 14.8, Æ: 8.4, I: 11.9, C: 8.6, Ø: 7.3, B: 4.7, Å: 1.7, O: 7.9, H: 1.1 },
  { date: "2025-12-02", pollster: "Verian", n: 1672, A: 19.5, V: 11.3, M: 3.3, F: 15.7, Æ: 9.6, I: 11.0, C: 7.3, Ø: 5.7, B: 4.8, Å: 1.7, O: 8.7, H: 1.0 },
  { date: "2025-11-30", pollster: "Voxmeter", n: 1002, A: 19.4, V: 12.0, M: 2.9, F: 14.7, Æ: 8.5, I: 10.9, C: 7.2, Ø: 7.0, B: 4.0, Å: 2.2, O: 8.9, H: 2.0 },
  { date: "2025-11-25", pollster: "Epinion", n: 2034, A: 17.5, V: 11.5, M: 1.8, F: 14.1, Æ: 10.5, I: 11.8, C: 8.8, Ø: 6.5, B: 3.7, Å: 3.0, O: 8.7, H: 1.4 },
  { date: "2025-11-23", pollster: "Voxmeter", n: 1024, A: 19.3, V: 11.5, M: 2.4, F: 13.0, Æ: 8.2, I: 12.8, C: 7.3, Ø: 7.6, B: 5.2, Å: 1.7, O: 8.3, H: 2.0 },
  { date: "2025-11-16", pollster: "Voxmeter", n: 1007, A: 19.9, V: 10.4, M: 2.9, F: 12.1, Æ: 9.2, I: 11.4, C: 7.2, Ø: 7.7, B: 6.2, Å: 2.1, O: 8.3, H: 2.1 },
  { date: "2025-11-09", pollster: "Voxmeter", n: 1005, A: 21.1, V: 9.6, M: 3.1, F: 12.2, Æ: 9.5, I: 9.9, C: 7.9, Ø: 6.6, B: 5.8, Å: 1.8, O: 8.4, H: 3.1 },
  { date: "2025-11-06", pollster: "Megafon", n: 1006, A: 19.8, V: 11.2, M: 2.8, F: 16.2, Æ: 8.0, I: 10.9, C: 7.0, Ø: 7.2, B: 4.4, Å: 1.9, O: 9.4, H: 0.4 },
  { date: "2025-11-04", pollster: "Verian", n: 1784, A: 22.8, V: 10.5, M: 3.3, F: 12.5, Æ: 7.6, I: 10.5, C: 7.9, Ø: 7.3, B: 3.8, Å: 1.3, O: 10.1, H: 0.9 },
  { date: "2025-11-02", pollster: "Voxmeter", n: 1005, A: 21.1, V: 10.5, M: 3.5, F: 12.3, Æ: 8.0, I: 10.8, C: 7.1, Ø: 7.0, B: 5.4, Å: 2.1, O: 9.6, H: 2.1 },
  { date: "2025-10-26", pollster: "Voxmeter", n: 1002, A: 21.2, V: 10.4, M: 4.4, F: 12.6, Æ: 9.3, I: 11.3, C: 6.3, Ø: 6.7, B: 4.1, Å: 1.8, O: 9.4, H: 2.2 },
  { date: "2025-10-19", pollster: "Voxmeter", n: 1004, A: 20.0, V: 11.8, M: 3.7, F: 12.4, Æ: 9.0, I: 11.0, C: 6.4, Ø: 7.2, B: 4.2, Å: 2.3, O: 9.2, H: 2.0 },
  { date: "2025-10-12", pollster: "Voxmeter", n: 1004, A: 20.3, V: 10.7, M: 3.3, F: 12.5, Æ: 9.5, I: 12.2, C: 6.2, Ø: 6.3, B: 5.2, Å: 2.9, O: 8.9, H: 1.5 },
  { date: "2025-10-02", pollster: "Epinion", n: 2052, A: 20.9, V: 9.1, M: 2.7, F: 12.5, Æ: 7.9, I: 11.4, C: 6.2, Ø: 7.6, B: 4.8, Å: 2.4, O: 12.0, H: 1.4 },
  { date: "2025-10-05", pollster: "Voxmeter", n: 1031, A: 19.2, V: 9.5, M: 4.2, F: 13.1, Æ: 9.1, I: 13.0, C: 6.9, Ø: 7.3, B: 4.8, Å: 2.2, O: 8.3, H: 1.8 },
  { date: "2025-09-30", pollster: "Verian", n: 1638, A: 22.1, V: 10.3, M: 3.1, F: 14.2, Æ: 8.6, I: 12.3, C: 5.7, Ø: 7.2, B: 4.2, Å: 1.2, O: 9.2, H: 0.9 },
  { date: "2025-09-28", pollster: "Voxmeter", n: 1006, A: 20.4, V: 10.0, M: 3.4, F: 12.0, Æ: 9.6, I: 11.7, C: 7.0, Ø: 7.3, B: 4.2, Å: 2.7, O: 8.1, H: 2.3 },
  { date: "2025-09-25", pollster: "Megafon", n: 1014, A: 21.6, V: 9.0, M: 3.2, F: 12.6, Æ: 8.8, I: 12.8, C: 8.1, Ø: 7.2, B: 4.9, Å: 1.7, O: 7.8, H: 1.7 },
  { date: "2025-09-21", pollster: "Voxmeter", n: 1014, A: 21.7, V: 10.7, M: 3.0, F: 12.5, Æ: 8.4, I: 12.3, C: 6.6, Ø: 8.2, B: 3.5, Å: 2.0, O: 8.4, H: 2.1 },
  { date: "2025-09-14", pollster: "Voxmeter", n: 1006, A: 22.0, V: 9.2, M: 3.0, F: 12.6, Æ: 9.2, I: 12.8, C: 6.0, Ø: 7.8, B: 3.6, Å: 3.2, O: 7.8, H: 1.4 },
  { date: "2025-09-07", pollster: "Voxmeter", n: 1000, A: 21.4, V: 11.0, M: 3.2, F: 13.3, Æ: 10.2, I: 11.8, C: 6.2, Ø: 7.4, B: 3.9, Å: 2.6, O: 6.5, H: 1.9 },
  { date: "2025-08-31", pollster: "Voxmeter", n: 1001, A: 19.5, V: 9.4, M: 3.2, F: 14.7, Æ: 9.3, I: 13.3, C: 7.1, Ø: 6.8, B: 4.4, Å: 2.3, O: 7.8, H: 1.3 },
  { date: "2025-08-24", pollster: "Voxmeter", n: 1004, A: 20.3, V: 10.6, M: 3.3, F: 14.5, Æ: 10.0, I: 11.6, C: 6.7, Ø: 6.3, B: 5.1, Å: 2.1, O: 7.5, H: 1.0 },
  { date: "2025-08-20", pollster: "Epinion", n: 1582, A: 19.5, V: 10.0, M: 3.9, F: 15.2, Æ: 8.9, I: 12.5, C: 6.0, Ø: 7.3, B: 4.3, Å: 2.1, O: 8.1, H: 1.0 },
  { date: "2025-08-17", pollster: "Voxmeter", n: 1065, A: 21.6, V: 9.6, M: 2.7, F: 13.0, Æ: 9.4, I: 12.8, C: 7.2, Ø: 7.2, B: 4.5, Å: 2.5, O: 6.9, H: 1.8 },
  { date: "2025-06-29", pollster: "Voxmeter", n: 1002, A: 22.4, V: 11.0, M: 4.0, F: 13.0, Æ: 8.7, I: 13.1, C: 6.2, Ø: 7.0, B: 4.3, Å: 1.9, O: 5.8, H: 2.5 },
  { date: "2025-06-22", pollster: "Voxmeter", n: 1052, A: 21.6, V: 10.9, M: 2.9, F: 13.8, Æ: 10.2, I: 12.2, C: 6.1, Ø: 7.3, B: 3.7, Å: 2.6, O: 5.6, H: 2.5 },
  { date: "2025-06-19", pollster: "Megafon", n: 1018, A: 22.2, V: 11.3, M: 3.3, F: 14.2, Æ: 7.7, I: 12.0, C: 7.5, Ø: 6.5, B: 5.1, Å: 1.7, O: 6.7, H: 1.5 },
  { date: "2025-06-15", pollster: "Voxmeter", n: 1007, A: 22.7, V: 10.1, M: 3.1, F: 13.2, Æ: 10.1, I: 12.5, C: 6.2, Ø: 8.2, B: 4.2, Å: 3.1, O: 4.8, H: 1.4 },
  { date: "2025-06-08", pollster: "Voxmeter", n: 1011, A: 23.8, V: 11.1, M: 3.6, F: 12.5, Æ: 10.5, I: 10.8, C: 6.1, Ø: 7.5, B: 4.4, Å: 2.5, O: 5.0, H: 1.7 },
  { date: "2025-06-02", pollster: "Epinion", n: 1582, A: 21.1, V: 9.4, M: 4.1, F: 14.3, Æ: 9.5, I: 11.7, C: 5.4, Ø: 7.5, B: 4.1, Å: 2.8, O: 7.6, H: 1.8 },
  { date: "2025-05-25", pollster: "Voxmeter", n: 1003, A: 23.8, V: 10.9, M: 4.4, F: 13.2, Æ: 8.5, I: 13.1, C: 6.6, Ø: 6.7, B: 4.5, Å: 2.4, O: 3.7, H: 2.1 },
  { date: "2025-05-18", pollster: "Voxmeter", n: 1001, A: 24.0, V: 10.0, M: 3.3, F: 13.9, Æ: 9.6, I: 13.3, C: 5.7, Ø: 6.7, B: 4.9, Å: 2.1, O: 4.4, H: 1.7 },
  { date: "2025-05-11", pollster: "Voxmeter", n: 1007, A: 23.4, V: 10.6, M: 3.4, F: 12.8, Æ: 9.3, I: 12.3, C: 6.2, Ø: 7.3, B: 4.2, Å: 3.0, O: 5.2, H: 0.9 },
  { date: "2025-05-04", pollster: "Voxmeter", n: 1003, A: 22.9, V: 9.2, M: 3.8, F: 14.1, Æ: 9.9, I: 13.5, C: 5.4, Ø: 8.0, B: 4.7, Å: 1.9, O: 5.2, H: 1.1 },
  { date: "2025-04-29", pollster: "Epinion", n: 1483, A: 22.9, V: 10.3, M: 3.9, F: 13.6, Æ: 10.4, I: 13.1, C: 5.7, Ø: 7.1, B: 4.4, Å: 2.6, O: 5.7, H: 1.1 },
  { date: "2025-04-27", pollster: "Voxmeter", n: 1005, A: 22.4, V: 9.5, M: 3.5, F: 13.7, Æ: 9.6, I: 14.0, C: 6.4, Ø: 7.8, B: 4.0, Å: 2.0, O: 4.9, H: 1.7 },
  { date: "2025-04-20", pollster: "Voxmeter", n: 1002, A: 23.5, V: 10.0, M: 3.5, F: 12.7, Æ: 9.2, I: 13.1, C: 5.6, Ø: 7.6, B: 4.9, Å: 2.1, O: 4.8, H: 2.4 },
  { date: "2025-04-13", pollster: "Voxmeter", n: 1007, A: 22.6, V: 9.2, M: 3.5, F: 13.9, Æ: 9.2, I: 12.2, C: 6.1, Ø: 7.1, B: 6.4, Å: 2.9, O: 4.1, H: 1.9 },
  { date: "2025-04-06", pollster: "Voxmeter", n: 1016, A: 22.8, V: 10.1, M: 4.3, F: 14.0, Æ: 9.2, I: 13.8, C: 5.6, Ø: 6.2, B: 5.3, Å: 2.2, O: 4.5, H: 1.5 },
  { date: "2025-04-01", pollster: "Verian", n: 1641, A: 22.5, V: 10.8, M: 3.8, F: 15.0, Æ: 8.3, I: 12.9, C: 5.8, Ø: 6.9, B: 4.0, Å: 1.6, O: 5.3, H: 1.8 },
  { date: "2025-03-30", pollster: "Voxmeter", n: 1076, A: 22.6, V: 10.4, M: 3.2, F: 13.3, Æ: 10.4, I: 13.0, C: 6.4, Ø: 6.9, B: 4.8, Å: 2.0, O: 4.7, H: 1.8 },
  { date: "2025-03-26", pollster: "Epinion", n: 1640, A: 23.2, V: 9.3, M: 3.6, F: 14.9, Æ: 10.8, I: 12.8, C: 5.5, Ø: 6.6, B: 4.7, Å: 2.0, O: 4.5, H: 1.2 },
  { date: "2025-03-23", pollster: "Voxmeter", n: 1002, A: 23.8, V: 9.3, M: 4.0, F: 12.5, Æ: 9.4, I: 12.2, C: 7.0, Ø: 6.3, B: 5.2, Å: 2.2, O: 5.2, H: 1.9 },
  { date: "2025-03-16", pollster: "Voxmeter", n: 1005, A: 23.4, V: 10.5, M: 3.4, F: 13.2, Æ: 10.4, I: 11.8, C: 6.5, Ø: 6.5, B: 4.0, Å: 2.5, O: 4.8, H: 2.1 },
  { date: "2025-03-09", pollster: "Voxmeter", n: 1002, A: 23.2, V: 9.8, M: 3.3, F: 14.4, Æ: 10.1, I: 11.2, C: 6.8, Ø: 6.9, B: 4.6, Å: 2.2, O: 4.8, H: 1.3 },
  { date: "2025-03-04", pollster: "Verian", n: 1797, A: 21.9, V: 11.1, M: 4.3, F: 14.5, Æ: 9.2, I: 10.5, C: 7.6, Ø: 6.5, B: 4.4, Å: 2.2, O: 5.3, H: 1.6 },
  { date: "2025-02-02", pollster: "Voxmeter", n: 1012, A: 22.6, V: 11.1, M: 3.5, F: 15.0, Æ: 10.0, I: 12.1, C: 6.2, Ø: 5.8, B: 4.0, Å: 2.3, O: 4.2, H: 1.7 },
  { date: "2025-02-23", pollster: "Voxmeter", n: 1013, A: 21.8, V: 10.5, M: 3.5, F: 13.6, Æ: 10.0, I: 13.2, C: 6.2, Ø: 6.5, B: 4.3, Å: 2.7, O: 4.2, H: 2.2 },
  { date: "2025-02-16", pollster: "Voxmeter", n: 1002, A: 21.0, V: 10.3, M: 4.1, F: 14.2, Æ: 9.7, I: 12.2, C: 6.7, Ø: 6.9, B: 4.5, Å: 2.7, O: 5.3, H: 1.3 },
  { date: "2025-02-09", pollster: "Voxmeter", n: 1028, A: 19.9, V: 10.7, M: 4.0, F: 14.2, Æ: 9.3, I: 11.6, C: 6.9, Ø: 8.0, B: 4.5, Å: 2.3, O: 4.7, H: 1.6 },
  { date: "2025-02-04", pollster: "Verian", n: 1897, A: 23.0, V: 11.4, M: 4.0, F: 14.4, Æ: 9.6, I: 9.2, C: 7.2, Ø: 6.6, B: 4.4, Å: 1.8, O: 5.4, H: 1.8 },
  { date: "2025-01-26", pollster: "Voxmeter", n: 1009, A: 19.7, V: 8.6, M: 4.4, F: 15.8, Æ: 11.5, I: 11.6, C: 6.8, Ø: 6.8, B: 4.1, Å: 2.4, O: 4.9, H: 1.8 },
  { date: "2025-01-19", pollster: "Voxmeter", n: 1020, A: 19.3, V: 10.3, M: 4.5, F: 14.2, Æ: 9.3, I: 12.6, C: 7.9, Ø: 6.2, B: 4.5, Å: 2.1, O: 5.7, H: 2.3 },
  { date: "2025-01-12", pollster: "Voxmeter", n: 1002, A: 20.4, V: 8.4, M: 4.1, F: 14.9, Æ: 10.0, I: 12.3, C: 7.4, Ø: 6.8, B: 5.4, Å: 2.1, O: 5.4, H: 1.8 },
];

const PARTY_KEYS = ["A", "F", "V", "I", "Æ", "C", "Ø", "B", "O", "Å", "M", "H"];

// ── Types ─────────────────────────────────────────────────────────
type Poll = {
  date: string;
  pollster: string;
  n: number;
  [key: string]: string | number;
};

// ── Danske månedsnavne ────────────────────────────────────────────
const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function formatDateDa(d: Date | string) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getDate()}. ${DA_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
function formatMonthYearDa(d: Date | string) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${DA_MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(2)}`;
}

// ── Beregning af vægtet gennemsnit (538-style with recency + pollster + sample weight) ────────────────────────────────
function calcWeightedAverage(polls: Poll[], partyKey: string, asOfDate?: string) {
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const relevant = polls
    .filter(p => p[partyKey] !== undefined && p[partyKey] !== null && p[partyKey] !== "")
    .map(p => {
      const d = new Date(p.date);
      const daysDiff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-daysDiff / 30);                    // 30-day half-life, same idea as 538
      const pollsterWeight = POLLSTERS[p.pollster]?.weight || 1.0;
      const sizeWeight = Math.sqrt((p.n || 1000) / 1000);

      return {
        value: Number(p[partyKey]),   // ← THIS IS THE FIX (forces number, handles both 21.6 and "21.6")
        weight: recency * pollsterWeight * sizeWeight,
      };
    });

  if (relevant.length === 0) return null;

  const totalWeight = relevant.reduce((s, r) => s + r.weight, 0);
  return relevant.reduce((s, r) => s + r.value * r.weight, 0) / totalWeight;
}

function generateWeightedSeries(polls: Poll[], partyKey: string) {
  const sorted = [...polls].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dates = [...new Set(sorted.map(p => p.date))].sort();
  return dates.map(date => ({
    date,
    value: calcWeightedAverage(sorted.filter(p => new Date(p.date).getTime() <= new Date(date).getTime()), partyKey, date),
  })).filter(d => d.value !== null);
}

// ── Dage til valg ─────────────────────────────────────────────────
function daysUntilElection() {
  const election = new Date("2026-03-24");
  const now = new Date();
  return Math.max(0, Math.ceil((election.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── SVG Graf-komponent ────────────────────────────────────────────
function PollChart({ polls, selectedParties, selectedPollsters, showDots, fromDate, width = 900, height = 420 }: {
  polls: Poll[];
  selectedParties: string[];
  selectedPollsters: Set<string>;
  showDots: boolean;
  fromDate?: Date | null;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState<{x: number, y: number, poll: Poll} | null>(null);

  const margin = { top: 20, right: 30, bottom: 50, left: 45 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const filteredPolls = useMemo(() =>
    polls.filter(p => selectedPollsters.has(p.pollster)), [polls, selectedPollsters]);

  const xScale = useMemo(() => {
    const dates = filteredPolls.map(p => new Date(p.date));
    const domainStart = fromDate || d3.min(dates) || new Date("2025-01-01");
    return d3.scaleTime()
      .domain([domainStart, new Date("2026-03-24")])
      .range([0, innerW]);
  }, [filteredPolls, innerW, fromDate]);

  const yScale = useMemo(() => d3.scaleLinear().domain([0, 30]).range([innerH, 0]), [innerH]);

  const weightedSeries = useMemo(() => {
    const series = {};
    selectedParties.forEach(pk => { series[pk] = generateWeightedSeries(filteredPolls, pk); });
    return series;
  }, [filteredPolls, selectedParties]);

  const lineGen = useMemo(() =>
    d3.line().x(d => xScale(new Date(d.date))).y(d => yScale(d.value)).curve(d3.curveBasis),
    [xScale, yScale]);

  const handleMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const x = (e.clientX - rect.left) * scaleX - margin.left;
    const date = xScale.invert(x);
    let closest = null; let minDist = Infinity;
    filteredPolls.forEach(p => {
      const dist = Math.abs(new Date(p.date).getTime() - date.getTime());
      if (dist < minDist) { minDist = dist; closest = p; }
    });
    if (closest && minDist < 7 * 24 * 3600 * 1000) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, poll: closest });
    } else { setTooltip(null); }
  }, [filteredPolls, xScale, margin.left]);

  const xTicks = useMemo(() => {
    const [start, end] = xScale.domain();
    const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const step = Math.max(1, Math.round(months / 6));
    return xScale.ticks(d3.timeMonth.every(step));
  }, [xScale]);
  const yTicks = yScale.ticks(6);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yTicks.map(t => (
            <line key={t} x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          {xTicks.map((t, i) => (
            <line key={i} x1={xScale(t)} x2={xScale(t)} y1={0} y2={innerH} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          {yTicks.map(t => (
            <text key={t} x={-10} y={yScale(t)} fill="#64748b" fontSize="11"
              textAnchor="end" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace">{t}%</text>
          ))}
          {xTicks.map((t, i) => (
            <text key={i} x={xScale(t)} y={innerH + 25} fill="#64748b" fontSize="11"
              textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{formatMonthYearDa(t)}</text>
          ))}

          {/* Individuelle målinger som prikker */}
          {showDots && selectedParties.map(pk =>
            filteredPolls.filter(p => p[pk] !== undefined && (!fromDate || new Date(p.date) >= fromDate)).map((p, i) => (
              <circle key={`${pk}-${i}`} cx={xScale(new Date(p.date))} cy={yScale(p[pk])} r={2.5}
                fill={PARTIES[pk].color} opacity={0.35} />
            ))
          )}

          {/* Vægtede gennemsnitslinjer */}
          {selectedParties.map(pk => {
            const series = weightedSeries[pk];
            if (!series || series.length < 2) return null;
            return <path key={pk} d={lineGen(series)} fill="none" stroke={PARTIES[pk].color}
              strokeWidth={2.5} strokeLinecap="round" />;
          })}

          {/* Valgdato-markering */}
          {(() => {
            const x = xScale(new Date("2026-03-24"));
            if (x > 0 && x < innerW) return (
              <g>
                <line x1={x} x2={x} y1={0} y2={innerH} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,4" />
                <text x={x} y={-6} fill="#ef4444" fontSize="10" textAnchor="middle"
                  fontFamily="'JetBrains Mono', monospace" fontWeight="600">VALG 24. MAR</text>
              </g>
            );
            return null;
          })()}

          {/* 2% spærregrænse */}
          <line x1={0} x2={innerW} y1={yScale(2)} y2={yScale(2)} stroke="#ef444480" strokeWidth="1" strokeDasharray="2,4" />
          <text x={innerW + 4} y={yScale(2)} fill="#ef444480" fontSize="9" dominantBaseline="middle"
            fontFamily="'JetBrains Mono', monospace">2%</text>

          {tooltip && (
            <line x1={xScale(new Date(tooltip.poll.date))} x2={xScale(new Date(tooltip.poll.date))}
              y1={0} y2={innerH} stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
          )}
        </g>
      </svg>

      {tooltip && (
        <div style={{
          position: "absolute", left: Math.min(tooltip.x + 12, width - 240), top: Math.max(tooltip.y - 20, 0),
          background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px",
          fontSize: "12px", color: "#e2e8f0", pointerEvents: "none", zIndex: 10, minWidth: "210px",
          fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#f8fafc" }}>
            {tooltip.poll.pollster} · {formatDateDa(tooltip.poll.date)}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Stikprøve: {tooltip.poll.n}</div>
          {selectedParties.map(pk => (
            tooltip.poll[pk] !== undefined && (
              <div key={pk} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "1px 0" }}>
                <span style={{ color: PARTIES[pk].color, fontWeight: 600 }}>{PARTIES[pk].short}</span>
                <span>{tooltip.poll[pk].toFixed(1)}%</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Institut-kort ─────────────────────────────────────────────────
function PollsterCard({ name, data }: { name: string; data: typeof POLLSTERS[keyof typeof POLLSTERS] }) {
  const gradeColor = { "A": "#22c55e", "A-": "#4ade80", "B+": "#facc15", "B": "#fb923c" }[data.grade] || "#94a3b8";
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", fontFamily: "'Space Grotesk', sans-serif" }}>{name}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>{data.client}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", border: `2.5px solid ${gradeColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", fontWeight: 800, color: gradeColor, fontFamily: "'JetBrains Mono', monospace",
        }}>{data.grade}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 8, padding: "10px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Score</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
            {data.rating}<span style={{ fontSize: 12, color: "#64748b" }}>/100</span>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 8, padding: "10px" }}>
          <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Gns. fejl</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
            ±{data.avgError}<span style={{ fontSize: 12, color: "#64748b" }}>pp</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>{data.desc}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, background: "rgba(255,255,255,0.09)", color: "#94a3b8", padding: "3px 8px", borderRadius: 4 }}>{data.methodology}</span>
        <span style={{ fontSize: 10, background: "rgba(255,255,255,0.09)", color: "#94a3b8", padding: "3px 8px", borderRadius: 4 }}>n ≈ {data.sampleSize}</span>
      </div>
    </div>
  );
}

// ── Hoved-app ─────────────────────────────────────────────────────
export default function DanskValgbarometer() {
  const [polls, setPolls] = useState<Poll[]>(FALLBACK_POLLS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState("lokal");
  const [loading, setLoading] = useState(true);
  const [selectedParties, setSelectedParties] = useState(new Set(["A", "F", "V", "I", "Æ", "C"]));
  const [selectedPollsters, setSelectedPollsters] = useState(new Set(Object.keys(POLLSTERS)));
  const [showDots, setShowDots] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  // ── Hent data fra localStorage eller brug fallback ────────
  useEffect(() => {
    async function loadData() {
      try {
        const raw = localStorage.getItem("polls-data");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.polls && parsed.polls.length > 0) {
            setPolls(parsed.polls);
            setLastUpdated(parsed.lastUpdated || null);
            setDataSource("gemt");
          }
        }
      } catch (e) {
        // Ingen gemt data — brug fallback
      }
      setLoading(false);
    }
    loadData();
  }, []);


  const toggleParty = (pk) => {
    setSelectedParties(prev => { const n = new Set(prev); n.has(pk) ? n.delete(pk) : n.add(pk); return n; });
  };
  const togglePollster = (name) => {
    setSelectedPollsters(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  };

  const currentAverages = useMemo(() => {
    const avgs = {};
    PARTY_KEYS.forEach(pk => { avgs[pk] = calcWeightedAverage(polls, pk); });
    return avgs;
  }, [polls]);

  const sortedParties = useMemo(() =>
    [...PARTY_KEYS].sort((a, b) => (currentAverages[b] || 0) - (currentAverages[a] || 0)),
    [currentAverages]);

  const latestPolls = useMemo(() =>
    [...polls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
    [polls]);

  const fromDate = useMemo(() => {
    const now = new Date();
    if (timeRange === "3m") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    if (timeRange === "6m") return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    if (timeRange === "1y") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return null;
  }, [timeRange]);

  const daysLeft = daysUntilElection();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0c1a3e", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗳️</div>
          <div>Indlæser måledata...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 10%, rgba(50,100,200,0.28) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(200,16,46,0.12) 0%, transparent 55%), #0c1a3e", color: "#e2e8f0", fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>

        {/* ── Aktuel gennemsnit-bar ──────────────────────────────── */}
        <div style={{
          display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: 24, padding: "16px",
          background: "rgba(255,255,255,0.09)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 4px 32px rgba(0,0,0,0.3)",
        }}>
          <div style={{ width: "100%", fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            Aktuelt vægtet gennemsnit
          </div>
          {sortedParties.map(pk => {
            const avg = currentAverages[pk];
            if (!avg || avg < 0.5) return null;
            return (
              <div key={pk} onClick={() => toggleParty(pk)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                background: selectedParties.has(pk) ? `${PARTIES[pk].color}20` : "#1e293b",
                border: `1.5px solid ${selectedParties.has(pk) ? PARTIES[pk].color : "#334155"}`,
                borderRadius: "8px", cursor: "pointer", transition: "all 0.15s ease",
                opacity: selectedParties.has(pk) ? 1 : 0.5,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: PARTIES[pk].color, flexShrink: 0 }} />
                <span style={{ fontSize: "12px", fontWeight: 700, color: PARTIES[pk].color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {PARTIES[pk].short}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
                  {avg.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Meningsmålinger ────────────────────────────────────── */}
        <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginRight: 4 }}>INSTITUTTER:</span>
                {Object.keys(POLLSTERS).map(name => (
                  <button key={name} onClick={() => togglePollster(name)} style={{
                    padding: "4px 10px", fontSize: "11px", fontWeight: 600,
                    background: selectedPollsters.has(name) ? "rgba(255,255,255,0.1)" : "transparent",
                    color: selectedPollsters.has(name) ? "#e2e8f0" : "#475569",
                    border: `1px solid ${selectedPollsters.has(name) ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`,
                    borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                  }}>{name}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginRight: 2 }}>PERIODE:</span>
                {[
                  { id: "3m", label: "3 mdr" },
                  { id: "6m", label: "6 mdr" },
                  { id: "1y", label: "1 år" },
                  { id: "all", label: "Alt" },
                ].map(r => (
                  <button key={r.id} onClick={() => setTimeRange(r.id)} style={{
                    padding: "4px 10px", fontSize: "11px", fontWeight: 600,
                    background: timeRange === r.id ? "#1e3a5f" : "transparent",
                    color: timeRange === r.id ? "#93c5fd" : "#475569",
                    border: `1px solid ${timeRange === r.id ? "#3b82f6" : "#1e293b"}`,
                    borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
                  }}>{r.label}</button>
                ))}
              </div>
              <button onClick={() => setShowDots(!showDots)} style={{
                padding: "4px 10px", fontSize: "11px", fontWeight: 600,
                background: showDots ? "rgba(255,255,255,0.1)" : "transparent",
                color: showDots ? "#e2e8f0" : "#475569",
                border: `1px solid ${showDots ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)"}`,
                borderRadius: "6px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
              }}>{showDots ? "● PRIKKER TIL" : "○ PRIKKER FRA"}</button>
            </div>

            <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.09)", padding: "20px 16px 12px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
              <PollChart polls={polls} selectedParties={[...selectedParties]} selectedPollsters={selectedPollsters} showDots={showDots} fromDate={fromDate} />
            </div>

            {/* Parti-liste */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 16 }}>
              {sortedParties.map(pk => {
                const avg = currentAverages[pk];
                const change = avg ? (avg - PARTIES[pk].result2022).toFixed(1) : null;
                if (!avg || avg < 0.5) return null;
                return (
                  <div key={pk} onClick={() => toggleParty(pk)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: selectedParties.has(pk) ? `${PARTIES[pk].color}14` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedParties.has(pk) ? PARTIES[pk].color + "65" : "rgba(255,255,255,0.09)"}`,
                    borderRadius: "8px", cursor: "pointer", opacity: selectedParties.has(pk) ? 1 : 0.4,
                    transition: "all 0.15s ease",
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: PARTIES[pk].color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {PARTIES[pk].name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace" }}>
                        {avg.toFixed(1)}%
                      </span>
                      {change && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600, marginLeft: 4, fontFamily: "'JetBrains Mono', monospace",
                          color: parseFloat(change) > 0 ? "#22c55e" : parseFloat(change) < 0 ? "#ef4444" : "#64748b",
                        }}>{parseFloat(change) > 0 ? "+" : ""}{change}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Blokoversigt */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 20 }}>
              {[
                { label: "Rød Blok", color: "#C8102E", parties: ["A", "F", "Ø", "B", "Å"] },
                { label: "Blå Blok", color: "#254B8E", parties: ["V", "I", "Æ", "C", "O", "H"] },
                { label: "Moderaterne", color: "#8B5CF6", parties: ["M"] },
              ].map(bloc => {
                const total = bloc.parties.reduce((s, pk) => s + (currentAverages[pk] || 0), 0);
                const seats = Math.round(total * 175 / 100);
                return (
                  <div key={bloc.label} style={{
                    background: `linear-gradient(135deg, ${bloc.color}14 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${bloc.color}40`, borderRadius: "14px", padding: "20px 16px", textAlign: "center", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", boxShadow: `0 4px 24px ${bloc.color}10`,
                  }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>
                      {bloc.label}
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: bloc.color, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                      {total.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      ~{seats} mandater {seats >= 90 ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* ── Institutvurderinger ────────────────────────────────── */}
        <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 32 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700, color: "#93c5fd", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.02em" }}>
            Institutvurderinger
          </h2>
            <div style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "20px", marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                Sådan vurderer vi institutter
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                Vores vurderinger er baseret på historisk præcision — den gennemsnitlige afvigelse mellem et instituts
                sidste måling før valget og det faktiske resultat, målt i procentpoint per parti. Vi medregner også
                metodisk transparens, stikprøvestørrelse og huseffekter (systematisk skævhed mod bestemte partier).
                Disse vurderinger bestemmer den vægt hvert institut får i vores vægtede gennemsnit.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {Object.entries(POLLSTERS).sort((a, b) => b[1].rating - a[1].rating).map(([name, data]) => (
                <PollsterCard key={name} name={name} data={data} />
              ))}
            </div>

            <div style={{ marginTop: 20, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>Vægtningsmetode</h3>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 10px" }}>Vores vægtede målegennemsnit bruger tre faktorer for hver måling:</p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong style={{ color: "#f8fafc" }}>1. Institutvægt</strong> — Baseret på historiske fejlrater. Verian (tidl. Gallup) får højest vægt (1,35×) pga. 0,65pp gennemsnitsfejl. Voxmeter får 0,90× pga. højere fejlmargin.
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong style={{ color: "#f8fafc" }}>2. Aktualitetsfald</strong> — Målinger vægtes eksponentielt efter alder med 30-dages halveringstid. Nyere målinger har markant mere indflydelse.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#f8fafc" }}>3. Stikprøvestørrelse</strong> — Større stikprøver vægtes proportionalt højere (√n/1000-skalering).
                </p>
              </div>
            </div>
        </div>

        {/* ── Seneste målinger ───────────────────────────────────── */}
        <div style={{ marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 32 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700, color: "#93c5fd", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.02em" }}>
            Seneste målinger
          </h2>
          <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1e293b" }}>
                    <th style={{ padding: "12px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, position: "sticky", left: 0, background: "#0f172a", minWidth: 85 }}>Dato</th>
                    <th style={{ padding: "12px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, minWidth: 80 }}>Institut</th>
                    <th style={{ padding: "12px 6px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>n</th>
                    {sortedParties.filter(pk => currentAverages[pk] > 1).map(pk => (
                      <th key={pk} style={{ padding: "12px 6px", textAlign: "center", color: PARTIES[pk].color, fontWeight: 700, fontSize: "11px" }}>
                        {PARTIES[pk].short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "rgba(255,255,255,0.09)", borderBottom: "2px solid #334155" }}>
                    <td style={{ padding: "10px", fontWeight: 700, color: "#f8fafc", position: "sticky", left: 0, background: "rgba(255,255,255,0.09)" }}>GNS</td>
                    <td style={{ padding: "10px", color: "#94a3b8", fontWeight: 600 }}>Vægtet</td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#64748b" }}>—</td>
                    {sortedParties.filter(pk => currentAverages[pk] > 1).map(pk => (
                      <td key={pk} style={{ padding: "10px 6px", textAlign: "center", fontWeight: 700, color: "#f8fafc" }}>
                        {currentAverages[pk]?.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                  {latestPolls.map((poll, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "8px 10px", color: "#94a3b8", position: "sticky", left: 0, background: "#0f172a", whiteSpace: "nowrap" }}>
                        {poll.date.slice(5)}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#cbd5e1", fontWeight: 500 }}>{poll.pollster}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: "#64748b" }}>{poll.n}</td>
                      {sortedParties.filter(pk => currentAverages[pk] > 1).map(pk => {
                        const val = poll[pk];
                        const avg = currentAverages[pk];
                        const diff = val && avg ? val - avg : 0;
                        return (
                          <td key={pk} style={{
                            padding: "8px 6px", textAlign: "center",
                            color: Math.abs(diff) > 2 ? (diff > 0 ? "#4ade80" : "#fb7185") : "#cbd5e1",
                          }}>{val?.toFixed(1) || "—"}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center", fontSize: "11px", color: "#374868",
          fontFamily: "'JetBrains Mono', monospace", paddingBottom: 40,
        }}>
          <div>Dansk Valgbarometer · Måledata fra offentlige kilder · Ikke tilknyttet noget parti eller medie</div>
          <div style={{ marginTop: 6 }}>Institutvurderinger baseret på historisk præcisionsanalyse · Vægtet metodik inspireret af FiveThirtyEight</div>
          <div style={{ marginTop: 6, color: "#334155" }}>
            Valgdag: 24. marts 2026 · 90 mandater nødvendige for flertal i det 179-sæders Folketing
          </div>
        </div>
      </div>
    </div>
  );
}
