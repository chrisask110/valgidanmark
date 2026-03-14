import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om modellen – Sådan beregner ValgiDanmark valgprognosen",
  description:
    "Læs om metoden bag ValgiDanmarks valgprognose: tidsvægtet gennemsnit af meningsmålinger, institutbedømmelser, huseffekter, Monte Carlo-simulering og mandatberegning til Folketingsvalget 2026.",
  keywords: [
    "valgmodel", "meningsmålingsmodel", "valgprognose model",
    "monte carlo simulation valg", "tidsvægtet gennemsnit meningsmålinger",
    "huseffekter meningsmålinger", "mandatberegning folketing",
    "hvordan beregnes valgprognose", "statistisk valgmodel",
  ],
  alternates: {
    canonical: "https://valgidanmark.dk/om-metoden",
  },
  openGraph: {
    title: "Om modellen – Valgprognose 2026 | ValgiDanmark",
    description:
      "Sådan beregner ValgiDanmark valgprognosen: tidsvægtet meningsmålingsgennemsnit, huseffekter og Monte Carlo-simulering.",
    url: "https://valgidanmark.dk/om-metoden",
    images: [{ url: "/opengraph-image", alt: "ValgiDanmark logo", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
