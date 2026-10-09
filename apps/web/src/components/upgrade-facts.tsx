import { HardDrive, MemoryStick } from "lucide-react";
import { sentenceCase } from "@/lib/labels";
import type { Recommendation } from "@/lib/types";

/** The question buyers rarely get a straight answer to: can I add RAM or swap the SSD later? */
export function UpgradeFacts({ upgrade }: { upgrade: Recommendation["upgrade"] }) {
  const rows = [
    { key: "ram", title: "RAM", Icon: MemoryStick, fact: upgrade.ram },
    { key: "storage", title: "Penyimpanan", Icon: HardDrive, fact: upgrade.storage },
  ];
  return (
    <section aria-label="Bisa ditingkatkan nanti?" className="panel p-4">
      <p className="mb-2 text-sm font-semibold text-ink">Bisa ditingkatkan nanti?</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ key, title, Icon, fact }) => (
          <div key={key} className="flex gap-2.5">
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <dt className="text-sm font-semibold text-ink">
                {title}: {fact.label}
              </dt>
              <dd className="text-sm text-ink-2">{sentenceCase(fact.note)}.</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
