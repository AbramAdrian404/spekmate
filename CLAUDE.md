# Catatan untuk Claude Code

Konvensi kerja yang disepakati untuk project SpekMate ini.

## Alur perubahan kode

- Perubahan baru selalu lewat branch fitur + pull request, bukan push langsung ke `main` atau `probe`.
- Claude boleh langsung merge PR yang dibuatnya sendiri -- fitur baru maupun PR penyusul/sync -- selama test lolos dan tidak ada konflik, tanpa menunggu review manual lebih dulu.
- `probe` adalah default branch sekaligus branch deploy repo ini, **bukan** `main`. Setelah sebuah PR masuk ke `main`, masih perlu PR susulan `main` -> `probe` (tanpa perubahan baru) supaya benar-benar live. Jangan lupa langkah ini.
- Kalau sedang menumpuk PR di atas PR lain yang belum merge (base-nya bukan `main`), ingat: begitu PR dasarnya merge ke `main` lebih dulu, PR yang menumpuk itu **tidak otomatis ikut ke `main`** walau nanti di-merge juga -- perlu PR susulan terpisah untuk membawanya ke `main` (lihat riwayat PR #1/#2/#4 sebagai contoh kasusnya).
- Commit message dan deskripsi PR ditulis dalam Bahasa Indonesia, ringkas, menjelaskan "kenapa" bukan cuma "apa" -- ikuti gaya commit yang sudah ada di riwayat repo.

## Catatan sandbox

- `gh pr create` dan `gh pr list` gagal di sandbox Claude Code (GraphQL diblokir, REST API tetap jalan). Gunakan REST API langsung:
  - Buat PR: `gh api repos/{owner}/{repo}/pulls -f title=... -f head=... -f base=... -f body=...`
  - Lihat PR: `gh api "repos/{owner}/{repo}/pulls?state=all"`
  - Merge PR: `gh api -X PUT repos/{owner}/{repo}/pulls/{pull_number}/merge -f merge_method=merge`
