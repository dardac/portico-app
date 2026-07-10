import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getResetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
}
