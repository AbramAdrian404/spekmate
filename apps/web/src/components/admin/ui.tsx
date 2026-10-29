import { Archive, CircleCheck, FilePen } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABEL } from "@/lib/admin/field-ui";

const STATUS_VIEW = {
  published: { tone: "cocok", Icon: CircleCheck },
  draft: { tone: "data", Icon: FilePen },
  archived: { tone: "netral", Icon: Archive },
} as const;

/** Aktif / Draf / Diarsipkan: always an icon and a word, so it never depends on colour. */
export function StatusBadge({ status }: { status: string }) {
  const view = STATUS_VIEW[status as keyof typeof STATUS_VIEW] ?? STATUS_VIEW.draft;
  return (
    <span className="badge badge-sm" data-tone={view.tone}>
      <view.Icon aria-hidden="true" className="size-3.5" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeading({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="admin-card px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <p className="mx-auto mt-1 max-w-md text-ink-2">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
