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
            ? "Sådan beregner ValgiDanmark sine prognoser og mandatfordelinger."
            : "How ValgiDanmark computes its forecasts and seat projections."}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "1. Vægtet meningsmålingsgennemsnit" : "1. Weighted polling average"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Alle meningsmålinger fra de fire institutter (Verian, Epinion, Megafon og Voxmeter) indgår i gennemsnittet. Nyere målinger vægtes højere end ældre via et eksponentielt tidsforfald med en dynamisk halveringstid: tæt på valgdagen ca. 14 dage, op til 45 dage når valgdatoen er langt væk eller ukendt. Målinger ældre end 60 dage får nul vægt. Der bruges minimum 8 målinger — hvis for få falder inden for vinduet, udvides det automatisk i trin af 5 dage, dog maksimalt til 90 dage."
              : "All polls from the four pollsters (Verian, Epinion, Megafon, Voxmeter) are included in the average. More recent polls are weighted higher through exponential time-decay with a dynamic half-life: roughly 14 days near election day, up to 45 days when the election is far away or unknown. Polls older than 60 days receive zero weight. At least 8 polls are always included — if too few fall within the window, it is automatically extended in 5-day steps up to a hard maximum of 90 days."}
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
          {da ? "2. Redundansrabat for hyppige institutter" : "2. Redundancy discount for frequent pollsters"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Hvis et institut bidrager med k målinger inden for det effektive vindue, skaleres hver af dets målingers vægt ned med faktoren 1/√k. Det betyder, at en dublet (k = 2) giver 1/√2 ≈ 71 % af fuld vægt per måling, og ti målinger (k = 10) giver 1/√10 ≈ 32 % per måling — men tilsammen stadig √10 ≈ 3,2 gange mere end en enkelt måling."
              : "If a pollster contributes k polls within the effective window, each of their polls' weight is scaled by 1/√k. This means a duplicate (k = 2) gets 1/√2 ≈ 71 % of full weight per poll, and ten polls (k = 10) get 1/√10 ≈ 32 % each — but collectively still √10 ≈ 3.2× more than a single poll."}
          </p>
          <p>
            {da
              ? "Formålet er at forhindre, at Voxmeter — der udgiver ugentligt — dominerer gennemsnittet alene på grund af publiceringsfrekvens. Rabatten afspejler, at gentagne målinger fra samme institut er korrelerede og dermed ikke bidrager med fuldt uafhængig information."
              : "The purpose is to prevent Voxmeter — which publishes weekly — from dominating the average purely due to publication frequency. The discount reflects that repeated polls from the same house are correlated and therefore do not contribute fully independent information."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "3. Huseffektkorrektion" : "3. House effect correction"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Hvert institut har en systematisk tendens til at over- eller underestimere bestemte partier. Disse huseffekter estimeres via en leave-one-out-metode: for hver måling beregnes et vægtet gennemsnit af de øvrige tre institutter i en ±90-dages periode med 30-dages halveringstid. Huseffekten for et parti er den vægtede gennemsnitlige afvigelse mellem instituttets egne målinger og dette referencesnit."
              : "Each pollster has a systematic tendency to over- or underestimate certain parties. These house effects are estimated via a leave-one-out method: for each poll, a weighted average of the other three pollsters is computed within a ±90-day window using a 30-day half-life. The house effect for a party is the weighted average deviation between the pollster's own readings and this reference average."}
          </p>
          <p>
            {da
              ? "Inden en måling bidrager til det vægtede gennemsnit, fratrækkes huseffekten fra den rå partiandel. Effekten er dermed centreret ud, og gennemsnittet afspejler et fælles niveau på tværs af institutterne frem for et niveau trukket af metodologiske forskelle."
              : "Before a poll contributes to the weighted average, the house effect is subtracted from the raw party figure. This centres each pollster's readings, so the average reflects a common level across pollsters rather than one pulled by methodological differences."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "4. Maksimal instituttandel på 40 %" : "4. Maximum pollster influence cap of 40 %"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed space-y-3">
          <p>
            {da
              ? "Selv efter tidsforfald, nøjagtighedsvægtning og redundansrabat kan ét institut i perioder med få målinger komme til at tegne sig for mere end 40 % af den samlede vægt. Som sikkerhedsnet skaleres et sådant instituts samlede vægt ned til præcis 40 %, og den frigjorte vægt fordeles proportionalt blandt de øvrige institutter."
              : "Even after time-decay, accuracy weighting, and the redundancy discount, a single pollster can sometimes account for more than 40 % of the total weight — for instance during periods with few polls. As a safety net, that pollster's combined weight is scaled down to exactly 40 %, and the freed weight is redistributed proportionally among the remaining pollsters."}
          </p>
          <p>
            {da
              ? "Processen gentages iterativt, indtil ingen institutter overskrider grænsen. I praksis er to iterationer altid tilstrækkelige. Loftet sikrer, at ingen enkelt datakilde alene kan drive prognosen, og giver prognoser, der er mere robuste over for ujævne publiceringsmønstre."
              : "The process is repeated iteratively until no pollster exceeds the cap. In practice, two iterations are always sufficient. The cap ensures no single source can drive the forecast alone, making projections more robust against uneven publication patterns."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "5. Monte Carlo-simulering" : "5. Monte Carlo simulation"}
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
          {da ? "6. Mandatfordeling" : "6. Seat allocation"}
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
          {da ? "7. Færøerne og Grønland" : "7. Faroe Islands and Greenland"}
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm font-mono leading-relaxed">
          <p>
            {da
              ? "FO og GL har 2 mandater hver og vælges ikke via danske meningsmålinger. I Monte Carlo-simuleringen tildeles hvert af de 4 mandater til rød blok med 50 % sandsynlighed — et vægtet skøn baseret på historiske resultater og aktuelle tendenser i Færøerne og Grønland."
              : "FO and GL each hold 2 seats, which are not determined by Danish polling. In the Monte Carlo simulation, each of the 4 seats is assigned to red bloc with 50 % probability — a weighted estimate based on historical results and current trends in the Faroe Islands and Greenland."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          {da ? "8. Datakilder" : "8. Data sources"}
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
