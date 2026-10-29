"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "@/app/admin/actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} noValidate className="admin-card max-w-lg space-y-4 p-5" aria-label="Ganti kata sandi">
      {state.ok ? (
        <p role="status" className="rounded-lg border border-line bg-surface-2 p-3 text-sm font-medium">
          {state.message}
        </p>
      ) : state.message && !state.fields ? (
        <p role="alert" className="field-error">{state.message}</p>
      ) : null}
      <div>
        <label htmlFor="current_password" className="admin-label">Kata sandi saat ini</label>
        <input id="current_password" name="current_password" type="password" autoComplete="current-password" className="admin-input" aria-invalid={state.fields?.current ? true : undefined} />
        {state.fields?.current ? <p className="field-error">{state.fields.current}</p> : null}
      </div>
      <div>
        <label htmlFor="new_password" className="admin-label">Kata sandi baru</label>
        <input id="new_password" name="new_password" type="password" autoComplete="new-password" className="admin-input" aria-invalid={state.fields?.next ? true : undefined} aria-describedby="np-hint" />
        <p id="np-hint" className="mt-1 text-xs text-ink-3">Minimal 12 karakter. Jangan memakai bagian dari alamat email.</p>
        {state.fields?.next ? <p className="field-error">{state.fields.next}</p> : null}
      </div>
      <div>
        <label htmlFor="confirm_password" className="admin-label">Ulangi kata sandi baru</label>
        <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className="admin-input" aria-invalid={state.fields?.confirm ? true : undefined} />
        {state.fields?.confirm ? <p className="field-error">{state.fields.confirm}</p> : null}
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        Ganti kata sandi
      </button>
    </form>
  );
}
