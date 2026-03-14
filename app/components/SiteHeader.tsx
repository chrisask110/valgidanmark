"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useLanguage } from "./LanguageContext";

function IconPolls({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
      <rect x="2" y="10" width="3" height="8" rx="0.5" />
      <rect x="8.5" y="6" width="3" height="12" rx="0.5" />
      <rect x="15" y="2" width="3" height="16" rx="0.5" />
    </svg>
  );
}

function IconPM({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
      <circle cx="10" cy="7" r="3.5" />
      <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" />
    </svg>
  );
}

function IconThreshold({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
      <path d="M2 14 Q10 4 18 14" />
      <line x1="2" y1="10" x2="18" y2="10" strokeDasharray="3 2" />
    </svg>
  );
}

function IconMarkets({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
      <polyline points="2,14 7,8 11,11 18,4" />
      <polyline points="14,4 18,4 18,8" />
    </svg>
  );
}

function IconInstitutter({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="14" cy="7" r="2.5" />
      <path d="M1 18c0-2.76 2.24-5 5-5h2" />
      <path d="M12 13h2c2.76 0 5 2.24 5 5" />
    </svg>
  );
}

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

  const tabs = [
    { href: "/",                    label: t("nav.polls"),         mobileLabel: t("nav.polls"),         Icon: IconPolls       },
    { href: "/statsminister",       label: t("nav.statsminister"), mobileLabel: t("nav.statsminister"), Icon: IconPM          },
    { href: "/spaerregraensen",     label: t("nav.threshold"),     mobileLabel: "Grænse",               Icon: IconThreshold   },
    { href: "/prediction-markets",  label: t("nav.markets"),       mobileLabel: "Markets",              Icon: IconMarkets     },
    { href: "/institutter",         label: t("nav.institutter"),   mobileLabel: "Inst.",                Icon: IconInstitutter },
  ];

  return (
    <>
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
              {navLink("/prediction-markets", t("nav.markets"))}
              {navLink("/institutter", t("nav.institutter"))}
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

      {/* Mobile bottom tab bar — hidden on sm+ */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm flex safe-area-inset-bottom">
        {tabs.map(({ href, mobileLabel, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors"
              style={{ color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
            >
              <Icon active={active} />
              <span className="text-[9px] font-mono leading-none text-center whitespace-nowrap">{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>

    </>
  );
}
