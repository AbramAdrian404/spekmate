import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { PageHeading } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Pengaturan Akun" };

export default async function AccountPage() {
  const { user } = await requireAdmin("/admin/akun");
  return (
    <>
      <PageHeading title="Pengaturan akun" description={`Masuk sebagai ${user.email}. Akun admin dibuat lewat server, bukan dari halaman ini.`} />
      <PasswordForm />
    </>
  );
}
