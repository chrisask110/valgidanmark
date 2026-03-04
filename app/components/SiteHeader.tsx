"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useLanguage } from "./LanguageContext";

export function SiteHeader() {
  const { t, lang, setLang } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold font-sans text-lg tracking-tight">
            Valg<span className="text-[hsl(var(--accent))]">i</span>Danmark
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              className="text-xs font-mono px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80"
            >
              {t("nav.polls")}
            </Link>
            <Link
              href="/statsminister"
              className="text-xs font-mono px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80"
            >
              {t("nav.statsminister")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "da" ? "en" : "da")}
            className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            {lang === "da" ? "EN" : "DA"}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
