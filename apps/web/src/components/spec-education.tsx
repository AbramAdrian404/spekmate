import { AppWindow, ChevronDown, Cpu, HardDrive, Info, MemoryStick, Microchip, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ComparisonScale } from "./comparison-scale";
import type { NeedTone } from "@/lib/need-visuals";

/**
 * "Belum paham istilahnya?" -- plain-language explanations of the specs the consultation asks
 * about and the ones recommendation cards show, so a non-technical visitor does not have to trust
 * the recommendation blindly. Self-contained (no props): this is general market knowledge, not
 * data from our own small catalog, so it is written to stay true regardless of which laptops are
 * in the database today. Collapsed by default and opened one at a time, so the page stays short
 * for a visitor who only needs one answer.
 */
export function SpecEducation() {
  return (
    <section aria-labelledby="edukasi-judul" className="reveal card space-y-5 p-5 sm:p-7">
      <div className="space-y-1.5">
        <h2 id="edukasi-judul" className="text-xl font-extrabold sm:text-2xl">
          Belum paham istilahnya?
        </h2>
        <p className="measure text-ink-2">
          RAM, SSD, &ldquo;Core i5&rdquo;, &ldquo;Ryzen 5&rdquo; -- istilah di spesifikasi laptop gampang bikin bingung. Buka salah
          satu di bawah ini untuk penjelasan singkatnya, tanpa jargon.
        </p>
      </div>

      <div className="space-y-3">
        <Topic id="ram" tone="blue" Icon={MemoryStick} title="RAM" teaser="Kenapa laptop bisa lemot kalau buka banyak aplikasi">
          <p>
            RAM menyimpan data dari aplikasi yang sedang <strong className="text-ink">aktif kamu pakai</strong>, supaya prosesor
            bisa mengambilnya dengan cepat. Semakin banyak aplikasi dan tab yang terbuka bersamaan, semakin banyak RAM yang
            dipakai. Kalau RAM-nya penuh, laptop mulai terasa tersendat setiap pindah aplikasi.
          </p>
          <ComparisonScale
            tone="blue"
            steps={[
              { label: "8 GB", fill: 25, note: "1 aplikasi utama + beberapa tab. Mengetik tugas, browsing, nonton video kuliah." },
              { label: "16 GB", fill: 55, note: "Banyak tab + aplikasi office + chat/meeting bersamaan. Juga cukup untuk desain ringan." },
              { label: "32 GB", fill: 100, note: "Banyak aplikasi besar sekaligus: edit video, beberapa virtual machine/container, IDE berat." },
            ]}
          />
          <Caveat>
            Angka di atas cuma gambaran kasar. Kebutuhan RAM yang sebenarnya tergantung aplikasi apa saja yang kamu jalankan
            bersamaan, bukan cuma satu angka yang cocok untuk semua orang.
          </Caveat>
        </Topic>

        <Topic id="storage" tone="violet" Icon={HardDrive} title="Penyimpanan (storage)" teaser="SSD, HDD, dan beda 256 GB / 512 GB / 1 TB">
          <p>
            Kalau RAM itu seperti <strong className="text-ink">meja kerja</strong> -- tempat naruh yang lagi dipakai, cepat
            diambil, tapi “dibersihkan” tiap laptop mati -- penyimpanan itu seperti <strong className="text-ink">lemari arsip</strong>:
            menyimpan semua file, aplikasi, dan sistem operasi secara permanen, walau laptopnya mati sekalipun.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCompare title="SSD" tone="violet" points={["Jauh lebih cepat: laptop nyala dan buka aplikasi hitungan detik", "Tidak ada bagian berputar, lebih tahan guncangan", "Harga per GB lebih mahal -- tapi sudah jadi standar laptop baru"]} />
            <MiniCompare title="HDD" tone="violet" points={["Jauh lebih lambat dari SSD", "Ada piringan berputar, lebih rentan kalau terguncang", "Harga per GB jauh lebih murah, kini jarang dipakai sebagai drive utama"]} />
          </div>
          <ComparisonScale
            tone="violet"
            steps={[
              { label: "256 GB", fill: 25, note: "Sistem + aplikasi dasar + dokumen. Cepat penuh kalau sering simpan video atau game." },
              { label: "512 GB", fill: 50, note: "Pilihan paling umum: aplikasi + beberapa game/software desain + file pribadi." },
              { label: "1 TB", fill: 100, note: "Banyak file besar tersimpan lokal: game AAA, footage video, aset desain." },
            ]}
          />
          <Caveat>
            Kalau bawaannya lebih kecil tapi bisa diganti, kami tetap tampilkan dengan catatan -- kebutuhan storage yang pas
            tergantung ukuran file/aplikasi/game yang kamu pakai dan kebiasaanmu menyimpan (lokal atau cloud).
          </Caveat>
        </Topic>

        <Topic id="os" tone="mint" Icon={AppWindow} title="Sistem operasi: Windows" teaser="Beda Windows 11 Home dan Pro -- dan kenapa bukan soal performa">
          <p>
            Sistem operasi adalah penghubung antara hardware laptop dan aplikasi yang kamu pakai -- dia yang mengatur file,
            koneksi internet, tampilan, dan menjalankan semua software. Windows adalah sistem operasi paling umum dipakai di
            laptop non-Apple.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCompare
              title="Windows 11 Home"
              tone="mint"
              points={["Mencakup hampir semua kebutuhan harian: browsing, office, hiburan", "Cocok untuk pemakaian pribadi, kuliah, kerja lepas"]}
            />
            <MiniCompare
              title="Windows 11 Pro"
              tone="mint"
              points={["Menambah BitLocker (enkripsi penuh) dan Remote Desktop", "Bisa bergabung ke domain/jaringan kantor (Active Directory/Azure AD)", "Penting kalau laptop dikelola tim IT perusahaan"]}
            />
          </div>
          <Caveat tone="warn">
            Edisi Windows <strong className="text-ink">tidak menentukan performa</strong> laptop. Home dan Pro bisa dipasang di
            hardware yang persis sama dan akan terasa sama cepatnya -- performa ditentukan oleh prosesor, RAM, dan
            penyimpanan, bukan edisi sistem operasinya.
          </Caveat>
        </Topic>

        <Topic id="intel" tone="amber" Icon={Cpu} title="Intel Core dan Core Ultra" teaser="i3, i5, i7, i9, dan apa bedanya dengan Core Ultra">
          <ComparisonScale
            tone="amber"
            steps={[
              { label: "Core i3", fill: 25, note: "Tugas ringan: dokumen, browsing, video call, kuliah online dasar." },
              { label: "Core i5", fill: 55, note: "Paling umum dipakai: multitasking harian, kerja kantor, kuliah dengan banyak aplikasi." },
              { label: "Core i7", fill: 80, note: "Beban lebih berat: edit foto/video, file besar, aplikasi profesional tertentu." },
              { label: "Core i9", fill: 100, note: "Beban berat yang konsisten, di laptop yang memang dirancang untuk performa tinggi." },
            ]}
          />
          <p>
            <strong className="text-ink">Core Ultra</strong> adalah keluarga prosesor Intel yang lebih baru, hadir dalam varian
            Ultra 5/7/9 yang levelnya kurang lebih sejalan dengan i5/i7/i9. Core Ultra menggabungkan performa CPU, grafis
            terintegrasi yang lebih kuat, efisiensi daya, dan pada sebagian model dilengkapi NPU -- chip khusus yang
            mempercepat tugas AI tertentu, seperti pengolahan gambar/video otomatis di beberapa aplikasi.
          </p>
          <Caveat tone="warn">
            Core Ultra <strong className="text-ink">tidak otomatis berarti &ldquo;lebih cepat&rdquo;</strong> dibanding Core i.
            Performa sebenarnya tergantung generasi, model spesifiknya, batas daya yang diizinkan laptopnya, sistem
            pendinginan, dan konfigurasi laptop itu sendiri. Dua laptop sama-sama berlabel &ldquo;Core Ultra 7&rdquo; belum
            tentu performanya sama -- jangan anggap semua chip Core Ultra punya spesifikasi yang seragam.
          </Caveat>
        </Topic>

        <Topic id="amd" tone="coral" Icon={Microchip} title="AMD Ryzen" teaser="Ryzen 3-9, arti U/HS/HX, dan Intel vs AMD">
          <ComparisonScale
            tone="coral"
            steps={[
              { label: "Ryzen 3", fill: 25, note: "Setara i3: tugas ringan, dokumen, browsing." },
              { label: "Ryzen 5", fill: 55, note: "Setara i5: paling umum, multitasking harian." },
              { label: "Ryzen 7", fill: 80, note: "Setara i7: beban kerja lebih berat." },
              { label: "Ryzen 9", fill: 100, note: "Setara i9: performa tinggi." },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniCompare title="Akhiran U" tone="coral" points={["Fokus efisiensi daya, baterai tahan lama", "Laptop tipis dan ringan"]} />
            <MiniCompare title="Akhiran HS" tone="coral" points={["Keseimbangan performa dan efisiensi", "Tetap ringkas tapi lebih bertenaga dari seri U"]} />
            <MiniCompare title="Akhiran HX" tone="coral" points={["Performa maksimal, daya lebih besar", "Laptop gaming/workstation dengan pendinginan lebih besar"]} />
          </div>
          <p>
            Generasi dan model spesifik sangat menentukan performa -- &ldquo;Ryzen 5&rdquo; generasi lama bisa jauh lebih lemah
            dari &ldquo;Ryzen 5&rdquo; generasi baru. Bandingkan model lengkapnya (misalnya Ryzen 5 7430U dengan Ryzen 5
            5500U), bukan cuma angka &ldquo;5&rdquo;-nya. Begitu juga membandingkan Intel dengan AMD: yang berarti adalah
            model spesifik lawan model spesifik (misalnya Core i5-1335U dengan Ryzen 5 7430U) -- kadang Intel unggul di satu
            generasi, kadang AMD unggul di generasi lain.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <ExampleUser name="Mahasiswa, cuma kerja dokumen" need="i3/Ryzen 3 atau i5/Ryzen 5 seri U sudah lebih dari cukup." />
            <ExampleUser name="Mahasiswa desain" need="i5/Ryzen 5 ke atas -- prioritaskan RAM dan grafis, bukan cuma “naik kelas” prosesor." />
            <ExampleUser name="Gamer" need="Seri HS/HX atau i7/i9 dengan GPU terpisah jauh lebih menentukan dibanding nama prosesornya." />
            <ExampleUser name="Sering buka banyak aplikasi sekaligus" need="Prioritaskan RAM besar + minimal i5/Ryzen 5 -- multitasking lebih bergantung pada RAM." />
          </div>
          <Caveat>
            Intel dan AMD sama-sama punya generasi yang kuat dan yang biasa saja. Tidak ada merek yang selalu unggul secara
            mutlak -- semua tergantung generasi, model, dan kebutuhanmu.
          </Caveat>
        </Topic>
      </div>

      <p className="text-sm text-ink-3">
        Supaya kamu tidak perlu menghafal semua nama di atas, SpekMate juga punya sistem tingkat 1-5 sendiri untuk prosesor dan
        grafis, dihitung dari data yang sama untuk semua laptop di database kami.{" "}
        <a href="/cara-menilai#tingkat">Lihat cara kami menilai</a>.
      </p>
    </section>
  );
}

function Topic({
  id,
  tone,
  Icon,
  title,
  teaser,
  children,
}: {
  id: string;
  tone: NeedTone;
  Icon: LucideIcon;
  title: string;
  teaser: string;
  children: ReactNode;
}) {
  return (
    <details id={`edukasi-${id}`} className="group scroll-mt-24 rounded-xl border border-line bg-surface">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-surface-2">
        <span className={`tone-${tone} tone-chip flex size-10 shrink-0 items-center justify-center rounded-full`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">{title}</span>
          <span className="block truncate text-sm text-ink-2">{teaser}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="measure space-y-4 border-t border-line px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

function MiniCompare({ title, tone, points }: { title: string; tone: NeedTone; points: string[] }) {
  return (
    <div className={`tone-${tone} rounded-xl border border-line bg-surface p-4`}>
      <p className="font-bold text-ink">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: "var(--tone)" }} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExampleUser({ name, need }: { name: string; need: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3.5">
      <p className="text-sm font-semibold text-ink">{name}</p>
      <p className="mt-0.5 text-sm text-ink-2">{need}</p>
    </div>
  );
}

function Caveat({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const Icon = tone === "warn" ? TriangleAlert : Info;
  return (
    <p className="callout text-sm" data-tone={tone}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
