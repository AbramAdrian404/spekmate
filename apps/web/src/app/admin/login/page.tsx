import { Info, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/logo";
import { safeNext } from "@/lib/admin/redirect";
import { adminIsOn, getAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Masuk" };

interface Props {
  searchParams: Promise<{ next?: string; sesi?: string; keluar?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const admin = await getAdmin();

  // Someone who is already signed in has nothing to do here.
  if (admin.status === "signed_in") redirect(next);

  const off = admin.status === "unavailable" || (admin.status === "anonymous" && !(await adminIsOn()));

  return (
    <div className="admin-page grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="size-12" />
          <div>
            <h1 className="text-2xl font-semibold">Masuk ke admin</h1>
            <p className="mt-1 text-ink-2">Khusus pengelola data SpekMate.</p>
          </div>
        </div>

        <div className="admin-card space-y-5 p-6 sm:p-7">
          {params.sesi === "habis" ? (
            <div role="status" className="callout" data-tone="info">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p>Sesi kamu sudah berakhir. Masuk lagi untuk melanjutkan.</p>
            </div>
          ) : null}
          {params.keluar ? (
            <div role="status" className="callout" data-tone="ok">
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p>Kamu sudah keluar.</p>
            </div>
          ) : null}
          {off ? (
            <div role="alert" className="callout" data-tone="warn">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p>Admin belum aktif atau layanan datanya belum terjangkau. Hubungi pengelola situs bila ini berlangsung lama.</p>
            </div>
          ) : null}

          <LoginForm next={next === "/admin" ? undefined : next} disabled={off} />
        </div>

        <p className="mt-6 text-center text-sm text-ink-3">
          <Link href="/" className="text-ink-2">
            Kembali ke situs
          </Link>
        </p>
      </div>
    </div>
  );
}
