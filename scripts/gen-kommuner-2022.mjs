import fs from 'fs';

// Party mapping: letter → display name
// Matching is done by extracting the letter before the first '.' in the CSV VALRES column
const LETTER_TO_PARTY = {
  'A': { bogstav: 'A', navn: 'Socialdemokraterne' },
  'B': { bogstav: 'B', navn: 'Radikale Venstre' },
  'C': { bogstav: 'C', navn: 'Det Konservative Folkeparti' },
  'D': { bogstav: 'D', navn: 'Nye Borgerlige' },
  'F': { bogstav: 'F', navn: 'SF – Socialistisk Folkeparti' },
  'I': { bogstav: 'I', navn: 'Liberal Alliance' },
  'K': { bogstav: 'K', navn: 'Kristendemokraterne' },
  'M': { bogstav: 'M', navn: 'Moderaterne' },
  'O': { bogstav: 'O', navn: 'Dansk Folkeparti' },
  'Q': { bogstav: 'Q', navn: 'Frie Grønne' },
  'V': { bogstav: 'V', navn: 'Venstre' },
  'Æ': { bogstav: 'Æ', navn: 'Danmarksdemokraterne' },
  'Ø': { bogstav: 'Ø', navn: 'Enhedslisten' },
  'Å': { bogstav: 'Å', navn: 'Alternativet' },
};

// Extract party letter from a CSV VALRES label like "A. Socialdemokratiet" or "Ø. Enhedslisten - ..."
function getPartyLetter(valres) {
  const m = valres.match(/^([A-ZÆØÅ]+)\./);
  return m ? m[1] : null;
}

// GeoJSON name → kommunekode
const geo = JSON.parse(fs.readFileSync('c:/Users/45226/Github/valgidanmark/Public/dk-kommuner.geojson', 'utf8'));
const geoMap = {};
for (const f of geo.features) {
  geoMap[f.properties.label_dk] = f.properties.lau_1;
}

// CSV municipality name overrides → GeoJSON name (null = skip)
const CSV_TO_GEO = {
  'Aarhus': 'Århus',
  'Brønderslev': 'Brønderslev-Dronninglund',
  'Vesthimmerlands': 'Vesthimmerland',
  'Christiansø': null,
  'Hele landet': null,
};

// Storkreds mapping by kommunekode
const STORKREDS = {
  '101':'Københavns Storkreds','147':'Københavns Storkreds',
  '151':'Københavns Omegns Storkreds','153':'Københavns Omegns Storkreds',
  '155':'Københavns Omegns Storkreds','157':'Nordsjællands Storkreds',
  '159':'Københavns Omegns Storkreds','161':'Københavns Omegns Storkreds',
  '163':'Københavns Omegns Storkreds','165':'Københavns Omegns Storkreds',
  '167':'Københavns Omegns Storkreds','169':'Københavns Omegns Storkreds',
  '173':'Nordsjællands Storkreds','175':'Københavns Omegns Storkreds',
  '183':'Københavns Omegns Storkreds','185':'Københavns Omegns Storkreds',
  '187':'Københavns Omegns Storkreds','190':'Nordsjællands Storkreds',
  '201':'Nordsjællands Storkreds','210':'Nordsjællands Storkreds',
  '217':'Nordsjællands Storkreds','219':'Nordsjællands Storkreds',
  '223':'Nordsjællands Storkreds','230':'Nordsjællands Storkreds',
  '240':'Nordsjællands Storkreds','250':'Nordsjællands Storkreds',
  '253':'Sjællands Storkreds','259':'Sjællands Storkreds',
  '260':'Nordsjællands Storkreds','265':'Sjællands Storkreds',
  '269':'Sjællands Storkreds','270':'Nordsjællands Storkreds',
  '306':'Sjællands Storkreds','316':'Sjællands Storkreds',
  '320':'Sjællands Storkreds','326':'Sjællands Storkreds',
  '329':'Sjællands Storkreds','330':'Sjællands Storkreds',
  '336':'Sjællands Storkreds','340':'Sjællands Storkreds',
  '350':'Sjællands Storkreds','360':'Sjællands Storkreds',
  '370':'Sjællands Storkreds','376':'Sjællands Storkreds',
  '390':'Sjællands Storkreds','400':'Bornholms Storkreds',
  '410':'Fyns Storkreds','420':'Fyns Storkreds',
  '430':'Fyns Storkreds','440':'Fyns Storkreds',
  '450':'Fyns Storkreds','461':'Fyns Storkreds',
  '479':'Fyns Storkreds','480':'Fyns Storkreds',
  '482':'Fyns Storkreds','492':'Fyns Storkreds',
  '510':'Sydjyllands Storkreds','530':'Sydjyllands Storkreds',
  '540':'Sydjyllands Storkreds','550':'Sydjyllands Storkreds',
  '561':'Sydjyllands Storkreds','563':'Sydjyllands Storkreds',
  '573':'Sydjyllands Storkreds','575':'Sydjyllands Storkreds',
  '580':'Sydjyllands Storkreds','607':'Østjyllands Storkreds',
  '615':'Østjyllands Storkreds','621':'Sydjyllands Storkreds',
  '630':'Østjyllands Storkreds','657':'Vestjyllands Storkreds',
  '661':'Vestjyllands Storkreds','665':'Vestjyllands Storkreds',
  '671':'Vestjyllands Storkreds','706':'Østjyllands Storkreds',
  '707':'Østjyllands Storkreds','710':'Østjyllands Storkreds',
  '727':'Østjyllands Storkreds','730':'Østjyllands Storkreds',
  '740':'Østjyllands Storkreds','741':'Østjyllands Storkreds',
  '746':'Østjyllands Storkreds','751':'Østjyllands Storkreds',
  '756':'Vestjyllands Storkreds','760':'Vestjyllands Storkreds',
  '766':'Østjyllands Storkreds','773':'Nordjyllands Storkreds',
  '779':'Nordjyllands Storkreds','787':'Nordjyllands Storkreds',
  '791':'Nordjyllands Storkreds','810':'Nordjyllands Storkreds',
  '813':'Nordjyllands Storkreds','820':'Nordjyllands Storkreds',
  '825':'Nordjyllands Storkreds','840':'Nordjyllands Storkreds',
  '846':'Nordjyllands Storkreds','849':'Nordjyllands Storkreds',
  '851':'Nordjyllands Storkreds','860':'Nordjyllands Storkreds',
};

function parseCsv(path) {
  return fs.readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(l => l.split(';'));
}

const counts = parseCsv('C:/Users/45226/AppData/Local/Temp/fvkom_2022.csv');
const pcts   = parseCsv('C:/Users/45226/AppData/Local/Temp/fvpandel_2022.csv');

// Build kommuneData[csvName][bogstav] = { stemmer, stemmePct }
const kommuneData = {};

for (const [valres, omraade, , indhold] of counts) {
  const letter = getPartyLetter(valres);
  const party = letter ? LETTER_TO_PARTY[letter] : null;
  if (!party) continue;
  if (!kommuneData[omraade]) kommuneData[omraade] = {};
  kommuneData[omraade][party.bogstav] = { stemmer: parseInt(indhold.replace(/\s/g, ''), 10) || 0, stemmePct: 0 };
}

for (const [valres, omraade, , indhold] of pcts) {
  const letter = getPartyLetter(valres);
  const party = letter ? LETTER_TO_PARTY[letter] : null;
  if (!party) continue;
  if (!kommuneData[omraade]) continue;
  if (!kommuneData[omraade][party.bogstav]) kommuneData[omraade][party.bogstav] = { stemmer: 0, stemmePct: 0 };
  kommuneData[omraade][party.bogstav].stemmePct = parseFloat(indhold.replace(',', '.')) || 0;
}

const kommuner = [];
const unmatched = [];

for (const [csvName, partyMap] of Object.entries(kommuneData)) {
  const geoName = CSV_TO_GEO.hasOwnProperty(csvName) ? CSV_TO_GEO[csvName] : csvName;
  if (!geoName) continue;

  const kode = geoMap[geoName];
  if (!kode) { unmatched.push(csvName); continue; }

  const partier = Object.values(LETTER_TO_PARTY)
    .map(p => {
      const d = partyMap[p.bogstav];
      if (!d) return null;
      return { bogstav: p.bogstav, navn: p.navn, stemmer: d.stemmer, stemmePct: d.stemmePct };
    })
    .filter(Boolean)
    .sort((a, b) => b.stemmePct - a.stemmePct);

  kommuner.push({ kommunekode: kode, kommune_navn: geoName, storkreds: STORKREDS[kode] ?? 'Ukendt', partier });
}

kommuner.sort((a, b) => parseInt(a.kommunekode) - parseInt(b.kommunekode));

if (unmatched.length) console.error('UNMATCHED:', unmatched);
console.log(`Generated ${kommuner.length} kommuner`);

// Write TypeScript file
let ts = `// Official 2022 Danish parliamentary election results per municipality (kommune)
// Source: Danmarks Statistik — Folketing election 1 November 2022 (tables FVKOM + FVPANDEL)
// kommunekode matches the lau_1 field in the GeoJSON boundaries file

export interface KommuneParti2022 {
  bogstav: string;
  navn: string;
  stemmer: number;
  stemmePct: number;
}

export interface Kommune2022 {
  kommunekode: string;
  kommune_navn: string;
  storkreds: string;
  partier: KommuneParti2022[];
}

// Helper: derive winner from partier array
export function getWinner2022(k: Kommune2022): string {
  if (!k.partier.length) return 'A';
  return [...k.partier].sort((a, b) => b.stemmePct - a.stemmePct)[0].bogstav;
}

export const KOMMUNER_2022: Kommune2022[] = [
`;

for (const k of kommuner) {
  ts += `  { kommunekode: "${k.kommunekode}", kommune_navn: "${k.kommune_navn}", storkreds: "${k.storkreds}",\n    partier: [\n`;
  for (const p of k.partier) {
    ts += `      { bogstav: "${p.bogstav}", navn: "${p.navn}", stemmer: ${p.stemmer}, stemmePct: ${p.stemmePct} },\n`;
  }
  ts += `    ],\n  },\n`;
}
ts += `];\n`;

fs.writeFileSync('c:/Users/45226/Github/valgidanmark/lib/data-2022-kommuner.ts', ts);
console.log('Written to lib/data-2022-kommuner.ts');
