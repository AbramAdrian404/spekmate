import type { CSSProperties, ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="bg-surface-2">
      <div className="container-page py-12 sm:py-16">
        {eyebrow ? (
          <p className="rise-in eyebrow mb-2" style={{ "--rise-delay": "0ms" } as CSSProperties}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="rise-in section-title" style={{ "--rise-delay": "70ms" } as CSSProperties}>
          {title}
        </h1>
        {children ? (
          <div className="rise-in measure mt-4 text-lg text-ink-2" style={{ "--rise-delay": "150ms" } as CSSProperties}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
