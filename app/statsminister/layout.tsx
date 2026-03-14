import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hvem bliver statsminister? – Simulator & Koalitionsprognose 2026",
  description:
    "Hvem bliver Danmarks næste statsminister efter Folketingsvalget 24. marts 2026? Byg din egen koalition, simulér regeringsforhandlinger og se hvem der kan danne flertal. Mette Frederiksen, Troels Lund Poulsen, Alex Vanopslagh eller Inger Støjberg?",
  keywords: [
    "hvem bliver statsminister",
    "næste statsminister",
    "statsminister 2026",
    "statsminister simulator",
    "statsministerkandidat",
    "mette frederiksen statsminister",
    "troels lund poulsen statsminister",
    "alex vanopslagh statsminister",
    "inger støjberg statsminister",
    "koalition 2026",
    "regering 2026",
    "regeringsforhandlinger 2026",
    "flertal folketing",
    "hvem vinder valget 2026",
    "blå blok flertal",
    "rød blok flertal",
    "støttepartier",
    "valgresultat simulator",
  ],
  alternates: {
    canonical: "https://valgidanmark.dk/statsminister",
  },
  openGraph: {
    title: "Hvem bliver statsminister? – Simulator 2026 | ValgiDanmark",
    description:
      "Simulér koalitioner og se hvem der kan blive Danmarks næste statsminister efter Folketingsvalget 2026.",
    url: "https://valgidanmark.dk/statsminister",
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
