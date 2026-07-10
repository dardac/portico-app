import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/password-reset-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validators";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `reset-password:${getClientIp(request)}`,
    10,
    15 * 60_000,
  );
  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.retryAfterSec);
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "La base de datos no está configurada." },
      { status: 503 },
    );
  }

  let body: { token?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token y nueva contraseña son obligatorios." },
      { status: 400 },
    );
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`,
      },
      { status: 400 },
    );
  }

  const result = await resetPasswordWithToken({ token, newPassword: password });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Contraseña actualizada. Ya puedes iniciar sesión.",
  });
}
