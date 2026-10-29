import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/session";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // The pages check again on their own: a layout does not re-run when you move between pages.
  const { user } = await requireAdmin();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
