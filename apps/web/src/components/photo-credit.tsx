import type { ModelImage } from "@/lib/types";

/** "Foto: Situs resmi ASUS", linked to the page the photo was found on. Nothing when the source was not recorded. */
export function PhotoCredit({ image, className = "" }: { image: ModelImage | null | undefined; className?: string }) {
  const name = image?.source_name?.trim();
  if (!name) return null;
  const url = image?.source_url?.trim();
  return (
    <p className={`text-xs text-ink-3 ${className}`}>
      Foto:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-ink-2 underline-offset-2 hover:underline">
          {name}
        </a>
      ) : (
        name
      )}
    </p>
  );
}
