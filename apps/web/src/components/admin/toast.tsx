"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "ok" | "bad" | "info";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  text?: string;
}

interface ToastApi {
  success: (title: string, text?: string) => void;
  error: (title: string, text?: string) => void;
  info: (title: string, text?: string) => void;
}

const Context = createContext<ToastApi | null>(null);

const ICON = { ok: CircleCheck, bad: CircleAlert, info: Info } as const;
const LIFETIME_MS: Record<Tone, number> = { ok: 5000, info: 6000, bad: 10000 };

/**
 * Short messages after an action ("Laptop disimpan", "Gambar gagal diunggah"). Each one says what happened, in
 * words and an icon (never colour alone), stays long enough to read, and can be closed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback((tone: Tone, title: string, text?: string) => {
    const id = ++counter.current;
    setToasts((current) => [...current.slice(-3), { id, tone, title, text }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, text) => push("ok", title, text),
      error: (title, text) => push("bad", title, text),
      info: (title, text) => push("info", title, text),
    }),
    [push],
  );

  return (
    <Context.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </Context.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = ICON[toast.tone];
  useEffect(() => {
    const timer = window.setTimeout(onClose, LIFETIME_MS[toast.tone]);
    return () => window.clearTimeout(timer);
  }, [onClose, toast.tone]);

  return (
    <div
      role={toast.tone === "bad" ? "alert" : "status"}
      className="callout pointer-events-auto w-full max-w-md items-start shadow-lg"
      data-tone={toast.tone === "bad" ? "bad" : toast.tone === "ok" ? "ok" : "info"}
      style={{ background: "var(--surface)" }}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{toast.title}</p>
        {toast.text ? <p className="mt-0.5 text-sm">{toast.text}</p> : null}
      </div>
      <button type="button" onClick={onClose} aria-label="Tutup pesan" className="-m-1 rounded-md p-1 hover:bg-black/5">
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Context);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
