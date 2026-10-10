import type { CSSProperties } from "react";

/**
 * The hero's laptop: an original illustration (not a photo of any real model, and not a real product's
 * look), with a silver body, a dark bezel and a bright SpekMate-style screen. The screen shows the shape
 * of the product -- need pills, a result card with a verdict and three bars -- and carries no specs or
 * prices, so nothing on it can be mistaken for data. The real numbers float next to it as HTML (HeroStage).
 *
 * Ids are fixed, so render it once per page.
 */
export function HeroLaptop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 350" role="img" aria-label="Ilustrasi laptop yang menampilkan hasil konsultasi SpekMate" className={className}>
      <defs>
        <linearGradient id="hl-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfcff" />
          <stop offset="1" stopColor="#dbe3f2" />
        </linearGradient>
        <linearGradient id="hl-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7fd" />
          <stop offset="0.55" stopColor="#d9e1f1" />
          <stop offset="1" stopColor="#b9c5df" />
        </linearGradient>
        <linearGradient id="hl-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a8bff" />
          <stop offset="1" stopColor="#1d5cf0" />
        </linearGradient>
        <linearGradient id="hl-glare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hl-floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#0b1b3f" stopOpacity="0.28" />
          <stop offset="1" stopColor="#0b1b3f" stopOpacity="0" />
        </radialGradient>
        <clipPath id="hl-screen">
          <rect x="104" y="42" width="352" height="208" rx="6" />
        </clipPath>
      </defs>

      {/* Shadow on the table */}
      <ellipse cx="280" cy="326" rx="250" ry="15" fill="url(#hl-floor)" />

      {/* Lid and screen */}
      <rect x="84" y="14" width="392" height="258" rx="20" fill="url(#hl-lid)" stroke="#c3cde3" />
      <rect x="96" y="26" width="368" height="232" rx="11" fill="#0c1736" />
      <circle cx="280" cy="34" r="2.2" fill="#2b3d73" />

      <g clipPath="url(#hl-screen)">
        <rect x="104" y="42" width="352" height="208" fill="#ffffff" />
        {/* top bar */}
        <rect x="104" y="42" width="352" height="26" fill="#f1f5fd" />
        <rect x="116" y="49" width="12" height="12" rx="3.5" fill="url(#hl-mark)" />
        <rect x="133" y="52" width="42" height="6" rx="3" fill="#0b1b3f" />
        <rect x="352" y="52" width="26" height="6" rx="3" fill="#c8d3ea" />
        <rect x="386" y="52" width="26" height="6" rx="3" fill="#c8d3ea" />
        <rect x="420" y="52" width="24" height="6" rx="3" fill="#1d5cf0" />

        {/* headline placeholder */}
        <rect x="118" y="80" width="170" height="10" rx="5" fill="#0b1b3f" />
        <rect x="118" y="95" width="116" height="7" rx="3.5" fill="#c8d3ea" />

        {/* need pills: two picked, one not */}
        <g>
          <rect x="118" y="111" width="82" height="22" rx="11" fill="#e4eeff" stroke="#1d5cf0" strokeWidth="1.4" />
          <circle cx="130" cy="122" r="6" fill="#5b85f2" />
          <rect x="140" y="119" width="48" height="6" rx="3" fill="#1342c4" opacity="0.75" />
        </g>
        <g>
          <rect x="207" y="111" width="68" height="22" rx="11" fill="#ffffff" stroke="#b6c2dd" strokeWidth="1.2" />
          <circle cx="219" cy="122" r="6" fill="#d7c6f6" />
          <rect x="229" y="119" width="36" height="6" rx="3" fill="#c8d3ea" />
        </g>
        <g>
          <rect x="282" y="111" width="82" height="22" rx="11" fill="#e4eeff" stroke="#1d5cf0" strokeWidth="1.4" />
          <circle cx="294" cy="122" r="6" fill="#40c59b" />
          <rect x="304" y="119" width="50" height="6" rx="3" fill="#1342c4" opacity="0.75" />
        </g>

        {/* result card */}
        <rect x="118" y="144" width="324" height="94" rx="12" fill="#ffffff" stroke="#dde4f2" />
        <rect x="118" y="144" width="324" height="4" rx="2" fill="#3fae6a" />
        <circle cx="140" cy="168" r="10" fill="#1d5cf0" />
        <path d="M137 168.5l2.4 2.4 4.2-4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="158" y="161" width="104" height="8" rx="4" fill="#0b1b3f" />
        <rect x="158" y="175" width="138" height="6" rx="3" fill="#c8d3ea" />
        <g className="screen-pop" style={{ "--pop-delay": "1000ms" } as CSSProperties}>
          <rect x="132" y="192" width="74" height="20" rx="10" fill="#e6f4ea" stroke="#b4dcbf" />
          <path d="M143 202.2l2.6 2.6 4.6-5" fill="none" stroke="#166534" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <text x="156" y="205.6" fontSize="10" fontWeight="800" fill="#166534" fontFamily="inherit">
            Cocok
          </text>
        </g>
        <rect x="132" y="220" width="120" height="5" rx="2.5" fill="#e3e9f6" />

        {/* three rising bars: the same meter the logo and the results use */}
        <rect className="screen-bar" style={{ "--bar-delay": "800ms" } as CSSProperties} x="352" y="206" width="16" height="22" rx="4" fill="#40c59b" />
        <rect className="screen-bar" style={{ "--bar-delay": "920ms" } as CSSProperties} x="376" y="190" width="16" height="38" rx="4" fill="#f7c041" />
        <rect className="screen-bar" style={{ "--bar-delay": "1040ms" } as CSSProperties} x="400" y="172" width="16" height="56" rx="4" fill="#f37d65" />

        {/* a little glass glare */}
        <path d="M104 42h170L190 250h-86z" fill="url(#hl-glare)" />
      </g>

      {/* Hinge and keyboard deck */}
      <path d="M72 272h416a2 2 0 0 1 2 2v2H70v-2a2 2 0 0 1 2-2z" fill="#aab7d3" />
      <path d="M44 276h472c0 0 8 0 8 8a24 24 0 0 1-24 24H60a24 24 0 0 1-24-24c0-8 8-8 8-8z" fill="url(#hl-deck)" stroke="#b3c0dc" />
      <rect x="236" y="276" width="88" height="7" rx="3.5" fill="#aab7d3" />
    </svg>
  );
}
