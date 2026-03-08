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
