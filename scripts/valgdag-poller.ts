require("dotenv").config();

import SftpClient from "ssh2-sftp-client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { URL } from "url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG = {
  SFTP_HOST: "data.valg.dk",
  SFTP_USER: "Valg",
  SFTP_PASS: "Valg",
  SFTP_PORT: 22,
  SFTP_PATH: "/data/folketingsvalg-135-24-03-2026/valgresultater/",
  API_URL: process.env.API_URL || "https://valgidanmark.dk/api/valgresultater",
  API_SECRET: process.env.VALGDAG_API_SECRET || "",
  POLL_INTERVAL_MS: 45_000,
  RETRY_DELAY_MS: 10_000,
  TOTAL_AFSTEMNINGSOMRAADER: 1384,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SFTPResultFile {
  IndenforParti: Array<{
    PartiId: string;
    PartiNavn: string;
    Bogstavbetegnelse: string;
    Stemmer: number;
    Partistemmer: number;
    StemmerDifferenceFraForrigeValg: number;
    Kandidater: null;
  }>;
  UdenforParti: Array<{
    Id: string;
    Stemmeseddelnavn: string;
    Stemmer: number;
  }>;
  Valgdag: string;
  Valgart: string;
  FrigivelsesTidspunktUTC: string;
  Storkreds: string;
  Storkredsnummer: number;
  Opstillingskreds: string;
  OpstillingskredsDagiId: number;
  Kommune: string;
  Kommunekode: number;
  AfstemningsområdeNummer: number;
  AfstemningsområdeDagiId: number;
  Afstemningsområde: string;
  Resultatart: string;
  AfgivneStemmer: number;
  GyldigeStemmer: number;
  UgyldigeStemmerUdoverBlanke: number;
  BlankeUgyldigeFremmødteStemmer: number;
  BlankeUgyldigeBrevstemmer: number;
  AntalStemmeberettigedeVælgere: number;
}

interface PartyNational {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmeProcent: number;
  antalMandater: number | null;
  diffFraForrigeValg: number | null;
}

interface PartyStorkreds {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmeProcent: number;
}

interface PartyKommune {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmeProcent: number;
}

interface StorkredsSummary {
  navn: string;
  nummer: number;
  afgivneStemmer: number;
  gyldigeStemmer: number;
  stemmeberettigede: number;
  optalteAfstemningsomraader: number;
  totalAfstemningsomraader: number;
  partier: PartyStorkreds[];
}

interface KommuneSummary {
  navn: string;
  kommunekode: number;
  storkreds: string;
  afgivneStemmer: number;
  gyldigeStemmer: number;
  stemmeberettigede: number;
  optalteAfstemningsomraader: number;
  partier: PartyKommune[];
}

interface AggregatedResults {
  lastUpdated: string;
  totalAfstemningsomraader: number;
  optalteAfstemningsomraader: number;
  optaltProcent: number;
  national: {
    afgivneStemmer: number;
    gyldigeStemmer: number;
    stemmeberettigede: number;
    valgdeltagelse: number;
    partier: PartyNational[];
    udenforParti: Array<{ navn: string; stemmer: number }>;
  };
  perStorkreds: Record<string, StorkredsSummary>;
  perKommune: Record<string, KommuneSummary>;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}

function log(msg: string): void {
  console.log(`${timestamp()} ${msg}`);
}

function warn(msg: string): void {
  console.warn(`${timestamp()} WARN: ${msg}`);
}

function logError(msg: string): void {
  console.error(`${timestamp()} ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// Sainte-Laguë seat allocation
// ---------------------------------------------------------------------------

function sainteLague(
  votes: Record<string, number>,
  totalSeats: number
): Record<string, number> {
  const seats: Record<string, number> = {};
  const divisors: Record<string, number> = {};

  for (const bogstav of Object.keys(votes)) {
    seats[bogstav] = 0;
    divisors[bogstav] = 1;
  }

  for (let i = 0; i < totalSeats; i++) {
    let bestParty = "";
    let bestQuotient = -1;

    for (const bogstav of Object.keys(votes)) {
      const quotient = votes[bogstav] / divisors[bogstav];
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestParty = bogstav;
      }
    }

    if (!bestParty) break;

    seats[bestParty] += 1;
    divisors[bestParty] += 2;
  }

  return seats;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregateResults(files: SFTPResultFile[]): AggregatedResults {
  let totalAfgivne = 0;
  let totalGyldige = 0;
  let totalStemmeberettigede = 0;
  let optalte = 0;

  // national party accumulators
  const partyVotes: Record<string, number> = {};
  const partyNames: Record<string, string> = {};
  const partyDiff: Record<string, number> = {};

  // udenfor parti accumulators
  const udenforVotes: Record<string, number> = {};
  const udenforNames: Record<string, string> = {};

  // per storkreds accumulators
  const storkredsByNummer: Record<
    number,
    {
      navn: string;
      nummer: number;
      afgivne: number;
      gyldige: number;
      stemmeberettigede: number;
      optalte: number;
      total: number;
      partyVotes: Record<string, number>;
      partyNames: Record<string, string>;
    }
  > = {};

  // per kommune accumulators
  const kommuneByKode: Record<
    number,
    {
      navn: string;
      kommunekode: number;
      storkreds: string;
      afgivne: number;
      gyldige: number;
      stemmeberettigede: number;
      optalte: number;
      partyVotes: Record<string, number>;
      partyNames: Record<string, string>;
    }
  > = {};

  for (const file of files) {
    const isOptalt = file.Resultatart !== "IngenResultater";
    if (isOptalt) optalte += 1;

    totalAfgivne += file.AfgivneStemmer ?? 0;
    totalGyldige += file.GyldigeStemmer ?? 0;
    totalStemmeberettigede += file.AntalStemmeberettigedeVælgere ?? 0;

    // Init storkreds bucket
    const sk = file.Storkredsnummer;
    if (!storkredsByNummer[sk]) {
      storkredsByNummer[sk] = {
        navn: file.Storkreds,
        nummer: sk,
        afgivne: 0,
        gyldige: 0,
        stemmeberettigede: 0,
        optalte: 0,
        total: 0,
        partyVotes: {},
        partyNames: {},
      };
    }
    const skData = storkredsByNummer[sk];
    skData.afgivne += file.AfgivneStemmer ?? 0;
    skData.gyldige += file.GyldigeStemmer ?? 0;
    skData.stemmeberettigede += file.AntalStemmeberettigedeVælgere ?? 0;
    skData.total += 1;
    if (isOptalt) skData.optalte += 1;

    // Init kommune bucket
    const kk = file.Kommunekode;
    if (!kommuneByKode[kk]) {
      kommuneByKode[kk] = {
        navn: file.Kommune,
        kommunekode: kk,
        storkreds: file.Storkreds,
        afgivne: 0,
        gyldige: 0,
        stemmeberettigede: 0,
        optalte: 0,
        partyVotes: {},
        partyNames: {},
      };
    }
    const kkData = kommuneByKode[kk];
    kkData.afgivne += file.AfgivneStemmer ?? 0;
    kkData.gyldige += file.GyldigeStemmer ?? 0;
    kkData.stemmeberettigede += file.AntalStemmeberettigedeVælgere ?? 0;
    if (isOptalt) kkData.optalte += 1;

    // Accumulate party votes
    for (const parti of file.IndenforParti ?? []) {
      const b = parti.Bogstavbetegnelse;
      partyVotes[b] = (partyVotes[b] ?? 0) + (parti.Stemmer ?? 0);
      partyDiff[b] = (partyDiff[b] ?? 0) + (parti.StemmerDifferenceFraForrigeValg ?? 0);
      partyNames[b] = parti.PartiNavn;

      skData.partyVotes[b] = (skData.partyVotes[b] ?? 0) + (parti.Stemmer ?? 0);
      skData.partyNames[b] = parti.PartiNavn;

      kkData.partyVotes[b] = (kkData.partyVotes[b] ?? 0) + (parti.Stemmer ?? 0);
      kkData.partyNames[b] = parti.PartiNavn;
    }

    // Accumulate udenfor parti votes
    for (const u of file.UdenforParti ?? []) {
      const id = u.Id;
      udenforVotes[id] = (udenforVotes[id] ?? 0) + (u.Stemmer ?? 0);
      udenforNames[id] = u.Stemmeseddelnavn;
    }
  }

  // Compute valgdeltagelse
  const valgdeltagelse =
    totalStemmeberettigede > 0
      ? (totalAfgivne / totalStemmeberettigede) * 100
      : 0;

  // Sainte-Laguë – only parties with >= 2% stemmeprocent
  const eligibleVotes: Record<string, number> = {};
  for (const [b, v] of Object.entries(partyVotes)) {
    const pct = totalGyldige > 0 ? (v / totalGyldige) * 100 : 0;
    if (pct >= 2.0) {
      eligibleVotes[b] = v;
    }
  }
  const seatMap = sainteLague(eligibleVotes, 175);

  // Build national partier array
  const partier: PartyNational[] = Object.entries(partyVotes)
    .map(([b, stemmer]) => ({
      bogstav: b,
      navn: partyNames[b] ?? b,
      stemmer,
      stemmeProcent: totalGyldige > 0 ? (stemmer / totalGyldige) * 100 : 0,
      antalMandater: seatMap[b] !== undefined ? (seatMap[b] ?? 0) : null,
      diffFraForrigeValg: partyDiff[b] !== undefined ? partyDiff[b] : null,
    }))
    .sort((a, b) => b.stemmer - a.stemmer);

  // Build udenforParti array
  const udenforParti = Object.entries(udenforVotes)
    .map(([id, stemmer]) => ({ navn: udenforNames[id] ?? id, stemmer }))
    .sort((a, b) => b.stemmer - a.stemmer);

  // Build perStorkreds
  const perStorkreds: Record<string, StorkredsSummary> = {};
  for (const skData of Object.values(storkredsByNummer)) {
    const key = String(skData.nummer);
    const skPartier: PartyStorkreds[] = Object.entries(skData.partyVotes)
      .map(([b, stemmer]) => ({
        bogstav: b,
        navn: skData.partyNames[b] ?? b,
        stemmer,
        stemmeProcent:
          skData.gyldige > 0 ? (stemmer / skData.gyldige) * 100 : 0,
      }))
      .sort((a, b) => b.stemmer - a.stemmer);

    perStorkreds[key] = {
      navn: skData.navn,
      nummer: skData.nummer,
      afgivneStemmer: skData.afgivne,
      gyldigeStemmer: skData.gyldige,
      stemmeberettigede: skData.stemmeberettigede,
      optalteAfstemningsomraader: skData.optalte,
      totalAfstemningsomraader: skData.total,
      partier: skPartier,
    };
  }

  // Build perKommune
  const perKommune: Record<string, KommuneSummary> = {};
  for (const kkData of Object.values(kommuneByKode)) {
    const key = String(kkData.kommunekode);
    const kkPartier: PartyKommune[] = Object.entries(kkData.partyVotes)
      .map(([b, stemmer]) => ({
        bogstav: b,
        navn: kkData.partyNames[b] ?? b,
        stemmer,
        stemmeProcent:
          kkData.gyldige > 0 ? (stemmer / kkData.gyldige) * 100 : 0,
      }))
      .sort((a, b) => b.stemmer - a.stemmer);

    perKommune[key] = {
      navn: kkData.navn,
      kommunekode: kkData.kommunekode,
      storkreds: kkData.storkreds,
      afgivneStemmer: kkData.afgivne,
      gyldigeStemmer: kkData.gyldige,
      stemmeberettigede: kkData.stemmeberettigede,
      optalteAfstemningsomraader: kkData.optalte,
      partier: kkPartier,
    };
  }

  const optaltProcent =
    CONFIG.TOTAL_AFSTEMNINGSOMRAADER > 0
      ? (optalte / CONFIG.TOTAL_AFSTEMNINGSOMRAADER) * 100
      : 0;

  return {
    lastUpdated: new Date().toISOString(),
    totalAfstemningsomraader: CONFIG.TOTAL_AFSTEMNINGSOMRAADER,
    optalteAfstemningsomraader: optalte,
    optaltProcent,
    national: {
      afgivneStemmer: totalAfgivne,
      gyldigeStemmer: totalGyldige,
      stemmeberettigede: totalStemmeberettigede,
      valgdeltagelse,
      partier,
      udenforParti,
    },
    perStorkreds,
    perKommune,
  };
}

// ---------------------------------------------------------------------------
// HTTP POST helper
// ---------------------------------------------------------------------------

function postJSON(url: string, data: unknown, secret: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port
        ? Number(parsedUrl.port)
        : isHttps
        ? 443
        : 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...(secret ? { "x-api-secret": secret } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk: Buffer) => {
        responseBody += chunk.toString();
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `HTTP ${res.statusCode}: ${responseBody.slice(0, 200)}`
            )
          );
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// File tracking
// ---------------------------------------------------------------------------

// key = filename, value = mtime as ISO string
const fileTracker = new Map<string, string>();

// ---------------------------------------------------------------------------
// SFTP polling
// ---------------------------------------------------------------------------

async function pollViaSftp(): Promise<SFTPResultFile[]> {
  const sftp = new SftpClient();
  const allFiles: SFTPResultFile[] = [];

  await sftp.connect({
    host: CONFIG.SFTP_HOST,
    port: CONFIG.SFTP_PORT,
    username: CONFIG.SFTP_USER,
    password: CONFIG.SFTP_PASS,
  });

  try {
    const listing = await sftp.list(CONFIG.SFTP_PATH);
    const jsonFiles = listing.filter(
      (entry) =>
        entry.type === "-" &&
        entry.name.endsWith(".json") &&
        !entry.name.endsWith(".hash")
    );

    log(
      `Found ${listing.length} entries, ${jsonFiles.length} JSON files on SFTP`
    );

    let newCount = 0;
    let skipCount = 0;

    for (const entry of jsonFiles) {
      const mtime =
        entry.modifyTime != null
          ? new Date(entry.modifyTime).toISOString()
          : "";
      const cached = fileTracker.get(entry.name);

      if (cached === mtime) {
        skipCount++;
        continue;
      }

      const remotePath = CONFIG.SFTP_PATH + entry.name;
      try {
        const buffer = (await sftp.get(remotePath)) as Buffer;
        const parsed: SFTPResultFile = JSON.parse(buffer.toString("utf8"));
        allFiles.push(parsed);
        fileTracker.set(entry.name, mtime);
        newCount++;
      } catch (parseErr) {
        warn(`Failed to parse ${entry.name}: ${(parseErr as Error).message}`);
      }
    }

    log(`Downloaded ${newCount} new/updated files, skipped ${skipCount} unchanged files`);
  } finally {
    await sftp.end();
  }

  return allFiles;
}

// ---------------------------------------------------------------------------
// Mock polling (local files)
// ---------------------------------------------------------------------------

async function pollViaMock(): Promise<SFTPResultFile[]> {
  const mockDir = path.resolve(
    __dirname,
    "..",
    "mock-data",
    "valgresultater"
  );
  const allFiles: SFTPResultFile[] = [];

  if (!fs.existsSync(mockDir)) {
    warn(`Mock directory not found: ${mockDir}`);
    return allFiles;
  }

  const entries = fs.readdirSync(mockDir);
  const jsonFiles = entries.filter(
    (f) => f.endsWith(".json") && !f.endsWith(".hash")
  );

  log(`[mock] Found ${jsonFiles.length} JSON files in ${mockDir}`);

  let newCount = 0;
  let skipCount = 0;

  for (const filename of jsonFiles) {
    const filePath = path.join(mockDir, filename);
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime.toISOString();
    const cached = fileTracker.get(filename);

    if (cached === mtime) {
      skipCount++;
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed: SFTPResultFile = JSON.parse(raw);
      allFiles.push(parsed);
      fileTracker.set(filename, mtime);
      newCount++;
    } catch (parseErr) {
      warn(`Failed to parse ${filename}: ${(parseErr as Error).message}`);
    }
  }

  log(`[mock] Downloaded ${newCount} new/updated files, skipped ${skipCount} unchanged files`);
  return allFiles;
}

// ---------------------------------------------------------------------------
// Logging helpers for aggregation summary
// ---------------------------------------------------------------------------

function logSummary(result: AggregatedResults): void {
  const top3 = result.national.partier.slice(0, 3);
  const top3Str = top3
    .map((p) => `${p.bogstav} ${p.stemmer.toLocaleString("da-DK")} (${p.stemmeProcent.toFixed(1)}%)`)
    .join(", ");

  log(
    `Optalt: ${result.optalteAfstemningsomraader}/${result.totalAfstemningsomraader} (${result.optaltProcent.toFixed(1)}%)`
  );
  log(
    `Afgivne stemmer: ${result.national.afgivneStemmer.toLocaleString("da-DK")}, ` +
      `Valgdeltagelse: ${result.national.valgdeltagelse.toFixed(1)}%`
  );
  log(`Top 3 partier: ${top3Str}`);
  log(`Kommuner med data: ${Object.keys(result.perKommune).length}`);
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------

const isMock = process.argv.includes("--mock");

// We keep a merged store of all parsed results across polls so that
// unchanged files (skipped from re-download) still contribute to totals.
const allParsedResults = new Map<string, SFTPResultFile>();

async function poll(): Promise<void> {
  log(`Starting poll (${isMock ? "mock" : "SFTP"} mode)`);

  let newFiles: SFTPResultFile[];
  if (isMock) {
    newFiles = await pollViaMock();
  } else {
    newFiles = await pollViaSftp();
  }

  // Merge new files into the accumulated store (keyed by a stable identity)
  // We use Storkredsnummer + AfstemningsområdeDagiId as a composite key.
  for (const file of newFiles) {
    const key = `${file.Storkredsnummer}_${file.AfstemningsområdeDagiId}`;
    allParsedResults.set(key, file);
  }

  if (allParsedResults.size === 0) {
    log("No data available yet, skipping aggregation");
    return;
  }

  log(`Aggregating ${allParsedResults.size} total afstemningsområder...`);
  const aggregated = aggregateResults(Array.from(allParsedResults.values()));

  logSummary(aggregated);

  try {
    await postJSON(CONFIG.API_URL, aggregated, CONFIG.API_SECRET);
    log(`POST to ${CONFIG.API_URL} succeeded`);
  } catch (postErr) {
    logError(`POST failed: ${(postErr as Error).message}`);
  }
}

async function runLoop(): Promise<void> {
  while (true) {
    try {
      await poll();
    } catch (err) {
      logError(`Poll failed: ${(err as Error).message}`);
      if (!isMock) {
        log(`Retrying in ${CONFIG.RETRY_DELAY_MS / 1000}s...`);
        await sleep(CONFIG.RETRY_DELAY_MS);
        continue;
      }
    }

    const nextPollSecs = CONFIG.POLL_INTERVAL_MS / 1000;
    log(`Next poll in ${nextPollSecs}s`);
    await sleep(CONFIG.POLL_INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (isMock) {
  log("Running in MOCK mode (reading from ./mock-data/valgresultater/)");
} else {
  log(`Running in SFTP mode (connecting to ${CONFIG.SFTP_HOST})`);
}

runLoop().catch((err) => {
  logError(`Fatal error: ${(err as Error).message}`);
  process.exit(1);
});
