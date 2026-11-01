import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** One spec as an icon and a few words. The icon is decoration; the words carry the meaning. */
export function SpecChip({ Icon, children, title, className }: { Icon: LucideIcon; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <span title={title} className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2", className)}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0 text-ink-3" />
      <span className="truncate">{children}</span>
    </span>
  );
}
