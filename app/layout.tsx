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

export const metadata: Metadata = {
  title: "ValgiDanmark – Meningsmålinger & Prognose 2026",
  description: "Vægtet meningsmålingsgennemsnit, mandatfordeling og Monte Carlo-prognose til Folketingsvalget 24. marts 2026.",
  icons: { icon: "/favicon.svg", type: "image/svg+xml" },
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
            {children}
            <Toaster richColors position="bottom-center" />
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
