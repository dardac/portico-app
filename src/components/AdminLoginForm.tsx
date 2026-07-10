"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { fetchJson } from "@/lib/fetch-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin() {
    setError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string }>("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/registro");
    router.refresh();
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitLogin();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={() => void submitLogin()}
          isRetrying={isSubmitting}
        />
      )}

      <div>
        <label htmlFor="admin-username" className="field-label">
          Usuario
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <input
          id="admin-username"
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
        <label htmlFor="admin-password" className="field-label">
          Contraseña
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obligatorio)</span>
        </label>
        <div className="relative">
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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
        <p className="mt-2 text-right text-sm">
          <Link
            href="/admin/olvide-contrasena"
            className="font-medium text-stone-600 underline decoration-stone-300 underline-offset-2 transition hover:text-stone-900 hover:decoration-stone-500"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? "Verificando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
