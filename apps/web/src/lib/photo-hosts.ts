/**
 * Where product photos may come from. Each entry is a maker's own image server, used for the photos listed in the
 * API's photos.json (every one with its source page). Only these go through the Next.js image optimiser, which
 * resizes them to the size a card actually shows; any other address (an admin upload, say) is shown as it is.
 */
export const PHOTO_HOSTS: ReadonlyArray<{ hostname: string; pathname: string }> = [
  { hostname: "dlcdnwebimgs.asus.com", pathname: "/gain/**" },
  { hostname: "psrefstuff.lenovo.com", pathname: "/syspool/**" },
  { hostname: "id-media.apjonlinecdn.com", pathname: "/catalog/**" },
  { hostname: "images.acer.com", pathname: "/is/image/**" },
  { hostname: "i.dell.com", pathname: "/is/image/**" },
  { hostname: "www.apple.com", pathname: "/v/**" },
  { hostname: "cdsassets.apple.com", pathname: "/live/**" },
  { hostname: "storage-asset.msi.com", pathname: "/global/picture/**" },
  { hostname: "global.pro.infinixmobility.com", pathname: "/media/**" },
  { hostname: "axiooworld.com", pathname: "/uploads/**" },
];

function matches(pattern: string, pathname: string): boolean {
  return pattern.endsWith("/**") ? pathname.startsWith(pattern.slice(0, -2)) : pathname === pattern;
}

/** True when the photo comes from one of the hosts above over https, so the optimiser may resize it. */
export function isOptimisablePhoto(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false; // a relative address such as /api/media/...
  }
  return parsed.protocol === "https:" && PHOTO_HOSTS.some((host) => host.hostname === parsed.hostname && matches(host.pathname, parsed.pathname));
}
