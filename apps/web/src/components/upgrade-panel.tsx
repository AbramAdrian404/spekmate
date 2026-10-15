import { HardDrive, MemoryStick, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { sentenceCase, upgradeTrust } from "@/lib/labels";
import { ramFacts, storageFacts } from "@/lib/specs";
import type { Variant } from "@/lib/types";
import { LinkifiedText } from "./linkified-text";

const TRUST_STYLE = {
  checked: { tone: "cocok", Icon: ShieldCheck, extra: null },
  unchecked: {
    tone: "bisa",
    Icon: ShieldAlert,
    extra: "Info ini belum kami cocokkan dengan sumber resmi. Cek lagi sebelum membeli.",
  },
  unknown: { tone: "data", Icon: ShieldQuestion, extra: null },
} as const;

/** The honest answer to "can I add RAM / swap the SSD later?", with how sure we are. */
export function UpgradePanel({ variant }: { variant: Variant }) {
  const { ram, storage } = variant.specs;
  const trust = upgradeTrust(variant.upgrade_verification);
  const style = TRUST_STYLE[trust.trust];

  const blocks = [
    { key: "ram", title: "RAM", Icon: MemoryStick, label: ram.layout_label, note: ram.upgrade_note, facts: ramFacts(ram) },
    { key: "storage", title: "Penyimpanan", Icon: HardDrive, label: storage.replaceable_label, note: storage.upgrade_note, facts: storageFacts(storage) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map(({ key, title, Icon, label, note, facts }) => (
          <div key={key} className="card space-y-2.5 p-4">
            <p className="flex items-center gap-2 font-display font-semibold">
              <Icon aria-hidden="true" className="size-5 text-accent" />
              {title}
            </p>
            <p className="font-semibold text-ink">{label}</p>
            <p className="text-ink-2">{sentenceCase(note)}.</p>
            {facts.length > 0 ? (
              <ul className="space-y-0.5 border-t border-line pt-2.5 text-sm text-ink-3">
                {facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="badge badge-sm" data-tone={style.tone}>
          <style.Icon aria-hidden="true" className="size-3.5" />
          {trust.label}
        </p>
        {style.extra ? <p className="text-sm text-ink-2">{style.extra}</p> : null}
        {variant.upgrade_source ? (
          <details className="text-sm text-ink-2">
            <summary className="inline-flex min-h-9 items-center font-semibold text-accent">Lihat sumber info upgrade</summary>
            <p className="measure mt-1.5">
              <LinkifiedText text={variant.upgrade_source} />
            </p>
          </details>
        ) : null}
      </div>
    </div>
  );
}
