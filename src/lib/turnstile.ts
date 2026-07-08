const SECRET = process.env.TURNSTILE_SECRET_KEY || "";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token.
 * Returns true if the token is valid.
 * Test keys always pass.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token || !SECRET) {
    // If Turnstile is not configured, allow the request
    return !SECRET || false;
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    // Network error — fail open to not block users
    return true;
  }
}
