"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useLanguage } from "./LanguageContext";

export function SiteHeader() {
  const { t, lang, setLang } = useLanguage();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`text-xs font-mono px-3 py-1.5 rounded-md transition-colors ${
          active
            ? "bg-muted text-foreground font-semibold"
            : "text-foreground/60 hover:bg-muted hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold font-sans text-lg tracking-tight">
            Valg<span className="text-[hsl(var(--accent))]">i</span>Danmark
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navLink("/", t("nav.polls"))}
            {navLink("/statsminister", t("nav.statsminister"))}
            {navLink("/spaerregraensen", t("nav.threshold"))}
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
