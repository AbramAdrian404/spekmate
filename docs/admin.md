# Dashboard admin SpekMate

Panel untuk mengelola data laptop tanpa menyentuh kode atau spreadsheet. Alamatnya `/admin` di situs web. Perubahan
yang disimpan langsung terlihat di situs publik.

## Cara kerjanya

```
Browser ──► Next.js (apps/web)  ──server-side──►  FastAPI (apps/api)  ──►  Database (Postgres / SQLite)
  │           /admin/* (Server Components             /api/admin/*              + Vercel Blob / folder lokal
  │            dan Server Actions)                    (satu-satunya yang                untuk foto
  └─ cookie HttpOnly                                   memutuskan)
```

- Browser **tidak pernah** memanggil `/api/admin` dan tidak pernah memegang token yang bisa dibaca JavaScript.
  Token sesi ada di cookie `spekmate_admin` (HttpOnly, SameSite=Strict, Secure di produksi, path `/admin`).
- `proxy.ts` hanya mengalihkan pengunjung tanpa cookie ke halaman login (kemudahan, bukan keamanan). Pemeriksaan
  sungguhan ada di API: setiap permintaan `/api/admin/*` memeriksa token, akun aktif, dan peran admin.
- Semua tulis (tambah, ubah, arsip, hapus, unggah) lewat Server Action, yang memeriksa sesi lagi sebelum
  meneruskannya ke API. Next.js memeriksa Origin setiap Server Action.

## Menyiapkan

1. **Database.** Set `DATABASE_URL` di project API (Postgres di produksi, misalnya Neon atau Supabase). Tanpa itu, API
   berjalan read-only dari JSON bawaan dan menu admin menjawab 503. Lokal tanpa pengaturan apa pun, API membuat SQLite
   sendiri.
2. **Isi database dari data yang ada** (sekali, aman diulang):
   ```bash
   cd apps/api
   python scripts/import_data.py --dry-run          # lihat dulu apa yang akan terjadi, tidak menyimpan apa pun
   python scripts/import_data.py                    # dari JSON bawaan
   python scripts/import_data.py --from-xlsx ../../data/source/data-laptop.xlsx   # langsung dari Excel
   ```
3. **Buat akun admin.** Tidak ada akun bawaan dan tidak ada cara membuatnya lewat situs:
   ```bash
   python scripts/create_admin.py --email kamu@contoh.com        # kata sandi ditanya dua kali, tidak tampil
   python scripts/create_admin.py --email kamu@contoh.com --reset-password   # juga mengakhiri semua sesi lama
   ```
   Kata sandi minimal 12 karakter, dan tidak boleh memuat bagian dari alamat email.
4. **Foto.** Produksi: buat store *Blob* publik di Vercel dan sambungkan ke project API (Vercel mengisi
   `BLOB_READ_WRITE_TOKEN` sendiri). Lokal: foto disimpan di `apps/api/.data/uploads`.
5. Semua variabel ada di `apps/api/.env.example` dan `apps/web/.env.example`. Web hanya butuh `API_URL`; tidak ada
   rahasia di sisi web.

## Prosedur masuk (login)

1. Buka `/admin`. Tanpa sesi, kamu dialihkan ke `/admin/login?next=...`.
2. Isi email dan kata sandi (ada tombol tampil/sembunyikan). Isian divalidasi di browser dan lagi di server.
3. Server meneruskan ke API. Salah kata sandi, email tak dikenal, dan akun nonaktif semua mendapat **jawaban yang
   sama**, supaya tidak bisa dipakai menebak email.
4. Lima kali gagal berturut-turut mengunci akun 15 menit (juga untuk kata sandi yang benar).
5. Berhasil: API membuat token acak; yang disimpan di database hanya hash SHA-256-nya, jadi salinan database tidak
   bisa dipakai masuk. Token ditaruh di cookie HttpOnly. Sesi paling lama 12 jam (bisa diatur 1 sampai 168).
6. **Keluar** mengakhiri sesi di API, bukan hanya menghapus cookie. Mengganti kata sandi mengakhiri sesi lain.

## Struktur halaman

| Menu | Alamat | Isi |
|---|---|---|
| Dashboard | `/admin` | Angka ringkas (total, aktif, draf, data belum lengkap, tanpa gambar), laptop terbaru diubah, yang perlu perhatian, kesegaran harga |
| Kelola Laptop | `/admin/laptop` | Tabel dengan cari, saring (merek, status, prosesor, RAM, harga, kelengkapan, gambar), urut, paginasi, aksi ubah/arsip/kembalikan/hapus |
| Tambah Laptop | `/admin/tambah` | Form lima bagian (di bawah) |
| Ubah laptop | `/admin/laptop/[id]` | Form yang sama untuk laptop yang ada |
| Kelola Gambar | `/admin/gambar`, `/admin/gambar/[id]` | Unggah, gambar utama, teks alternatif, hapus |
| Prosesor dan GPU | `/admin/chip` | Daftar acuan prosesor dan GPU beserta tingkatnya |
| Pengaturan Akun | `/admin/akun` | Ganti kata sandi |
| Keluar | tombol di menu | Mengakhiri sesi |

Form laptop punya lima bagian: **Informasi produk**, **Gambar produk**, **Harga dan ketersediaan**, **Spesifikasi
teknis** (data wajib untuk penilaian dipisah dari data tambahan), dan **Informasi rekomendasi**. Laptop baru dimulai
sebagai **Draf** (tidak terlihat pengunjung). **Arsipkan** menyembunyikan laptop tanpa menghapus datanya;
**hapus permanen** hanya untuk yang sudah diarsipkan dan meminta mengetik `HAPUS`. Dua orang yang mengubah laptop
yang sama tidak saling menimpa: yang kedua mendapat pesan "data sudah berubah".

## Skema database

| Tabel | Isi |
|---|---|
| `models` | Laptop (id slug, merek, seri, tahun, ringkasan, bodi dan port, `watch_out`, `common_issues`, `status`: published/draft/archived) |
| `variants` | Konfigurasi per laptop (prosesor, GPU, RAM, penyimpanan, layar, baterai, garansi, upgrade, `editor_note`) |
| `prices` | Catatan harga bertanggal per konfigurasi (kondisi, terendah/umum/tertinggi, sumber, tanggal cek) |
| `cpus`, `gpus` | Tabel acuan beserta tingkat yang dipakai mesin penilai |
| `images` | Foto per laptop (alamat, kunci penyimpanan, tipe, ukuran, alt, gambar utama, urutan). Berkas foto tidak disimpan di database |
| `admin_users` | Akun admin (email unik, hash kata sandi scrypt, peran, penghitung gagal, waktu kunci) |
| `admin_sessions` | Sesi (hanya hash token, kedaluwarsa, dicabut) |
| `app_state` | Penanda versi data dan skema; dipakai API untuk memuat ulang katalog setelah perubahan |

Aturan penilaian dan ambang batas tetap berada di JSON (`apps/api/laptop_advisor/data`), bukan di database.

## Migrasi dari Excel

Hasil menjalankan `import_data.py` pada database kosong, dari `data/source/data-laptop.xlsx` dan dari JSON (sama):

| Tabel | Baru | Dilewati | Perlu dicek | Gagal |
|---|---|---|---|---|
| cpus | 35 | 0 | 0 | 0 |
| gpus | 28 | 0 | 0 | 0 |
| models | 40 | 0 | 0 | 0 |
| variants | 52 | 0 | 0 | 0 |
| prices | 153 | 0 | 0 | 0 |

Dijalankan lagi: semuanya **dilewati** (idempoten, tidak ada duplikat dan tidak ada yang ditimpa). Sifat impor: tidak
mengubah atau menghapus data yang sudah ada (kecuali `--update-existing`, yang meminta konfirmasi), tidak mengarang
nilai (kosong tetap kosong), dan seluruhnya satu transaksi: selesai penuh atau tidak sama sekali. Baris yang nilainya
di luar aturan tetap disimpan dan dicantumkan di bagian "perlu dicek".

## Keamanan

- Semua operasi tulis dan baca admin memeriksa token, akun aktif, dan peran admin **di API**.
- Kata sandi: scrypt dengan garam acak. Token sesi: acak, hanya hash-nya yang disimpan, hanya lewat header
  `Authorization`.
- Unggahan diperiksa dari **byte-nya**, bukan nama atau header: hanya JPEG, PNG, WebP; SVG ditolak (bisa membawa
  skrip); maksimal 4 MB; 200x200 sampai 8000x8000 piksel; berkas terpotong ditolak; nama berkas dibuat server.
- Tidak ada rahasia di kode web. `.env` tidak ada di repositori; hanya `.env.example`.
- Header: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, halaman admin
  `no-store`.

## Batasan yang perlu diketahui

- Foto di Vercel Blob baru diuji dengan tiruan (mock), belum dengan store Blob sungguhan.
- Skema dibuat dengan `create_all` dan penanda versi, belum dengan Alembic. Perubahan skema ke depan perlu langkah
  migrasi sendiri.
- Penguncian akun bisa dipakai orang lain untuk menghalangi login admin yang emailnya ia tahu (15 menit tiap kali).
- Rute `/api/admin/*` tetap terjangkau lewat rewrite `/api/*` di domain web dan lewat domain API. Keduanya menolak
  permintaan tanpa token yang sah (diuji), tetapi alamatnya tidak disembunyikan.
- Akun hanya dibuat lewat CLI di mesin tepercaya; belum ada manajemen banyak admin dari panel.
