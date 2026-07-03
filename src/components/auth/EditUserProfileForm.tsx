"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { fetchJson } from "@/lib/fetch-client";

type ResidentProfile = {
  type: "resident";
  apartmentCode: string;
  email: string;
  phone: string;
};

type AdminProfile = {
  type: "admin";
  username: string;
  roleLabel: string;
  email: string;
  phone: string;
};

type UserProfile = ResidentProfile | AdminProfile;

type EditUserProfileFormProps = {
  onSuccess?: () => void;
  cancelHref?: string;
};

export function EditUserProfileForm({
  onSuccess,
  cancelHref = "/registro",
}: EditUserProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  async function loadProfile() {
    setIsLoading(true);
    setError(null);
    setErrorRetryable(false);

    const result = await fetchJson<{ profile: UserProfile; error?: string }>(
      "/api/auth/profile",
    );

    if (!result.ok) {
      setError(result.error);
      setErrorRetryable(true);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const loadedProfile = result.data.profile;
    setProfile(loadedProfile);
    setEmail(loadedProfile.email);
    setPhone(loadedProfile.phone);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProfile();
  }, [reloadKey]);

  async function saveProfile() {
    setError(null);
    setErrorRetryable(false);
    setIsSubmitting(true);

    const result = await fetchJson<{ profile: UserProfile; error?: string }>(
      "/api/auth/profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setErrorRetryable(result.retryable);
      setIsSubmitting(false);
      return;
    }

    setProfile(result.data.profile);
    setCurrentPassword("");
    setNewPassword("");
    onSuccess?.();
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveProfile();
  }

  function retryLoad() {
    setReloadKey((current) => current + 1);
  }

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-stone-400">
        Cargando perfil…
      </p>
    );
  }

  if (!profile) {
    return error ? (
      <RetryErrorAlert
        message={error}
        onRetry={retryLoad}
        isRetrying={isLoading}
      />
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={errorRetryable ? () => void saveProfile() : undefined}
          isRetrying={isSubmitting}
        />
      )}

      <div>
        <p className="field-label">
          {profile.type === "resident" ? "Apartamento" : "Usuario"}
        </p>
        <p className="mt-1.5 rounded-lg border border-stone-200/80 bg-stone-50/80 px-3.5 py-2.5 text-sm font-medium text-stone-700">
          {profile.type === "resident"
            ? profile.apartmentCode
            : `${profile.username} · ${profile.roleLabel}`}
        </p>
      </div>

      <div>
        <label htmlFor="profile-email" className="field-label">
          Correo electrónico
        </label>
        <input
          id="profile-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="profile-phone" className="field-label">
          Teléfono
        </label>
        <input
          id="profile-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={isSubmitting}
          placeholder="0412-1234567"
          className="field-input"
        />
      </div>

      <div className="rounded-xl border border-stone-200/70 bg-stone-50/50 px-4 py-4">
        <p className="text-sm font-medium text-stone-800">Cambiar contraseña</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Deja estos campos vacíos si no quieres cambiar la contraseña.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="profile-current-password" className="field-label">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                id="profile-current-password"
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={isSubmitting}
                className="field-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                disabled={isSubmitting}
                aria-label={
                  showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-stone-400 transition hover:text-stone-700 disabled:opacity-60"
              >
                {showCurrentPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="profile-new-password" className="field-label">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="profile-new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isSubmitting}
                className="field-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                disabled={isSubmitting}
                aria-label={
                  showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-stone-400 transition hover:text-stone-700 disabled:opacity-60"
              >
                {showNewPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-ghost text-center">
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="page-header-action w-full justify-center sm:w-auto"
        >
          {isSubmitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
