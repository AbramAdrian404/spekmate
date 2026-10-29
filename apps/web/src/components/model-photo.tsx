import type { ModelImage } from "@/lib/types";

/**
 * A laptop photo shown whole (never cropped, so no port or edge is cut off) on a quiet background.
 * Renders nothing when there is no photo: a missing picture is simply absent, not a grey stand-in that looks like an error.
 */
export function ModelPhoto({ image, fallbackAlt, className = "", priority = false }: { image: ModelImage | null | undefined; fallbackAlt: string; className?: string; priority?: boolean }) {
  if (!image) return null;
  return (
    <div className={`overflow-hidden rounded-xl bg-surface-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- photo addresses come from the API (this site's /api/media or a CDN), so there is no fixed loader to optimise through */}
      <img
        src={image.url}
        alt={image.alt?.trim() || fallbackAlt}
        className="size-full object-contain"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </div>
  );
}
