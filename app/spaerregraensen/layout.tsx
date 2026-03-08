import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spærregrænsen – Partier tæt på 2%",
  description:
    "Følg hvilke partier der er tæt på spærregrænsen på 2% ved Folketingsvalget 2026. Se historiske meningsmålinger og udviklingen over tid.",
  alternates: {
    canonical: "https://valgidanmark.dk/spaerregraensen",
  },
  openGraph: {
    title: "Spærregrænsen – Partier tæt på 2% | ValgiDanmark",
    description:
      "Følg hvilke partier der er tæt på spærregrænsen på 2% ved Folketingsvalget 2026.",
    url: "https://valgidanmark.dk/spaerregraensen",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
