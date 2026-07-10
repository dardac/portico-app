import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout eyebrow="Gestión residencial">
      <div className="app-card">
        <div className="mb-6">
          <h2 className="section-title">Recuperar contraseña</h2>
          <p className="mt-1 text-sm text-stone-500">
            Ingresa tu apartamento y el correo que registraste. Te enviaremos un
            enlace para crear una nueva contraseña.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </AuthLayout>
  );
}
