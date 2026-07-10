import { NextResponse } from "next/server";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  requestStaffPasswordReset,
} from "@/lib/auth/password-reset-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  exceedsMaxLength,
  isValidEmail,
  isValidStaffUsername,
  MAX_EMAIL_LENGTH,
  sanitizeStaffUsernameInput,
} from "@/lib/validators";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `admin-forgot-password:${getClientIp(request)}`,
    5,
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

  let body: { username?: string; email?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const username = sanitizeStaffUsernameInput(body.username ?? "");
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!username || !email) {
    return NextResponse.json(
      { error: "Usuario y correo son obligatorios." },
      { status: 400 },
    );
  }

  if (!isValidStaffUsername(username)) {
    return NextResponse.json(
      { error: "Ingresa un usuario válido." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email) || exceedsMaxLength(email, MAX_EMAIL_LENGTH)) {
    return NextResponse.json(
      { error: "Ingresa un correo electrónico válido." },
      { status: 400 },
    );
  }

  const result = await requestStaffPasswordReset({
    request,
    username,
    email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
}
