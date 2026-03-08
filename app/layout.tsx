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
    "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. Vægtet gennemsnit, mandatfordeling, Monte Carlo-prognose og statsministerkandidat-simulator.",
  keywords: [
    "meningsmålinger",
    "folketing",
    "valg 2026",
    "folketingsvalg",
    "mandater",
    "prognose",
    "rød blok",
    "blå blok",
    "statsminister",
    "valgprognose",
    "dansk politik",
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
      "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. Vægtet gennemsnit, mandatfordeling og Monte Carlo-prognose.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ValgiDanmark – Meningsmålinger til Folketingsvalget 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ValgiDanmark – Meningsmålinger & Prognose 2026",
    description:
      "Følg meningsmålingerne til Folketingsvalget 24. marts 2026. Vægtet gennemsnit, mandatfordeling og Monte Carlo-prognose.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: { icon: "/favicon.svg", type: "image/svg+xml" },
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
