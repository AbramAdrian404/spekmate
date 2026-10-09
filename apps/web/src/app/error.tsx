"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-2xl" style={{ background: "var(--kurang-bg)", color: "var(--kurang-fg)" }}>
          <TriangleAlert className="size-7" />
        </span>
        <h1 className="text-3xl font-extrabold">Halaman ini belum bisa dimuat</h1>
        <p className="text-ink-2">
          Biasanya karena layanan datanya sedang tidak terjangkau. Itu bukan salahmu. Coba lagi sebentar lagi.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshCw aria-hidden="true" className="size-4" />
            Coba lagi
          </button>
          <Link href="/" className="btn btn-secondary">
            Ke beranda
          </Link>
        </div>
        {error.digest ? <p className="text-xs text-ink-3">Kode galat: {error.digest}</p> : null}
      </div>
    </div>
  );
}
