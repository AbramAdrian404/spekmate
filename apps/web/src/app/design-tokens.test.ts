import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The colors live in globals.css as CSS variables, light first and dark inside a media query.
 * This reads them from there, so a color change that drops below WCAG contrast fails the tests.
 */
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function block(source: string, opening: RegExp): string {
  const match = opening.exec(source);
  if (!match) throw new Error(`globals.css: could not find ${opening}`);
  let depth = 1;
  let index = match.index + match[0].length;
  const start = index;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    index += 1;
  }
  return source.slice(start, index - 1);
}

function tokens(source: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of source.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) found[match[1]!] = match[2]!;
  return found;
}

const light = tokens(block(css, /^:root\s*\{/m));
const dark = { ...light, ...tokens(block(block(css, /@media \(prefers-color-scheme: dark\)\s*\{/), /:root\s*\{/)) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground token, background token, where it is used] */
type Pair = readonly [string, string, string];

const TEXT: readonly Pair[] = [
  ["ink", "bg", "body text"],
  ["ink", "surface", "text in cards"],
  ["ink", "surface-2", "text in panels"],
  ["ink-2", "bg", "secondary text"],
  ["ink-2", "surface", "secondary text in cards"],
  ["ink-2", "surface-2", "secondary text in panels"],
  ["ink-3", "bg", "muted text"],
  ["ink-3", "surface", "muted text and placeholders in cards"],
  ["ink-3", "surface-2", "muted text in panels and footer"],
  ["accent", "bg", "links and eyebrow"],
  ["accent", "surface", "links in cards"],
  ["accent", "surface-2", "links in panels"],
  ["accent", "accent-soft", "accent tag, quiet button on hover"],
  ["accent-strong", "accent-soft", "step numbers"],
  ["on-accent", "accent", "primary button"],
  ["on-accent", "accent-strong", "primary button on hover"],
  ["ink", "accent-soft", "checked choice card"],
  ["ink-2", "accent-soft", "hint in a checked choice card"],
  ["cocok-fg", "cocok-bg", "verdict: cocok"],
  ["bisa-fg", "bisa-bg", "verdict: bisa dengan catatan"],
  ["data-fg", "data-bg", "verdict: data belum lengkap"],
  ["kurang-fg", "kurang-bg", "verdict: kurang cocok"],
  ["netral-fg", "netral-bg", "verdict: tidak dinilai"],
  ["kurang-fg", "surface", "error text in a form"],
  ["kurang-fg", "bg", "error text on the page"],
  ["cocok-fg", "surface", "positive text in cards"],
  ["bisa-fg", "surface", "warning text in cards"],
  ["cocok-fg", "surface-2", "positive text in panels"],
  ["bisa-fg", "surface-2", "warning text in panels"],
  ["data-fg", "surface", "info text in cards"],
  ["data-fg", "surface-2", "info text in panels"],
];

/** The companion tones: tinted chips and cards carry text, so it must hold up on every surface it can meet. */
const TONES = ["blue", "violet", "coral", "amber", "mint"] as const;
const TONE_TEXT: readonly Pair[] = TONES.flatMap((tone): Pair[] => [
  [`${tone}-fg`, `${tone}-soft`, `${tone} chip`],
  [`${tone}-fg`, "surface", `${tone} text in cards`],
  [`${tone}-fg`, "surface-2", `${tone} text in panels`],
  [`${tone}-fg`, "bg", `${tone} text on the page`],
]);

/** The hero gradient and the closing band carry text too. */
const SECTIONS: readonly Pair[] = ["hero-1", "hero-2", "hero-3"].flatMap((bg): Pair[] => [
  ["ink", bg, "headline on the hero"],
  ["ink-2", bg, "intro text on the hero"],
  ["ink-3", bg, "small text on the hero"],
  ["accent", bg, "eyebrow and links on the hero"],
]).concat(
  ["band-1", "band-2", "band-3"].flatMap((bg): Pair[] => [
    ["on-band", bg, "heading on the closing band"],
    ["on-band-2", bg, "body text on the closing band"],
    ["band-button", bg, "closing band button edge"],
  ]),
  [
    ["band-button-text", "band-button", "button on the closing band"],
    ["band-button-text", "on-band-2", "button on the closing band, hovered"],
  ],
);

/** Parts of a control you need to see to use it: field edges and the keyboard focus ring. */
const CONTROLS: readonly Pair[] = [
  ["control-line", "surface", "field edge on a card"],
  ["control-line", "bg", "field edge on the page"],
  ["control-line", "surface-2", "field edge on a panel"],
  ["focus", "surface", "focus ring on a card"],
  ["focus", "bg", "focus ring on the page"],
  ["focus", "accent-soft", "focus ring on a checked choice card"],
  ["on-band", "band-1", "focus ring on the closing band, left"],
  ["on-band", "band-2", "focus ring on the closing band, middle"],
  ["on-band", "band-3", "focus ring on the closing band, right"],
];

const THEMES = [
  ["light", light],
  ["dark", dark],
] as const;

describe.each(THEMES)("%s theme", (_name, theme) => {
  it.each([...TEXT, ...TONE_TEXT, ...SECTIONS])("%s on %s reaches 4.5:1 (%s)", (fg, bg) => {
    expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CONTROLS)("%s on %s reaches 3:1 (%s)", (fg, bg) => {
    expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(3);
  });
});

describe("the parser", () => {
  it("finds the tokens in both themes", () => {
    expect(light.ink).toMatch(/^#/);
    expect(dark.ink).toMatch(/^#/);
    expect(dark.ink).not.toBe(light.ink);
  });

  it("matches the WCAG reference ratios", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});
