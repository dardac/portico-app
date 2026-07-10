"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validators";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReset() {
    setFormError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string; message?: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      },
    );

    if (!result.ok) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(
      result.data.message ?? "Contraseña actualizada. Ya puedes iniciar sesión.",
    );
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);

    if (!token) {
      setFormError("El enlace no es válido. Solicita uno nuevo.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      setFormError(
        `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    await submitReset();
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          El enlace no es válido o falta el token. Solicita uno nuevo desde la
          pantalla de inicio de sesión.
        </p>
        <p className="text-center text-sm text-stone-400">
          <Link
            href="/olvide-contrasena"
            className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-900 hover:decoration-stone-500"
          >
            Solicitar nuevo enlace
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && (
        <RetryErrorAlert
          message={formError}
          onRetry={() => void submitReset()}
          isRetrying={isSubmitting}
        />
      )}

      <SuccessAlert show={Boolean(successMessage)} autoDismiss={false}>
        {successMessage}
      </SuccessAlert>

      <div>
        <label htmlFor="new-password" className="field-label">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            required
            className="field-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-stone-400 transition hover:text-stone-700 disabled:opacity-60"
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm-password" className="field-label">
          Confirmar contraseña
        </label>
        <input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isSubmitting}
          required
          className="field-input"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || Boolean(successMessage)}
        className="btn-primary"
      >
        {isSubmitting ? "Guardando…" : "Restablecer contraseña"}
      </button>

      {successMessage && (
        <p className="text-center text-sm text-stone-400">
          <Link
            href="/"
            className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-900 hover:decoration-stone-500"
          >
            Ir al inicio de sesión
          </Link>
        </p>
      )}
    </form>
  );
}
