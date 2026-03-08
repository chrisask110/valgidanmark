import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om metoden",
  description:
    "Læs om metoden bag ValgiDanmarks meningsmålingsgennemsnit, vægtning, Monte Carlo-simulering og mandatberegning til Folketingsvalget 2026.",
  alternates: {
    canonical: "https://valgidanmark.dk/om-metoden",
  },
  openGraph: {
    title: "Om metoden | ValgiDanmark",
    description:
      "Læs om metoden bag ValgiDanmarks meningsmålingsgennemsnit, vægtning og Monte Carlo-simulering.",
    url: "https://valgidanmark.dk/om-metoden",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
