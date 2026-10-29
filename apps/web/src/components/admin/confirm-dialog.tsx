"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** "danger" for anything that removes or hides something. */
  tone?: "danger" | "normal";
  pending?: boolean;
  /** When set, the confirm button stays disabled until the admin types this word. For the irreversible. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A confirmation that cannot be clicked through by accident: focus starts on "Batal", Tab stays inside, Esc and
 * the backdrop cancel (unless the action is running), and focus returns to where it was.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, tone = "normal", pending = false, requireText, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const bodyId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    cancel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const blocked = pending || (requireText !== undefined && typed.trim() !== requireText);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && !pending) {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          {tone === "danger" ? (
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--kurang-bg)", color: "var(--kurang-fg)" }}>
              <TriangleAlert className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <div id={bodyId} className="mt-1.5 space-y-2 text-[0.95rem] text-ink-2">
              {children}
            </div>
          </div>
        </div>

        {requireText !== undefined ? (
          <div className="mt-4">
            <label htmlFor={`${bodyId}-confirm`} className="admin-label">
              Ketik <span className="font-mono">{requireText}</span> untuk melanjutkan
            </label>
            <input
              id={`${bodyId}-confirm`}
              className="admin-input"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancel} type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={pending}>
            Batal
          </button>
          <button type="button" className={`btn btn-sm ${tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={blocked}>
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {pending ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
