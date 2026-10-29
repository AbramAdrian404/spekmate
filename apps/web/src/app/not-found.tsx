import { SearchX } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="container-page py-20">
        <div className="mx-auto max-w-xl space-y-5 text-center">
          <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <SearchX className="size-7" />
          </span>
          <h1 className="text-3xl font-semibold">Halaman ini tidak ditemukan</h1>
          <p className="text-ink-2">Alamatnya mungkin salah ketik, atau laptop yang kamu cari belum ada di database kami.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/laptop" className="btn btn-primary">
              Lihat semua laptop
            </Link>
            <Link href="/konsultasi" className="btn btn-secondary">
              Temukan laptop
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
