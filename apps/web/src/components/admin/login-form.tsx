"use client";

import { Eye, EyeOff, Loader2, LogIn, TriangleAlert } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The sign-in form. Checks the obvious mistakes in the browser for speed, but the Server Action checks them again
 * and the API decides whether the credentials are right. Nothing about the account is stored in the page.
 */
export function LoginForm({ next, disabled = false }: { next?: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({});
  const [show, setShow] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  const errors = { ...state.fields, ...clientErrors };

  function validate(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const found: { email?: string; password?: string } = {};
    if (!email) found.email = "Email wajib diisi.";
    else if (!EMAIL.test(email)) found.email = "Tulis alamat email yang benar.";
    if (!password) found.password = "Kata sandi wajib diisi.";
    setClientErrors(found);
    if (found.email || found.password) {
      event.preventDefault();
      const first = found.email ? emailId : passwordId;
      document.getElementById(first)?.focus();
    }
  }

  return (
    <form action={formAction} onSubmit={validate} noValidate className="space-y-5" aria-busy={pending}>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.message ? (
        <div role="alert" className="callout" data-tone="bad">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>{state.message}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor={emailId} className="admin-label">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.email ?? ""}
          disabled={disabled || pending}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          className="admin-input"
        />
        {errors.email ? (
          <p id={`${emailId}-error`} className="field-error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={passwordId} className="admin-label">
          Kata sandi
        </label>
        <div className="relative">
          <input
            id={passwordId}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            disabled={disabled || pending}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            className="admin-input pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-pressed={show}
            aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            disabled={disabled || pending}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-3 hover:text-ink"
          >
            {show ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
          </button>
        </div>
        {errors.password ? (
          <p id={`${passwordId}-error`} className="field-error">
            {errors.password}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={disabled || pending} className="btn btn-primary w-full">
        {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <LogIn aria-hidden="true" className="size-4" />}
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
