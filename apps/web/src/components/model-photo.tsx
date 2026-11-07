"use client";

import Image from "next/image";
import { useState } from "react";
import { isOptimisablePhoto } from "@/lib/photo-hosts";
import type { ModelImage } from "@/lib/types";

interface Props {
  image: ModelImage | null | undefined;
  fallbackAlt: string;
  className?: string;
  /** Load at once: for the one photo that is the page's main picture. */
  priority?: boolean;
  /** How wide the photo is on screen, for picking the right file size. Same syntax as the `sizes` attribute. */
  sizes?: string;
  /** Draw the photo's own plate. Off when the photo sits on a plate its parent already draws. */
  plate?: boolean;
}

/**
 * A laptop photo shown whole (never cropped, so no port or edge is cut off).
 *
 * Photos from a maker's image server go through the Next.js optimiser, which serves a file sized for the card. If
 * that fails (the maker's server refused the optimiser, say), the original file is shown instead. Renders nothing
 * when there is no photo: a missing picture is simply absent, not a grey stand-in that looks like an error.
 */
export function ModelPhoto({ image, fallbackAlt, className = "", priority = false, sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw", plate = true }: Props) {
  const [optimiserFailed, setOptimiserFailed] = useState(false);
  if (!image) return null;
  const alt = image.alt?.trim() || fallbackAlt;
  const optimise = isOptimisablePhoto(image.url) && !optimiserFailed;

  return (
    <div className={`${plate ? "photo-plate rounded-xl" : ""} relative overflow-hidden ${className}`}>
      {optimise ? (
        <Image
          src={image.url}
          alt={alt}
          fill
          sizes={sizes}
          className="photo-img object-contain"
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" as const } : {})}
          onError={() => setOptimiserFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- uploads come from this site's /api/media or a storage CDN with no fixed loader
        <img
          src={image.url}
          alt={alt}
          className="photo-img absolute inset-0 size-full object-contain"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as const } : {})}
        />
      )}
    </div>
  );
}
