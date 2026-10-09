import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TARGET, generate } from "../../scripts/gen-api-types.mjs";

describe("API types", () => {
  it("api-schema.d.ts matches openapi.json (run: npm run gen:types)", async () => {
    const committed = readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");
    const expected = (await generate()).replace(/\r\n/g, "\n");
    expect(committed).toBe(expected);
  });
});
