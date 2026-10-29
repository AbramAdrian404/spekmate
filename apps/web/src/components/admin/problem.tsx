import { RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { Failure } from "@/lib/admin/errors";

/** A load that failed: says what happened and offers a way out, instead of a blank page. */
export function AdminProblem({ failure, retryHref }: { failure: Failure; retryHref?: string }) {
  return (
    <div role="alert" className="admin-card space-y-3 p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--kurang-bg)", color: "var(--kurang-fg)" }}>
          <TriangleAlert className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Data belum bisa dimuat</h2>
          <p className="mt-1 text-ink-2">{failure.message}</p>
        </div>
      </div>
      {retryHref ? (
        <Link href={retryHref} className="btn btn-secondary btn-sm">
          <RefreshCw aria-hidden="true" className="size-4" />
          Muat ulang
        </Link>
      ) : null}
    </div>
  );
}
