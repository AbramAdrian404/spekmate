import type { CSSProperties, ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="wash-lite border-b border-line">
      <div className="container-page py-10 sm:py-12">
        {eyebrow ? (
          <p className="rise-in eyebrow mb-2" style={{ "--rise-delay": "0ms" } as CSSProperties}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="rise-in text-3xl font-extrabold sm:text-4xl" style={{ "--rise-delay": "70ms" } as CSSProperties}>
          {title}
        </h1>
        {children ? (
          <div className="rise-in measure mt-3 text-lg text-ink-2" style={{ "--rise-delay": "150ms" } as CSSProperties}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
