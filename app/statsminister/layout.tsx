import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statsministerkandidat-simulator",
  description:
    "Byg din egen regering og se hvem der kan blive statsminister efter Folketingsvalget 2026. Simuler koalitioner og flertalsforhold.",
  alternates: {
    canonical: "https://valgidanmark.dk/statsminister",
  },
  openGraph: {
    title: "Statsministerkandidat-simulator | ValgiDanmark",
    description:
      "Byg din egen regering og se hvem der kan blive statsminister efter Folketingsvalget 2026.",
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
