import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="wash-lite border-b border-line">
      <div className="container-page py-10 sm:py-12">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {children ? <div className="measure mt-3 text-lg text-ink-2">{children}</div> : null}
      </div>
    </div>
  );
}
