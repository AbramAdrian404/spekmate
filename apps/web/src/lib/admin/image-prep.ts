/**
 * Gets a photo ready in the browser before upload. The server still checks the real bytes; this only saves a trip
 * for obvious problems and shrinks big camera photos so they fit the size limit.
 */
export const MAX_UPLOAD_BYTES = 4_000_000;
export const MIN_SIDE = 200;
const LONG_SIDE = 2000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export type Prepared = { ok: true; file: File; shrunk: boolean } | { ok: false; message: string };

/** The longest side after fitting inside `limit`, keeping the shape. */
export function fitWithin(width: number, height: number, limit: number): { width: number; height: number } {
  const scale = Math.min(1, limit / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function checkBasics(file: { type: string; size: number; name: string }): string | null {
  if (file.size === 0) return "Berkasnya kosong.";
  if (file.type && !TYPES.includes(file.type)) return "Format tidak didukung. Gunakan gambar JPG, PNG, atau WebP.";
  if (!file.type && !/\.(jpe?g|png|webp)$/i.test(file.name)) return "Format tidak didukung. Gunakan gambar JPG, PNG, atau WebP.";
  return null;
}

export async function prepareImage(file: File): Promise<Prepared> {
  const problem = checkBasics(file);
  if (problem) return { ok: false, message: problem };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, message: "Gambar tidak bisa dibaca. Coba ekspor ulang dari aplikasi lain." };
  }
  try {
    if (bitmap.width < MIN_SIDE || bitmap.height < MIN_SIDE) {
      return { ok: false, message: `Gambar terlalu kecil (${bitmap.width}x${bitmap.height}). Minimal ${MIN_SIDE}x${MIN_SIDE} piksel.` };
    }
    const fits = Math.max(bitmap.width, bitmap.height) <= LONG_SIDE;
    if (fits && file.size <= MAX_UPLOAD_BYTES) return { ok: true, file, shrunk: false };

    const { width, height } = fitWithin(bitmap.width, bitmap.height, LONG_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { ok: false, message: "Gambar terlalu besar dan tidak bisa dikecilkan di browser ini. Kecilkan dulu lalu unggah lagi." };
    context.drawImage(bitmap, 0, 0, width, height);
    for (const quality of [0.86, 0.72, 0.58]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.type === "image/webp" && blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
        return { ok: true, file: new File([blob], name, { type: "image/webp" }), shrunk: true };
      }
    }
    return { ok: false, message: "Gambar masih terlalu besar setelah dikecilkan (maksimal 4 MB). Pakai gambar yang lebih sederhana." };
  } finally {
    bitmap.close();
  }
}
