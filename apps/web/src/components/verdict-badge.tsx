import { CircleAlert, CircleCheck, CircleHelp, CircleMinus, CircleX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Status, Verdict } from "@/lib/types";

type Tone = "cocok" | "bisa" | "data" | "kurang" | "netral";

const VERDICTS: Record<Verdict, { tone: Tone; Icon: LucideIcon; label: string }> = {
  cocok: { tone: "cocok", Icon: CircleCheck, label: "Cocok" },
  bisa_dengan_catatan: { tone: "bisa", Icon: CircleAlert, label: "Bisa, dengan catatan" },
  data_belum_lengkap: { tone: "data", Icon: CircleHelp, label: "Data belum lengkap" },
  kurang_cocok: { tone: "kurang", Icon: CircleX, label: "Kurang cocok" },
  tidak_dinilai: { tone: "netral", Icon: CircleMinus, label: "Tidak dinilai" },
};

const STATUSES: Record<Status, { tone: Tone; Icon: LucideIcon; label: string }> = {
  nyaman: { tone: "cocok", Icon: CircleCheck, label: "Nyaman" },
  cukup: { tone: "bisa", Icon: CircleAlert, label: "Cukup" },
  kurang: { tone: "kurang", Icon: CircleX, label: "Kurang" },
  belum_ada_data: { tone: "data", Icon: CircleHelp, label: "Belum ada data" },
  tidak_dinilai: { tone: "netral", Icon: CircleMinus, label: "Tidak dinilai" },
};

interface BadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/** Color is never the only signal: every verdict also has its own icon and its own words. */
export function VerdictBadge({ verdict, label, size = "md", className }: BadgeProps & { verdict: Verdict; label?: string }) {
  const { tone, Icon, label: fallback } = VERDICTS[verdict];
  return (
    <span className={cn("badge", size === "sm" && "badge-sm", className)} data-tone={tone} data-verdict={verdict}>
      <Icon aria-hidden="true" className={size === "sm" ? "size-3.5 shrink-0" : "size-4 shrink-0"} />
      {label ?? fallback}
    </span>
  );
}

/** Same look, for one criterion (RAM, storage, ...) rather than a whole laptop. */
export function StatusBadge({ status, label, size = "sm", className }: BadgeProps & { status: Status; label?: string }) {
  const { tone, Icon, label: fallback } = STATUSES[status];
  return (
    <span className={cn("badge", size === "sm" && "badge-sm", className)} data-tone={tone} data-status={status}>
      <Icon aria-hidden="true" className={size === "sm" ? "size-3.5 shrink-0" : "size-4 shrink-0"} />
      {label ?? fallback}
    </span>
  );
}
