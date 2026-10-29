"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="admin-page grid min-h-dvh place-items-center p-6">
      <div className="admin-card max-w-md space-y-4 p-8 text-center">
        <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full" style={{ background: "var(--kurang-bg)", color: "var(--kurang-fg)" }}>
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">Halaman admin belum bisa dimuat</h1>
        <p className="text-ink-2">Biasanya karena layanan datanya sedang tidak terjangkau. Perubahan yang belum disimpan tidak terkirim.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary btn-sm">
            <RefreshCw aria-hidden="true" className="size-4" />
            Coba lagi
          </button>
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Ke dashboard
          </Link>
        </div>
        {error.digest ? <p className="text-xs text-ink-3">Kode galat: {error.digest}</p> : null}
      </div>
    </div>
  );
}
