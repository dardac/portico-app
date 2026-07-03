"use client";

import { FormEvent, useState } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { fetchJson } from "@/lib/fetch-client";
import type { StaffRole } from "@/lib/auth/roles";
import { getStaffRoleLabel, STAFF_ROLES } from "@/lib/auth/roles";
import { sanitizeStaffUsernameInput } from "@/lib/validators";

type FormState = {
  role: StaffRole;
  username: string;
  password: string;
};

const INITIAL_STATE: FormState = {
  role: "vigilante",
  username: "",
  password: "",
};

type CreateStaffUserFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CreateStaffUserForm({
  onSuccess,
  onCancel,
}: CreateStaffUserFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCreate() {
    setError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string }>("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        username: sanitizeStaffUsernameInput(form.username),
      }),
    });

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setForm(INITIAL_STATE);
    setShowPassword(false);
    onSuccess?.();
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitCreate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={() => void submitCreate()}
          isRetrying={isSubmitting}
        />
      )}

      <div>
        <label htmlFor="staff-role" className="field-label">
          Rol
        </label>
        <select
          id="staff-role"
          value={form.role}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              role: event.target.value as StaffRole,
            }))
          }
          disabled={isSubmitting}
          className="field-input"
        >
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {getStaffRoleLabel(role)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="staff-username" className="field-label">
          Nombre de usuario
        </label>
        <input
          id="staff-username"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={form.username}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              username: sanitizeStaffUsernameInput(event.target.value),
            }))
          }
          disabled={isSubmitting}
          className="field-input"
          placeholder="ej. vigilante.torre-c"
        />
        <p className="mt-1.5 text-xs text-stone-400">
          Sin espacios. Minúsculas, números, punto, guión o guión bajo. Mínimo 3
          caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="staff-password" className="field-label">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="staff-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            disabled={isSubmitting}
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-ghost"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="page-header-action w-full justify-center sm:w-auto"
        >
          {isSubmitting ? "Creando…" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
