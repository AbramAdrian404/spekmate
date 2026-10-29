import { describe, expect, it } from "vitest";
import openapi from "../../../openapi.json";
import {
  AVAILABILITY_FIELDS,
  BODY_FIELDS,
  OPTIONAL_VARIANT_GROUPS,
  PRICE_MONEY_FIELDS,
  PRICE_TEXT_FIELDS,
  PRODUCT_FIELDS,
  RATING_FIELDS,
  RECOMMENDATION_FIELDS,
  VARIANT_AVAILABILITY_FIELDS,
  VARIANT_NOTE_FIELDS,
  type FieldUi,
} from "./field-ui";

/**
 * The form's labels are written by hand; the rules come from the API. These tests keep the two in step: a field the
 * API accepts must have a place in the form, and the limits and choices the form shows must be the API's.
 */
type Schema = {
  type?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  format?: string;
  anyOf?: Schema[];
};
type Component = { required?: string[]; properties: Record<string, Schema> };

const schemas = (openapi as unknown as { components: { schemas: Record<string, Component> } }).components.schemas;

function core(schema: Schema): Schema {
  return schema.anyOf ? (schema.anyOf.find((part) => part.type !== "null") ?? {}) : schema;
}

function check(componentName: string, fields: readonly FieldUi[], handledElsewhere: string[]) {
  const component = schemas[componentName];
  const names = fields.map((field) => field.name);

  it(`${componentName}: every API field has a place in the form, and nothing extra`, () => {
    const expected = Object.keys(component.properties).filter((name) => !handledElsewhere.includes(name)).sort();
    expect([...names].sort()).toEqual(expected);
  });

  it(`${componentName}: no field appears twice`, () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it(`${componentName}: types, choices and limits match the API`, () => {
    for (const field of fields) {
      const schema = core(component.properties[field.name]);
      const where = `${componentName}.${field.name}`;
      if (field.kind === "int") {
        expect(schema.type, where).toBe("integer");
        expect(field.min, where).toBe(schema.minimum);
        expect(field.max, where).toBe(schema.maximum);
      } else if (field.kind === "float") {
        expect(schema.type, where).toBe("number");
        expect(field.min, where).toBe(schema.minimum);
        expect(field.max, where).toBe(schema.maximum);
      } else if (field.kind === "select") {
        expect(schema.enum, where).toBeTruthy();
        const offered = (field.options ?? []).map((option) => option.value).sort();
        expect(offered, where).toEqual([...(schema.enum ?? [])].sort());
      } else if (field.kind === "date") {
        expect(schema.format, where).toBe("date");
      } else {
        expect(schema.type, where).toBe("string");
        if (field.maxLength !== undefined) expect(field.maxLength, where).toBe(schema.maxLength);
      }
      expect(Boolean(field.required), `${where} required`).toBe((component.required ?? []).includes(field.name));
    }
  });
}

describe("laptop form fields", () => {
  check("ModelIn", [...PRODUCT_FIELDS, ...AVAILABILITY_FIELDS, ...BODY_FIELDS, ...RECOMMENDATION_FIELDS], [
    "id",
    "status",
    "version",
    "variants",
  ]);
});

describe("configuration form fields", () => {
  check(
    "VariantIn",
    [...RATING_FIELDS, ...OPTIONAL_VARIANT_GROUPS.flatMap((group) => group.fields), ...VARIANT_AVAILABILITY_FIELDS, ...VARIANT_NOTE_FIELDS],
    ["id", "prices"],
  );

  it("marks exactly the fields the rule engine needs as required for rating", () => {
    expect(RATING_FIELDS.map((field) => field.name)).toEqual(["cpu", "gpu", "ram_gb", "storage_gb", "panel", "refresh_hz"]);
    const optional = OPTIONAL_VARIANT_GROUPS.flatMap((group) => group.fields);
    expect(optional.some((field) => field.forRating)).toBe(false);
  });
});

describe("price form fields", () => {
  check("PriceIn", [...PRICE_TEXT_FIELDS, ...PRICE_MONEY_FIELDS.map((field) => ({ name: field.name, label: field.label, kind: "int" as const, min: 0, max: 1000000000 }))], [
    "id",
  ]);
});
