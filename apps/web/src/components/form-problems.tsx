import { CircleAlert } from "lucide-react";
import type { ConsultFieldErrors } from "@/lib/consult";

/** Where each message points, in the order the fields appear on the form. */
const FIELDS = [
  { key: "kebutuhan", href: "#kebutuhan" },
  { key: "anggaran", href: "#anggaran" },
  { key: "penyimpanan", href: "#penyimpanan" },
] as const;

/**
 * Sits where the recommendations would, with the same `id="hasil"`, so the form's "#hasil" jump lands
 * here when something is wrong. Without it, a phone user who pressed "Cari laptop" would see nothing
 * happen: the field's own message is above the part of the screen they are looking at.
 */
export function FormProblems({ errors }: { errors: ConsultFieldErrors }) {
  const items = FIELDS.flatMap(({ key, href }) => (errors[key] ? [{ key, href, text: errors[key] }] : []));
  if (items.length === 0) return null;

  return (
    <div id="hasil" role="alert" className="callout mt-10" data-tone="bad">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Belum bisa mencari laptop</h2>
        <p>Periksa isian berikut, lalu tekan tombol Cari laptop lagi:</p>
        <ul className="list-disc space-y-1 pl-5">
          {items.map((item) => (
            <li key={item.key}>
              <a href={item.href} className="font-semibold text-current underline">
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
