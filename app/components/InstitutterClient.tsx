"use client";

import { useLanguage } from "./LanguageContext";
import { POLLSTERS } from "@/app/lib/data";

export function InstitutterClient() {
  const { t, lang } = useLanguage();
  const da = lang === "da";

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-sans tracking-tight">
          {da ? "Institutter" : "Pollsters"}
        </h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          {da
            ? "Bedømmelse af de fire danske meningsmålingsinstitutter der indgår i ValgiDanmarks model."
            : "Rating of the four Danish polling houses included in ValgiDanmark's model."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(POLLSTERS).map(([name, info]) => (
          <div key={name} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold font-mono text-sm">{name}</span>
                <span className="ml-2 text-xs font-mono text-muted-foreground">{info.client}</span>
              </div>
              <span
                className="text-lg font-bold font-mono"
                style={{ color: info.grade.startsWith("A") ? "#22c55e" : "#f59e0b" }}
              >
                {info.grade}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">{info.desc}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono text-muted-foreground">
              <span>{t("pollster.error")}: ±{info.avgError}%</span>
              <span>{info.sampleSize}</span>
              <span>{info.methodology}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span>
                {da ? "Vægtning i model" : "Model weight"}:{" "}
                <span className="font-semibold text-foreground">{info.weight.toFixed(2)}×</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-2 text-muted-foreground">
        <p className="font-semibold text-foreground text-xs uppercase tracking-widest">
          {da ? "Om bedømmelsen" : "About the ratings"}
        </p>
        <p>
          {da
            ? "Bedømmelserne er baseret på historisk nøjagtighed ved danske valg siden 2007. Gennemsnitlig afvigelse (MAE) er beregnet som gennemsnit af absolutte afvigelser per parti ved hvert valg. Karakteren afspejler samlet metodisk kvalitet, stikprøvestørrelse og historisk præcision."
            : "Ratings are based on historical accuracy at Danish elections since 2007. Mean absolute error (MAE) is the average of absolute party-level deviations at each election. The grade reflects overall methodological quality, sample size, and historical precision."}
        </p>
      </div>
    </main>
  );
}
