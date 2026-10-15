# Logo merek

Folder ini untuk logo resmi merek laptop yang tampil di bagian "Jelajahi menurut merek" di beranda.

Logo tidak digambar atau dibuat ulang di proyek ini. Setiap logo harus berasal dari merek itu sendiri, yaitu dari halaman
press kit atau brand resources di situs resminya, dan dipakai sesuai pedoman penggunaan logonya.

## Cara menambah logo

1. Simpan berkasnya sebagai SVG dengan nama merek huruf kecil: `asus.svg`, `hp.svg`, `dell.svg`, `lenovo.svg`,
   `acer.svg`, `apple.svg`, `msi.svg`, `axioo.svg`, `advan.svg`, `infinix.svg`.
2. Tambahkan nama berkas tanpa `.svg` (misalnya `"asus"`) ke daftar di `src/lib/brand-logos.ts`.
3. Muat ulang beranda. Merek yang belum punya logo tetap tampil sebagai nama merek biasa.

Pilih versi satu warna gelap kalau tersedia, supaya kolom merek terlihat seragam di latar putih.
