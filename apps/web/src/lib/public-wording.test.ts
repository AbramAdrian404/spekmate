import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "./site";

/**
 * The public site calls the activity "Temukan laptop" and its output "rekomendasi". The word "konsultasi" stays only
 * where it is an internal name: the /konsultasi address, the form's DOM id, and code identifiers. This reads the
 * public source files and fails when it shows up in text a visitor can see.
 */
const ROOTS = ["src/components", "src/app/(site)", "src/app/not-found.tsx", "src/app/layout.tsx", "src/lib"];

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

function visibleLines(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line)) // comments are for developers
    .map((line) =>
      line
        .replace(/\/konsultasi/g, "") // the address
        .replace(/konsultasi-form/g, "") // the form's id
        .replace(/Konsultasi(Page|Form)\b/g, "") // identifiers
        .replace(/(parse|Quick|Consult)\w*/g, ""),
    );
}

describe("public wording", () => {
  it("names the main page 'Temukan laptop' in the menu, in this order", () => {
    expect(NAV.map((item) => item.label)).toEqual(["Beranda", "Temukan laptop", "Daftar laptop", "Cara menilai"]);
    expect(NAV.find((item) => item.label === "Temukan laptop")?.href).toBe("/konsultasi");
  });

  it("does not show the word 'konsultasi' to visitors", () => {
    const offenders = ROOTS.flatMap(files)
      .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\./.test(file))
      .flatMap((file) => visibleLines(readFileSync(file, "utf8")).filter((line) => /konsultasi/i.test(line)).map((line) => `${file}: ${line.trim()}`));
    expect(offenders).toEqual([]);
  });
});
