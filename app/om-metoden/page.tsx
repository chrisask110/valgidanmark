"use client";

import Link from "next/link";
import { useLanguage } from "@/app/components/LanguageContext";

export default function OmMetoden() {
  const { lang } = useLanguage();
  const da = lang === "da";

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <div>
        <Link href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
          ← {da ? "Tilbage til forsiden" : "Back to front page"}
        </Link>
        <h1 className="mt-4 text-2xl font-bold font-mono">
          {da ? "Om metoden" : "About the model"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          {da
            ? "Sådan beregner ValgIDanmark sine prognoser og mandatfordelinger."
            : "How ValgIDanmark computes its forecasts and seat projections."}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "1. Vægtet meningsmålingsgennemsnit" : "1. Weighted polling average"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Alle meningsmålinger fra de fire institutter (Verian, Epinion, Megafon og Voxmeter) indgår i gennemsnittet. Nyere målinger vægtes højere end ældre via en eksponentiel tidsforfald med en halveringstid på 30 dage — en måling fra for to måneder siden vejer altså kun ca. 25 % af en måling fra i dag."
              : "All polls from the four pollsters (Verian, Epinion, Megafon, Voxmeter) are included in the average. More recent polls are weighted higher through exponential time-decay with a half-life of 30 days — a poll from two months ago counts for roughly 25 % of a poll from today."}
          </p>
          <p>
            {da
              ? "Derudover vægtes institutterne efter historisk nøjagtighed. Verian (karakter A) vægtes 1,35×, Epinion (A−) 1,20×, Megafon (B+) 1,10× og Voxmeter (B+) 0,90×. Voxmeter udgiver hyppigt, men med en lidt højere gennemsnitlig fejlmargin, og vægtes dermed lidt lavere."
              : "Pollsters are also weighted by historical accuracy. Verian (grade A) is weighted 1.35×, Epinion (A−) 1.20×, Megafon (B+) 1.10×, and Voxmeter (B+) 0.90×. Voxmeter publishes frequently but with a slightly higher average error, so it is downweighted accordingly."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "2. Monte Carlo-simulering" : "2. Monte Carlo simulation"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "For at beregne sandsynligheder for, at rød eller blå blok opnår flertal, kører modellen 25.000 simulerede valg. I hvert simuleret valg tilføjes to typer tilfældig fejl til de vægtede målinger:"
              : "To compute the probability of red or blue bloc winning a majority, the model runs 25,000 simulated elections. In each, two types of random error are added to the weighted averages:"}
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              {da
                ? "Systematisk fejl (±1,2 %): påvirker alle partier i samme retning — svarende til en generel overestimering af f.eks. rød blok i alle målinger."
                : "Systematic error (±1.2 %): shifts all parties in the same direction — reflecting a general over- or underestimate of a bloc across all polls."}
            </li>
            <li>
              {da
                ? "Individuel fejl (±0,9 %): uafhængig støj for hvert enkelt parti."
                : "Individual error (±0.9 %): independent noise for each party."}
            </li>
          </ul>
          <p>
            {da
              ? "Fejlene er normalfordelte (Box-Muller-transform). Stemmeprocenter normaliseres til 100 % efter hvert simuleret valg. Resultatet er en fordeling over mulige valgresultater, hvorfra sandsynligheder og median-mandattal udtrækkes."
              : "Errors are normally distributed (Box-Muller transform). Vote shares are renormalised to 100 % after each simulated election. The result is a distribution of possible outcomes, from which probabilities and median seat counts are extracted."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "3. Mandatfordeling" : "3. Seat allocation"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Mandater fordeles efter Hamiltons metode (største restmetode), som er den officielle danske metode til fordelingen af de 175 danske kredsmandater og tillægsmandater under ét."
              : "Seats are allocated using the Hamilton method (largest remainder), which is the official Danish method for distributing all 175 mainland seats."}
          </p>
          <p>
            {da
              ? "Partier under 2 %-spærregrænsen modtager ingen mandater. Partier, der netop passerer spærregrænsen, er garanteret mindst 4 mandater — som i praksis er det absolutte minimum i det danske valgsystem. Hvis dette minimum medfører, at et andet parti mister ét mandat, fratrækkes det fra det parti, der har flest."
              : "Parties below the 2 % threshold receive no seats. Parties that clear the threshold are guaranteed a minimum of 4 seats — the practical floor in the Danish electoral system. If enforcing this minimum would exceed 175, one seat is taken from the largest party."}
          </p>
          <p>
            {da
              ? "Færøernes og Grønlands 4 faste mandater (2 til hver) indgår separat og er ikke omfattet af spærregrænsen."
              : "The Faroe Islands' and Greenland's 4 fixed seats (2 each) are added separately and are not subject to the threshold."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "4. Færøerne og Grønland" : "4. Faroe Islands and Greenland"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed">
          <p>
            {da
              ? "FO og GL har 2 mandater hver og vælges ikke via danske meningsmålinger. I Monte Carlo-simuleringen tildeles hvert af de 4 mandater til rød blok med 80 % sandsynlighed, svarende til det historiske mønster ved seneste valg."
              : "FO and GL each hold 2 seats, which are not determined by Danish polling. In the Monte Carlo simulation, each of the 4 seats is assigned to red bloc with 80 % probability, reflecting the historical pattern from recent elections."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "5. Datakilder" : "5. Data sources"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed">
          <p>
            {da
              ? "Meningsmålinger indsamles fra Verian (Berlingske), Epinion (DR & Altinget), Megafon (TV 2 & Politiken) og Voxmeter (Ritzaus Bureau). Prediction markets-data hentes fra Polymarket. Modellen opdateres løbende, efterhånden som nye målinger offentliggøres."
              : "Polls are sourced from Verian (Berlingske), Epinion (DR & Altinget), Megafon (TV 2 & Politiken), and Voxmeter (Ritzaus Bureau). Prediction market data is fetched from Polymarket. The model is updated continuously as new polls are published."}
          </p>
        </div>
      </section>
    </main>
  );
}
