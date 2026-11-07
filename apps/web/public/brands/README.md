# Logo merek

Folder ini berisi logo resmi merek laptop untuk bagian "Jelajahi menurut merek" di beranda.

Logo tidak digambar atau dibuat ulang di proyek ini. Setiap berkas adalah karya resmi merek itu seperti yang
dipublikasikan di Wikimedia Commons. Sebagai karya, logo-logo ini berstatus domain publik di sana, tetapi tetap merek
dagang pemiliknya. Logo di sini hanya dipakai untuk menunjuk merek yang modelnya ada di database.

| Berkas | Sumber |
| --- | --- |
| `acer.svg` | https://commons.wikimedia.org/wiki/File:Acer_2011.svg |
| `apple.svg` | https://commons.wikimedia.org/wiki/File:Apple_logo_black.svg |
| `asus.svg` | https://commons.wikimedia.org/wiki/File:Asus_blue_logo.svg (metadata editor dihapus, garis bentuk tidak diubah) |
| `dell.svg` | https://commons.wikimedia.org/wiki/File:Dell_logo_2016.svg |
| `hp.svg` | https://commons.wikimedia.org/wiki/File:HP_logo_2025.svg |
| `infinix.svg` | https://commons.wikimedia.org/wiki/File:Infinix_logo.svg |
| `lenovo.svg` | https://commons.wikimedia.org/wiki/File:Lenovo_logo_2015.svg |
| `msi.svg` | https://commons.wikimedia.org/wiki/File:Micro-Star_International_logo2020.svg |

Axioo dan Advan belum punya logo di sini: situs resminya hanya menyediakan logo beresolusi rendah (Axioo, 149×34 piksel)
atau tidak menampilkannya sebagai berkas terpisah (Advan). Keduanya tampil sebagai nama merek sampai berkas resmi
beresolusi tinggi tersedia.

## Cara menambah logo

1. Simpan berkasnya sebagai SVG dengan nama merek huruf kecil, misalnya `axioo.svg`.
2. Tambahkan nama berkas tanpa `.svg` ke `BRAND_LOGOS` di `src/lib/brand-logos.ts`, dan warna identitasnya ke
   `BRAND_COLORS` kalau ada.
3. Catat sumbernya di tabel di atas.
