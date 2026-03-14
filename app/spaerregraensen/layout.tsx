import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spærregrænsen 2026 - Kommer Alternativet og Borgernes parti i folketinget?",
  description:
    "Hvem kommer over spærregrænsen på 2% ved Folketingsvalget 2026? Følg dagligt hvilke partier der risikerer at ryge ud af Folketing — med sandsynligheder og historiske meningsmålinger.",
  keywords: [
    "spærregrænsen 2026",
    "spærregrænsen folketing",
    "hvem kommer i folketing",
    "partier under spærregrænsen",
    "2 procent grænsen",
    "kommer alternativet i folketinget",
    "alternativet spærregrænsen",
    "kommer borgernes parti i folketinget",
    "borgernes parti spærregrænse",
    "dansk folkeparti spærregrænsen",
    "liberal alliance spærregrænsen",
    "radikale venstre spærregrænsen",
    "partier der ryger ud",
    "hvem mister mandater",
    "valgresultat 2026",
    "meningsmålinger spærregrænsen",
  ],
  alternates: {
    canonical: "https://valgidanmark.dk/spaerregraensen",
  },
  openGraph: {
    title: "Spærregrænsen 2026 - Kommer Alternativet og Borgernes parti? | ValgiDanmark",
    description:
      "Dagligt opdaterede sandsynligheder for hvilke partier der kommer over 2%-spærregrænsen ved Folketingsvalget 2026.",
    url: "https://valgidanmark.dk/spaerregraensen",
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
