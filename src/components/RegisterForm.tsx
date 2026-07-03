"use client";

import { FormEvent, useState } from "react";
import { ApartmentField } from "@/components/ApartmentField";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import {
  formatApartmentInput,
  isValidApartment,
  isValidEmail,
  isValidPhone,
} from "@/lib/validators";

type Step = "apartment" | "details";

type FormErrors = {
  apartment?: string;
  email?: string;
  phone?: string;
  password?: string;
};

type RegisterFormProps = {
  onSuccess?: () => void;
};

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [step, setStep] = useState<Step>("apartment");
  const [apartment, setApartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function handleApartmentChange(value: string) {
    setApartment(formatApartmentInput(value));
    setIsSuccess(false);
    if (errors.apartment) {
      setErrors((prev) => ({ ...prev, apartment: undefined }));
    }
  }

  function resetToApartmentStep() {
    setStep("apartment");
    setEmail("");
    setPhone("");
    setPassword("");
    setErrors({});
    setFormError(null);
    setIsSuccess(false);
  }

  async function checkApartment() {
    setFormError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string }>(
      "/api/auth/check-apartment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apartment }),
      },
    );

    if (!result.ok) {
      if (result.status && result.status < 500) {
        setErrors({ apartment: result.error });
      } else {
        setFormError(result.error);
      }
      setIsSubmitting(false);
      return;
    }

    setStep("details");
    setIsSubmitting(false);
  }

  async function registerAccount() {
    setFormError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string }>("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apartment, email, phone, password }),
    });

    if (!result.ok) {
      setFormError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    onSuccess?.();
    setIsSubmitting(false);
  }

  async function handleCheckApartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuccess(false);
    setFormError(null);

    const nextErrors: FormErrors = {};

    if (!apartment.trim()) {
      nextErrors.apartment = "Ingresa el número de apartamento.";
    } else if (!isValidApartment(apartment)) {
      nextErrors.apartment =
        "Usa el formato piso+unidad-letra (ej. 11-D), NT/PH + número + letra (ej. NT1-D).";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await checkApartment();
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuccess(false);
    setFormError(null);

    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!phone.trim()) {
      nextErrors.phone = "Ingresa tu número de teléfono.";
    } else if (!isValidPhone(phone)) {
      nextErrors.phone = "Ingresa un teléfono válido (mínimo 10 dígitos).";
    }

    if (!password) {
      nextErrors.password = "Ingresa una contraseña.";
    } else if (password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    await registerAccount();
  }

  if (step === "apartment") {
    return (
      <form onSubmit={handleCheckApartment} className="space-y-5" noValidate>
        {formError && (
          <RetryErrorAlert
            message={formError}
            onRetry={() => void checkApartment()}
            isRetrying={isSubmitting}
          />
        )}

        <ApartmentField
          id="register-apartment"
          value={apartment}
          onChange={handleApartmentChange}
          error={errors.apartment}
          disabled={isSubmitting}
        />

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Verificando…" : "Continuar"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5" noValidate>
      {formError && (
        <RetryErrorAlert
          message={formError}
          onRetry={() => void registerAccount()}
          isRetrying={isSubmitting}
        />
      )}

      <SuccessAlert show={isSuccess}>
        Registro completado. Ya puedes iniciar sesión con tu apartamento y
        contraseña.
      </SuccessAlert>

      <ApartmentField
        id="register-apartment-confirmed"
        value={apartment}
        onChange={() => undefined}
        readOnly
      />

      <button
        type="button"
        onClick={resetToApartmentStep}
        disabled={isSubmitting || isSuccess}
        className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-800 hover:decoration-stone-500 disabled:opacity-60"
      >
        Cambiar apartamento
      </button>

      <div>
        <label htmlFor="register-email" className="field-label">
          Correo electrónico
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          disabled={isSubmitting || isSuccess}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className="field-input"
        />
        {errors.email && (
          <p id="register-email-error" className="field-error">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-phone" className="field-label">
          Teléfono
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0414 1234567"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (errors.phone) {
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }
          }}
          disabled={isSubmitting || isSuccess}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "register-phone-error" : undefined}
          className="field-input"
        />
        {errors.phone && (
          <p id="register-phone-error" className="field-error">
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="register-password" className="field-label">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            disabled={isSubmitting || isSuccess}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "register-password-error" : undefined
            }
            className="field-input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting || isSuccess}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-stone-400 transition hover:text-stone-700 disabled:opacity-60"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        {errors.password && (
          <p id="register-password-error" className="field-error">
            {errors.password}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isSuccess}
        className="btn-primary"
      >
        {isSubmitting ? "Registrando…" : "Registrarse"}
      </button>
    </form>
  );
}
