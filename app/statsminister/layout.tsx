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
    images: [{ url: "/Gemini_Generated_Image_47dy8447dy8447dy.png", alt: "ValgiDanmark logo" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/Gemini_Generated_Image_47dy8447dy8447dy.png"],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
