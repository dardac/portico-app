import { AdminForgotPasswordForm } from "@/components/AdminForgotPasswordForm";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function AdminForgotPasswordPage() {
  return (
    <AuthLayout eyebrow="Administración">
      <div className="app-card">
        <div className="mb-6">
          <h2 className="section-title">Recuperar contraseña</h2>
          <p className="mt-1 text-sm text-stone-500">
            Ingresa tu usuario y el correo asociado a tu cuenta de personal.
          </p>
        </div>

        <AdminForgotPasswordForm />
      </div>
    </AuthLayout>
  );
}
