"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApartmentField } from "@/components/ApartmentField";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import { formatApartmentInput, isValidApartment, isValidEmail } from "@/lib/validators";

type FormErrors = {
  apartment?: string;
  email?: string;
};

export function ForgotPasswordForm() {
  const [apartment, setApartment] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleApartmentChange(value: string) {
    setApartment(formatApartmentInput(value));
    if (errors.apartment) {
      setErrors((prev) => ({ ...prev, apartment: undefined }));
    }
  }

  async function submitRequest() {
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string; message?: string }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apartment, email }),
      },
    );

    if (!result.ok) {
      setFormError(result.error);
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

    const nextErrors: FormErrors = {};

    if (!apartment.trim()) {
      nextErrors.apartment = "Ingresa el número de apartamento.";
    } else if (!isValidApartment(apartment)) {
      nextErrors.apartment = "Usa un formato válido (ej. 11-D).";
    }

    if (!email.trim()) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await submitRequest();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && (
        <RetryErrorAlert
          message={formError}
          onRetry={() => void submitRequest()}
          isRetrying={isSubmitting}
        />
      )}

      <SuccessAlert show={Boolean(successMessage)} autoDismiss={false}>
        {successMessage}
      </SuccessAlert>

      <ApartmentField
        id="forgot-apartment"
        value={apartment}
        onChange={handleApartmentChange}
        error={errors.apartment}
        disabled={isSubmitting}
      />

      <div>
        <label htmlFor="forgot-email" className="field-label">
          Correo electrónico
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          className="field-input"
        />
        {errors.email && (
          <p id="forgot-email-error" className="field-error">
            {errors.email}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>

      <p className="text-center text-sm text-stone-400">
        <Link
          href="/"
          className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-900 hover:decoration-stone-500"
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
