"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateStaffUserForm } from "@/components/admin/CreateStaffUserForm";
import { AppModal } from "@/components/ui/AppModal";
import { RetryErrorAlert } from "@/components/ui/RetryErrorAlert";
import { SuccessAlert } from "@/components/ui/SuccessAlert";
import { fetchJson } from "@/lib/fetch-client";
import type { StaffUserSummary } from "@/lib/auth/admin-users-api";
import type { StaffRole } from "@/lib/auth/roles";
import { getStaffRoleLabel } from "@/lib/auth/roles";

type StaffUser = StaffUserSummary;

function RoleBadge({ role }: { role: StaffRole }) {
  if (role === "admin") {
    return <span className="badge-neutral">Administrador</span>;
  }

  return <span className="badge-muted">Vigilante</span>;
}

function ChangePasswordPanel({
  user,
  onCancel,
  onSuccess,
}: {
  user: StaffUser;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPasswordChange() {
    if (!confirmSave) {
      setConfirmSave(true);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await fetchJson<{ error?: string }>(
      `/api/admin/users/${user.id}/password`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      },
    );

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      setConfirmSave(false);
      return;
    }

    onSuccess();
    setIsSubmitting(false);
    setConfirmSave(false);
  }

  async function handleSubmit() {
    await submitPasswordChange();
  }

  return (
    <div className="staff-user-password-panel">
      {error && (
        <RetryErrorAlert
          message={error}
          onRetry={() => void submitPasswordChange()}
          isRetrying={isSubmitting}
          className="mb-3"
        />
      )}

      <label htmlFor={`password-${user.id}`} className="field-label">
        Nueva contraseña para {user.username}
      </label>
      <div className="relative mt-1.5">
        <input
          id={`password-${user.id}`}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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

      {confirmSave && (
        <p className="mt-2 text-xs text-amber-800" role="status">
          ¿Confirmas el cambio de contraseña? Pulsa de nuevo para guardar.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !password}
          className="btn-primary"
        >
          {isSubmitting
            ? "Guardando…"
            : confirmSave
              ? "Confirmar contraseña"
              : "Guardar contraseña"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmSave(false);
            onCancel();
          }}
          disabled={isSubmitting}
          className="btn-ghost"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function StaffUsersList({ users }: { users: StaffUser[] }) {
  const router = useRouter();
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  function handlePasswordSuccess(username: string) {
    setPasswordUserId(null);
    setSuccessMessage(`Contraseña actualizada para «${username}».`);
  }

  function handleCreateSuccess() {
    setCreateModalOpen(false);
    setSuccessMessage("Usuario creado correctamente.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="page-header-row">
          <div className="page-header-main">
            <p className="page-eyebrow">Administración</p>
            <h1 className="page-title">Usuarios del personal</h1>
            <p className="page-subtitle">
              Administradores y vigilantes con acceso al panel.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="page-header-action"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Nuevo usuario
          </button>
        </div>
      </header>

      <SuccessAlert
        show={successMessage !== null}
        onHidden={() => setSuccessMessage(null)}
      >
        {successMessage}
      </SuccessAlert>

      {users.length === 0 ? (
        <div className="app-card py-12 text-center">
          <p className="text-sm text-stone-500">No hay usuarios registrados.</p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="page-header-action mt-4"
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="app-card divide-y divide-stone-100 p-0">
          {users.map((user) => {
            const isChangingPassword = passwordUserId === user.id;

            return (
              <div key={user.id} className="staff-user-row">
                <div className="staff-user-row-main">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">
                      {user.username}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {getStaffRoleLabel(user.role)}
                      {!user.isActive ? " · Inactivo" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <RoleBadge role={user.role} />
                    <button
                      type="button"
                      onClick={() =>
                        setPasswordUserId((current) =>
                          current === user.id ? null : user.id,
                        )
                      }
                      className="btn-ghost"
                      aria-expanded={isChangingPassword}
                      aria-controls={`password-panel-${user.id}`}
                    >
                      {isChangingPassword ? "Cerrar" : "Cambiar contraseña"}
                    </button>
                  </div>
                </div>

                {isChangingPassword && (
                  <div id={`password-panel-${user.id}`}>
                    <ChangePasswordPanel
                    user={user}
                    onCancel={() => setPasswordUserId(null)}
                    onSuccess={() => handlePasswordSuccess(user.username)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AppModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nuevo usuario"
        description="Crea una cuenta de administrador o vigilante."
      >
        <CreateStaffUserForm
          key={createModalOpen ? "open" : "closed"}
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateModalOpen(false)}
        />
      </AppModal>
    </div>
  );
}
