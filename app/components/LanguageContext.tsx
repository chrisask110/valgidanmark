"use client";

import React, { createContext, useContext, useState } from "react";

type Lang = "da" | "en";

const STRINGS: Record<string, Record<Lang, string>> = {
  // Header
  "nav.polls": { da: "Målinger", en: "Polls" },
  "nav.forecast": { da: "Prognose", en: "Forecast" },
  "nav.about": { da: "Om modellen", en: "About" },
  "nav.simulator": { da: "Simulator", en: "Simulator" },
  "header.title": { da: "Valg i Danmark", en: "Danish Elections" },
  "header.subtitle": { da: "Valgbarometer 2026", en: "Election Tracker 2026" },

  // Forecast
  "forecast.chance": { da: "chance for flertal", en: "chance of majority" },
  "forecast.seats": { da: "mandater", en: "seats" },
  "forecast.rodblok": { da: "Rød Blok", en: "Red Bloc" },
  "forecast.blaablok": { da: "Blå Blok", en: "Blue Bloc" },
  "forecast.majority": { da: "Flertal ved 90 mandater", en: "Majority at 90 seats" },
  "forecast.model": { da: "Monte Carlo-simulation", en: "Monte Carlo simulation" },
  "forecast.runs": { da: "5.000 simuleringer", en: "5,000 simulations" },
  "forecast.projected": { da: "Forventet:", en: "Projected:" },

  // Chart
  "chart.title": { da: "Meningsmålinger siden jan. 2025", en: "Opinion Polls since Jan. 2025" },
  "chart.threshold": { da: "Spærregrænse 2%", en: "2% threshold" },
  "chart.election": { da: "Valg 24. mar", en: "Election Mar 24" },
  "chart.range.3m": { da: "3 mdr", en: "3 mo" },
  "chart.range.6m": { da: "6 mdr", en: "6 mo" },
  "chart.range.1y": { da: "1 år", en: "1 yr" },
  "chart.range.all": { da: "Alt", en: "All" },
  "chart.showdots": { da: "Vis målinger", en: "Show polls" },
  "chart.confidence": { da: "95% konfidensinterval", en: "95% confidence interval" },
  "chart.pollster": { da: "Institut", en: "Pollster" },
  "chart.samplesize": { da: "Stikprøve", en: "Sample size" },
  "chart.allpolls": { da: "Alle målinger", en: "All polls" },

  // Polling averages
  "avg.title": { da: "Nationalt vægtet gennemsnit", en: "National Polling Average" },
  "avg.updated": { da: "Opdateret", en: "Updated" },

  // Hemicycle
  "hemi.title": { da: "Mandatfordeling", en: "Seat Projection" },
  "hemi.total": { da: "mandater (DK)", en: "seats (DK)" },
  "hemi.undecided": { da: "· 4 ingen data (FO/GL)", en: "· 4 no data (FO/GL)" },
  "blok.fogl": { da: "FO + GL – ingen data", en: "FO + GL – no data" },
  "hemi.threshold": { da: "Partier under spærregrænsen tæller ikke med", en: "Parties below threshold excluded" },

  // Table
  "table.title": { da: "Seneste målinger", en: "Latest Polls" },
  "table.date": { da: "Dato", en: "Date" },
  "table.pollster": { da: "Institut", en: "Pollster" },
  "table.n": { da: "n", en: "n" },

  // Blok summary
  "blok.title": { da: "Blok-oversigt", en: "Bloc Overview" },
  "blok.seats": { da: "mandater", en: "seats" },
  "blok.needed": { da: "Mangler", en: "Need" },
  "blok.majority": { da: "Flertal", en: "Majority" },
  "blok.neutral": { da: "Neutral", en: "Neutral" },
  "blok.red": { da: "Rød Blok", en: "Red Bloc" },
  "blok.blue": { da: "Blå Blok", en: "Blue Bloc" },

  // Pollster ratings
  "pollster.title": { da: "Institutbedømmelser", en: "Pollster Ratings" },
  "pollster.grade": { da: "Karakter", en: "Grade" },
  "pollster.error": { da: "Gns. afvigelse", en: "Avg. error" },
  "pollster.weight": { da: "Modelv\u00e6gt", en: "Model weight" },
  "pollster.method": { da: "Metode", en: "Methodology" },
  "pollster.client": { da: "Klient", en: "Client" },

  // Map
  "map.title": { da: "Storkredskort", en: "Constituency Map" },
  "map.soon": { da: "Kommer snart", en: "Coming soon" },
  "map.desc": { da: "Interaktivt storkredskort med lokale resultater er under udvikling.", en: "Interactive constituency map with local results is under development." },

  // Prediction Markets
  "pm.title": { da: "Forudsigelsesmarkeder", en: "Prediction Markets" },
  "pm.subtitle": { da: "Næste statsminister — Polymarket", en: "Next PM — Polymarket" },
  "pm.implied": { da: "Implicit sandsynlighed", en: "Implied probability" },
  "pm.source": { da: "Kilde: Polymarket", en: "Source: Polymarket" },
  "pm.viewall": { da: "Se alle markeder →", en: "View all markets →" },
  "pm.loading": { da: "Henter markedsdata…", en: "Loading market data…" },
  "pm.error": { da: "Markedsdata ikke tilgængelig", en: "Market data unavailable" },

  // Simulator link
  "sim.title": { da: "Statsminister-simulator", en: "PM Simulator" },
  "sim.desc": { da: "Byg din egen regering og se om du kan danne flertal", en: "Build your own government and see if you can form a majority" },
  "sm.banner.title": { da: "Statsminister-simulator", en: "PM Simulator" },
  "sm.banner.desc": { da: "Byg din egen regering og se, hvem der bliver statsminister", en: "Build your own government and choose Denmark's next PM" },
  "sm.banner.cta": { da: "Prøv simulatoren", en: "Try the simulator" },

  // Nav
  "nav.statsminister": { da: "Simulator", en: "Simulator" },

  // Footer
  "footer.source": { da: "Datakilde", en: "Data source" },
  "footer.updated": { da: "Senest opdateret", en: "Last updated" },
  "footer.method": { da: "Om metoden", en: "About the model" },
  "footer.disclaimer": { da: "Prognosen er baseret på offentligt tilgængelige meningsmålinger. Modellen er ikke tilknyttet nogen politisk organisation.", en: "Forecast is based on publicly available polls. The model is not affiliated with any political organization." },

  // Other
  "theme.dark": { da: "Mørk tilstand", en: "Dark mode" },
  "theme.light": { da: "Lys tilstand", en: "Light mode" },
  "last.updated": { da: "Senest opdateret", en: "Last updated" },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "da",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("da");
  const t = (key: string) => STRINGS[key]?.[lang] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
