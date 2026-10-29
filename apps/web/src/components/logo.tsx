import { SITE } from "@/lib/site";

/**
 * The mark: a laptop whose screen shows three rising bars, the same "tingkat" meter the results use,
 * in the site's companion colors. Like any logo it keeps its own colors in light and dark mode.
 * The gradient id is fixed unless you pass another, so render the mark once per page or give each copy its own
 * `gradientId`. Also the favicon (app/icon.svg).
 */
export function Logo({ className = "size-9", gradientId = "spekmate-badge" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="8" y1="0" x2="56" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5a78ee" />
          <stop offset="1" stopColor="#2a3fb5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradientId})`} />
      <rect x="12" y="13" width="40" height="28" rx="5.5" fill="#fff" />
      <rect x="18.5" y="29" width="7" height="6.5" rx="2" fill="#40c59b" />
      <rect x="28.5" y="23.5" width="7" height="12" rx="2" fill="#f7c041" />
      <rect x="38.5" y="18" width="7" height="17.5" rx="2" fill="#f37d65" />
      <rect x="7" y="45.5" width="50" height="6" rx="3" fill="#fff" />
      <rect x="26" y="45.5" width="12" height="2.2" rx="1.1" fill="#3750cc" opacity=".55" />
    </svg>
  );
}

/** "SpekMate" becomes "Spek" in the text color and "Mate" in the brand color. A one-word name stays one color. */
export function Wordmark({ className }: { className?: string }) {
  const [first = "", ...rest] = SITE.name.split(/(?=[A-Z])/);
  return (
    <span className={className}>
      {first}
      {rest.length > 0 ? <span className="text-accent">{rest.join("")}</span> : null}
    </span>
  );
}
