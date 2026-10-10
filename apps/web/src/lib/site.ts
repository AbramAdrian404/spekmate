/** Names and links used across the site. Change the brand here, nowhere else. */
export const SITE = {
  name: "SpekMate",
  tagline: "Teman yang paham laptop, dan jujur",
  description:
    "Ceritakan kebutuhan dan anggaranmu, dapatkan rekomendasi laptop dalam bahasa biasa. Lengkap dengan alasan, harga bertanggal, dan kejelasan apakah RAM atau SSD-nya bisa ditambah.",
  repoUrl: process.env.NEXT_PUBLIC_REPO_URL || null,
} as const;

export const NAV = [
  { href: "/konsultasi", label: "Konsultasi" },
  { href: "/laptop", label: "Daftar laptop" },
  { href: "/cara-menilai", label: "Cara menilai" },
] as const;

const LOCAL_ORIGIN = "http://localhost:3000";

/** "spekmate.vercel.app/" and "https://spekmate.vercel.app" both become "https://spekmate.vercel.app". */
function withScheme(value: string): string {
  const trimmed = value.trim();
  const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return full.replace(/\/+$/, "");
}

function parses(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Absolute origin for link previews. Vercel fills VERCEL_PROJECT_PRODUCTION_URL (no protocol).
 * The value only decides how preview links look, so a typo here must never take the whole site down:
 * an unusable value is skipped instead of crashing the build.
 */
export function siteOrigin(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL];
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const origin = withScheme(raw);
    if (parses(origin)) return origin;
  }
  return LOCAL_ORIGIN;
}
