import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ValgiDanmark – Meningsmålinger til Folketingsvalget 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ color: "#ffffff", fontSize: 130, fontWeight: 900, letterSpacing: "-4px" }}>
            Valg
          </span>
          <span style={{ color: "#3b82f6", fontSize: 130, fontWeight: 900, letterSpacing: "-4px" }}>
            i
          </span>
          <span style={{ color: "#ffffff", fontSize: 130, fontWeight: 900, letterSpacing: "-4px" }}>
            Danmark
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "#94a3b8",
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "0px",
          }}
        >
          Meningsmålinger &amp; Prognose · Folketingsvalget 24. marts 2026
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "#3b82f6",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
