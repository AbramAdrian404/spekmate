/**
 * One icon and one brand tone per need category, so the same need looks the same everywhere on
 * the site: the consultation's choice cards, its result badges, and the education section.
 *
 * The five tones here are the same five used by the brand stripe (see .tone-* in globals.css), so
 * adding a need-specific color never means inventing a new one. A need id with no entry below
 * (a new need added to the catalog later, or the synthetic "combined" id a multi-need recommendation
 * sometimes carries) falls back to a neutral laptop icon instead of breaking.
 */
import { Code2, Flame, Gamepad2, GraduationCap, Laptop, type LucideIcon, Palette } from "lucide-react";

export type NeedTone = "blue" | "violet" | "mint" | "amber" | "coral";

export interface NeedVisual {
  tone: NeedTone;
  Icon: LucideIcon;
}

const NEED_VISUALS: Record<string, NeedVisual> = {
  "kuliah-dan-kantor": { tone: "blue", Icon: GraduationCap },
  "desain-grafis": { tone: "violet", Icon: Palette },
  pemrograman: { tone: "mint", Icon: Code2 },
  "game-ringan": { tone: "amber", Icon: Gamepad2 },
  "game-berat": { tone: "coral", Icon: Flame },
};

const FALLBACK: NeedVisual = { tone: "blue", Icon: Laptop };

export function needVisual(needId: string): NeedVisual {
  return NEED_VISUALS[needId] ?? FALLBACK;
}
