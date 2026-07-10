import { hashPassword } from "@/lib/auth";
import {
  generateResetToken,
  getResetTokenExpiry,
  hashResetToken,
} from "@/lib/auth/password-reset";
import { getAppBaseUrl, sendPasswordResetEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Si los datos coinciden con una cuenta registrada, recibirás un correo con instrucciones para restablecer tu contraseña.";

type UserType = "resident" | "staff";

async function invalidateExistingTokens(
  userType: UserType,
  userId: string,
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  await supabase
    .from("password_reset_tokens")
    .update({ used_at: now })
    .eq("user_type", userType)
    .eq("user_id", userId)
    .is("used_at", null);
}

async function createResetTokenAndSendEmail(params: {
  request: Request;
  userType: UserType;
  userId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { token, tokenHash } = generateResetToken();
  const supabase = createSupabaseServerClient();

  await invalidateExistingTokens(params.userType, params.userId);

  const { error: insertError } = await supabase.from("password_reset_tokens").insert({
    user_type: params.userType,
    user_id: params.userId,
    token_hash: tokenHash,
    expires_at: getResetTokenExpiry().toISOString(),
  });

  if (insertError) {
    console.error("Error al crear token de recuperación:", insertError.message);
    return { ok: false, error: "No se pudo procesar la solicitud." };
  }

  const resetUrl = `${getAppBaseUrl(params.request)}/restablecer-contrasena?token=${token}`;
  const emailResult = await sendPasswordResetEmail({
    to: params.email,
    resetUrl,
  });

  if (!emailResult.ok) {
    return emailResult;
  }

  return { ok: true };
}

export async function requestResidentPasswordReset(params: {
  request: Request;
  apartment: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: apartmentRow } = await supabase
    .from("apartments")
    .select("id, email, registered_at, is_active")
    .eq("code", params.apartment)
    .maybeSingle();

  if (
    !apartmentRow ||
    !apartmentRow.is_active ||
    !apartmentRow.registered_at ||
    !apartmentRow.email
  ) {
    return { ok: true };
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  const storedEmail = apartmentRow.email.trim().toLowerCase();

  if (normalizedEmail !== storedEmail) {
    return { ok: true };
  }

  return createResetTokenAndSendEmail({
    request: params.request,
    userType: "resident",
    userId: apartmentRow.id,
    email: apartmentRow.email,
  });
}

export async function requestStaffPasswordReset(params: {
  request: Request;
  username: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServerClient();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, email, is_active")
    .eq("username", params.username)
    .maybeSingle();

  if (!adminRow || !adminRow.is_active || !adminRow.email) {
    return { ok: true };
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  const storedEmail = adminRow.email.trim().toLowerCase();

  if (normalizedEmail !== storedEmail) {
    return { ok: true };
  }

  return createResetTokenAndSendEmail({
    request: params.request,
    userType: "staff",
    userId: adminRow.id,
    email: adminRow.email,
  });
}

export async function resetPasswordWithToken(params: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokenHash = hashResetToken(params.token);
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: tokenRow, error: fetchError } = await supabase
    .from("password_reset_tokens")
    .select("id, user_type, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (fetchError) {
    console.error("Error al buscar token:", fetchError.message);
    return { ok: false, error: "No se pudo restablecer la contraseña." };
  }

  if (!tokenRow || tokenRow.used_at) {
    return {
      ok: false,
      error: "El enlace no es válido o ya fue utilizado. Solicita uno nuevo.",
    };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return {
      ok: false,
      error: "El enlace expiró. Solicita uno nuevo.",
    };
  }

  const passwordHash = await hashPassword(params.newPassword);

  if (tokenRow.user_type === "resident") {
    const { error: updateError } = await supabase
      .from("apartments")
      .update({
        password_hash: passwordHash,
        updated_at: now,
      })
      .eq("id", tokenRow.user_id)
      .eq("is_active", true);

    if (updateError) {
      console.error("Error al actualizar contraseña de residente:", updateError.message);
      return { ok: false, error: "No se pudo restablecer la contraseña." };
    }
  } else {
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ password_hash: passwordHash })
      .eq("id", tokenRow.user_id)
      .eq("is_active", true);

    if (updateError) {
      console.error("Error al actualizar contraseña de personal:", updateError.message);
      return { ok: false, error: "No se pudo restablecer la contraseña." };
    }
  }

  const { error: markUsedError } = await supabase
    .from("password_reset_tokens")
    .update({ used_at: now })
    .eq("id", tokenRow.id);

  if (markUsedError) {
    console.error("Error al marcar token como usado:", markUsedError.message);
  }

  await invalidateExistingTokens(tokenRow.user_type, tokenRow.user_id);

  return { ok: true };
}
