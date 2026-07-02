import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Firestore doc IDs can't contain "/", so we hash the email into a safe key.
export function otpDocId(email: string): string {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}
