"use client";

import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

interface ShareBarProps {
  pmName: string;
  coalitionShorts: string[];
  coalitionSeats: number;
}

export function ShareBar({ pmName, coalitionShorts, coalitionSeats }: ShareBarProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [pageUrl, setPageUrl] = useState("https://valgidanmark.dk/statsminister");

  useEffect(() => {
    setPageUrl(window.location.href);
    setCanNativeShare(!!navigator.share);
  }, []);

  const shareText = `Jeg har simuleret Danmarks næste regering! ${pmName} får flertal med ${coalitionShorts.join(", ")} — ${coalitionSeats} mandater. Lav din egen på Valg i Danmark →`;
  const encodedUrl = encodeURIComponent(pageUrl);
  const encodedTweet = encodeURIComponent(`${shareText} ${pageUrl}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link kopieret!");
    } catch {}
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "Min valgforudsigelse – Valg i Danmark", text: shareText, url: pageUrl });
    } catch {}
  };

  const pill =
    "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-mono cursor-pointer select-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-mono text-muted-foreground">Del:</span>

      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTweet}`}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
        aria-label="Del på X (Twitter)"
      >
        <XIcon />
        <span className="hidden sm:inline">X</span>
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
        aria-label="Del på Facebook"
      >
        <FacebookIcon />
        <span className="hidden sm:inline">Facebook</span>
      </a>

      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={pill}
        aria-label="Del på LinkedIn"
      >
        <LinkedInIcon />
        <span className="hidden sm:inline">LinkedIn</span>
      </a>

      <button onClick={copyLink} className={pill} aria-label="Kopiér link">
        <Copy size={14} />
        <span className="hidden sm:inline">Kopiér link</span>
      </button>

      {/* Native share — only visible on mobile */}
      {canNativeShare && (
        <button
          onClick={nativeShare}
          className={`${pill} sm:hidden`}
          aria-label="Del"
        >
          <Share2 size={14} />
        </button>
      )}
    </div>
  );
}
