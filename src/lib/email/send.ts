import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { APP_NAME } from "@/lib/branding";

type SendResult = { ok: true } | { ok: false; error: string };

type EmailSender = {
  name?: string;
  email: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function parseEmailFrom(value: string): EmailSender {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  return { email: value.trim() };
}

function getEmailFrom(): string | null {
  return process.env.EMAIL_FROM?.trim() ?? null;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = getEmailFrom();

  if (!host || !user || !pass || !from) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    from,
  };
}

function createSmtpTransporter(config: SmtpConfig) {
  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  };

  return nodemailer.createTransport(options);
}

function buildPasswordResetContent(resetUrl: string) {
  return {
    subject: `Recuperar contraseña — ${APP_NAME}`,
    html: `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>${APP_NAME}</strong>.</p>
      <p><a href="${resetUrl}">Haz clic aquí para crear una nueva contraseña</a></p>
      <p>Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
    `,
    text: `Recuperar contraseña en ${APP_NAME}:\n\n${resetUrl}\n\nEste enlace expira en 1 hora.`,
  };
}

async function sendViaBrevo(params: {
  to: string;
  resetUrl: string;
  apiKey: string;
  from: string;
}): Promise<SendResult> {
  const sender = parseEmailFrom(params.from);
  const content = buildPasswordResetContent(params.resetUrl);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": params.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: params.to }],
      subject: content.subject,
      htmlContent: content.html,
      textContent: content.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[password-reset] Error al enviar con Brevo:", response.status, body);
    return { ok: false, error: "No se pudo enviar el correo de recuperación." };
  }

  return { ok: true };
}

async function sendViaSmtp(params: {
  to: string;
  resetUrl: string;
  config: SmtpConfig;
}): Promise<SendResult> {
  const transporter = createSmtpTransporter(params.config);
  const content = buildPasswordResetContent(params.resetUrl);

  try {
    await transporter.sendMail({
      from: params.config.from,
      to: params.to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (error) {
    console.error("[password-reset] Error al enviar con SMTP:", error);
    return { ok: false, error: "No se pudo enviar el correo de recuperación." };
  }

  return { ok: true };
}

export function getAppBaseUrl(request?: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    if (host) {
      return `${proto}://${host}`;
    }
  }

  return "http://localhost:3000";
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<SendResult> {
  const from = getEmailFrom();
  const brevoApiKey = process.env.BREVO_API_KEY?.trim();

  if (brevoApiKey && from) {
    return sendViaBrevo({
      to: params.to,
      resetUrl: params.resetUrl,
      apiKey: brevoApiKey,
      from,
    });
  }

  const smtpConfig = getSmtpConfig();
  if (smtpConfig) {
    return sendViaSmtp({
      to: params.to,
      resetUrl: params.resetUrl,
      config: smtpConfig,
    });
  }

  console.warn(
    "[password-reset] Email no configurado. Enlace de recuperación:",
    params.resetUrl,
  );
  return { ok: true };
}
