import crypto from "crypto";

const PIN_SECRET = process.env.BETTER_AUTH_SECRET || "nexora-pin-secret-fallback";

/**
 * Hash a 4-digit PIN using SHA-256 with a secret salt.
 * Stored in the DB so even if the DB leaks, PINs are not plaintext.
 */
export function hashPin(pin: string): string {
  return crypto
    .createHmac("sha256", PIN_SECRET)
    .update(pin)
    .digest("hex");
}

/**
 * Verify a PIN against a stored hash.
 */
export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}
