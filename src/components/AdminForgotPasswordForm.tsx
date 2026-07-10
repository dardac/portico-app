"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import { isValidEmail } from "@/lib/validators";

export function AdminForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitRequest() {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string; message?: string }>(
      "/api/admin/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email }),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(
      result.data.message ??
        "Si los datos coinciden con una cuenta registrada, recibirás un correo con instrucciones.",
    );
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitRequest();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={() => void submitRequest()}
          isRetrying={isSubmitting}
        />
      )}

      <SuccessAlert show={Boolean(successMessage)} autoDismiss={false}>
        {successMessage}
      </SuccessAlert>

      <div>
        <label htmlFor="admin-forgot-username" className="field-label">
          Usuario
        </label>
        <input
          id="admin-forgot-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={isSubmitting}
          required
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="admin-forgot-email" className="field-label">
          Correo electrónico
        </label>
        <input
          id="admin-forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
          className="field-input"
        />
        {!email || isValidEmail(email) ? null : (
          <p className="field-error">Ingresa un correo electrónico válido.</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>

      <p className="text-center text-sm text-stone-400">
        <Link
          href="/admin"
          className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-900 hover:decoration-stone-500"
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
