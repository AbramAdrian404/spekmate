import type { NeedTone } from "@/lib/need-visuals";

const TONE_VAR: Record<NeedTone, string> = {
  blue: "var(--blue)",
  violet: "var(--violet)",
  mint: "var(--mint)",
  amber: "var(--amber)",
  coral: "var(--coral)",
};

/**
 * A stand-in for a missing photo: an original, generic laptop (not any real model's look), with a screen tinted in the
 * tone of the need the model suits best. It is decorative and carries no spec, so it can never be mistaken for data.
 * It disappears on its own once the model has a real photo, because the card shows the photo instead.
 *
 * No gradient ids, so any number of these can share a page.
 */
export function LaptopArt({ tone = "blue", className }: { tone?: NeedTone; className?: string }) {
  const color = TONE_VAR[tone];
  return (
    <svg viewBox="0 0 240 150" aria-hidden="true" focusable="false" className={className}>
      <rect x="40" y="12" width="160" height="104" rx="9" fill="#d8d6dd" />
      <rect x="45" y="17" width="150" height="94" rx="5" fill="#1d2b3a" />
      <rect x="45" y="17" width="150" height="94" rx="5" fill={color} opacity="0.88" />
      <rect x="57" y="30" width="60" height="7" rx="3.5" fill="#fff" opacity="0.92" />
      <rect x="57" y="44" width="92" height="5" rx="2.5" fill="#fff" opacity="0.6" />
      <rect x="57" y="55" width="76" height="5" rx="2.5" fill="#fff" opacity="0.45" />
      <rect x="57" y="76" width="34" height="22" rx="5" fill="#fff" opacity="0.85" />
      <rect x="97" y="76" width="34" height="22" rx="5" fill="#fff" opacity="0.6" />
      <rect x="137" y="76" width="34" height="22" rx="5" fill="#fff" opacity="0.4" />
      <path d="M14 122h212l-9 14a8 8 0 0 1-7 4H30a8 8 0 0 1-7-4z" fill="#c6c4cc" />
      <rect x="14" y="120" width="212" height="5" rx="2.5" fill="#e6e4ea" />
      <rect x="100" y="126" width="40" height="4" rx="2" fill="#a9a7b0" />
    </svg>
  );
}
