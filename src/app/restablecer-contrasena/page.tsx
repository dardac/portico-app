import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ResetPasswordPage() {
  return (
    <AuthLayout eyebrow="Gestión residencial">
      <div className="app-card">
        <div className="mb-6">
          <h2 className="section-title">Nueva contraseña</h2>
          <p className="mt-1 text-sm text-stone-500">
            Elige una contraseña nueva para tu cuenta.
          </p>
        </div>

        <Suspense fallback={<p className="text-sm text-stone-500">Cargando…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthLayout>
  );
}
