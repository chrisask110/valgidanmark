import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { LanguageProvider } from "./components/LanguageContext";
import { SiteHeader } from "./components/SiteHeader";
import Countdown from "./Countdown";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const BASE_URL = "https://valgidanmark.dk";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ValgiDanmark – Meningsmålinger & Prognose 2026",
    template: "%s | ValgiDanmark",
  },
  description:
    "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. ValgiDanmarks dagligt opdaterede estimat, mandatfordeling, blok-prognose og simulator: hvem bliver Danmarks næste statsminister?",
  keywords: [
    // Core
    "meningsmålinger", "meningsmåling", "ny meningsmåling", "seneste meningsmåling", "dagens meningsmåling",
    "folketing", "valg 2026", "valg 24 marts 2026", "folketingsvalg", "folketingsvalg 2026",
    "valgprognose", "valgbarometer", "mandatfordeling", "mandater", "prognose",
    // Blocs
    "rød blok", "blå blok", "rød blok prognose", "blå blok prognose",
    // PM question
    "hvem bliver statsminister", "hvem vinder valget", "hvem vinder valget 2026",
    "statsminister 2026", "statsminister", "statsministerkandidat",
    // Parties
    "socialdemokratiet meningsmåling", "venstre meningsmåling", "liberal alliance",
    "dansk folkeparti", "SF socialistisk folkeparti", "enhedslisten", "radikale venstre",
    "konservative folkeparti", "moderaterne", "danmarksdemokraterne", "alternativet",
    // Leaders
    "mette frederiksen", "troels lund poulsen", "alex vanopslagh", "inger støjberg", "pia olsen dyhr",
    // Threshold
    "spærregrænsen 2026", "hvem kommer i folketing", "partier under spærregrænsen",
    // Pollsters
    "verian meningsmåling", "epinion meningsmåling", "megafon meningsmåling", "voxmeter meningsmåling",
    // General
    "dansk politik", "politiske partier", "vælgere",
    // English
    "danish election 2026", "danish polls", "denmark election forecast",
    "folketing election", "denmark opinion polls", "denmark prime minister 2026",
  ],
  authors: [{ name: "ValgiDanmark" }],
  creator: "ValgiDanmark",
  openGraph: {
    type: "website",
    locale: "da_DK",
    url: BASE_URL,
    siteName: "ValgiDanmark",
    title: "ValgiDanmark – Meningsmålinger & Prognose 2026",
    description:
      "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. ValgiDanmarks estimat, mandatfordeling og ValgiDanmarks simulation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ValgiDanmark – Meningsmålinger & Prognose 2026",
    description:
      "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. ValgiDanmarks estimat, mandatfordeling og ValgiDanmarks simulation.",
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [
      { url: "/Logo.png", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/Logo.png",
    apple: { url: "/Logo.png" },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        {/* Blocking script: apply stored theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()` }} />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "ValgiDanmark",
                url: "https://valgidanmark.dk",
                description:
                  "ValgiDanmarks estimat, mandatfordeling og ValgiDanmarks simulation til Folketingsvalget 24. marts 2026.",
                inLanguage: "da-DK",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://valgidanmark.dk/?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Dataset",
                name: "Meningsmålinger til Folketingsvalget 2026",
                description:
                  "Løbende opdaterede meningsmålinger fra alle større danske analyseinstitutter til Folketingsvalget 24. marts 2026. Indeholder stemmeandele for alle partier, vægtet gennemsnit og mandatprognose.",
                url: "https://valgidanmark.dk",
                inLanguage: "da-DK",
                keywords: [
                  "meningsmålinger",
                  "folketing",
                  "valg 2026",
                  "valgprognose",
                  "dansk politik",
                ],
                creator: {
                  "@type": "Organization",
                  name: "ValgiDanmark",
                  url: "https://valgidanmark.dk",
                },
                temporalCoverage: "2024/2026",
                spatialCoverage: {
                  "@type": "Place",
                  name: "Danmark",
                },
                updateFrequency: "dagligt",
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "ValgiDanmark",
                url: "https://valgidanmark.dk",
                logo: `https://valgidanmark.dk/Logo.png`,
                sameAs: [],
              },
            ]),
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <LanguageProvider>
            <SiteHeader />
            <Countdown />
            <div className="pb-16 sm:pb-0">{children}</div>
            <Toaster richColors position="bottom-center" />
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
