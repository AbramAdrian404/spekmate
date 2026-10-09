import { RefreshCw, TriangleAlert } from "lucide-react";
import type { ApiError } from "@/lib/api";

/** What visitors see when the data service cannot be reached. Technical detail stays in the server log. */
export function ApiProblem({ error, retryHref }: { error: Pick<ApiError, "visitorMessage">; retryHref?: string }) {
  return (
    <div className="callout" data-tone="bad" role="alert">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-2">
        <p className="font-semibold">Data belum bisa dimuat</p>
        <p>{error.visitorMessage}</p>
        {retryHref ? (
          <p>
            <a href={retryHref} className="inline-flex items-center gap-1.5 font-semibold underline">
              <RefreshCw aria-hidden="true" className="size-4" />
              Coba lagi
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
