import type { CSSProperties } from "react";

/**
 * "Cara kerjanya": three steps that are a true sequence, so they are numbered. Plain tiles, no pictures: the numbers
 * and the words carry it.
 */
const STEPS = [
  {
    title: "Pilih kebutuhan",
    text: "Kuliah dan kantor, desain, pemrograman, atau game. Lebih dari satu kebutuhan boleh dipilih, dan batas minimal tiap kebutuhan dapat dibaca di halaman Cara menilai.",
  },
  {
    title: "Isi anggaran",
    text: "Tulis angkanya saja, misalnya 8.000.000. Syarat penyimpanan serta pilihan baru atau bekas dapat ditambahkan bila perlu.",
  },
  {
    title: "Baca alasannya",
    text: "Setiap rekomendasi menjelaskan apa yang sudah nyaman, apa yang pas-pasan, dan apa yang perlu diketahui sebelum membeli.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="cara-kerja" aria-labelledby="cara-kerja-judul" className="bg-surface-2 py-20 sm:py-28">
      <div className="container-page">
        <h2 id="cara-kerja-judul" className="reveal section-title">
          Cara kerjanya.
        </h2>
        <p className="reveal section-lead" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
          Tiga langkah, tanpa mendaftar akun.
        </p>

        <ol className="mt-12 grid gap-4 lg:grid-cols-3">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className="reveal rounded-3xl bg-surface p-8 sm:p-10" style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}>
              <span aria-hidden="true" className="text-5xl font-semibold leading-none text-accent tabular">
                {index + 1}
              </span>
              <h3 className="mt-8 text-2xl">{title}</h3>
              <p className="mt-3 text-lg text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
