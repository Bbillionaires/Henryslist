import "server-only";
import { env } from "@/lib/env";

/**
 * Verifies a Cloudflare Turnstile token server-side. Returns true
 * immediately (no-op) if TURNSTILE_SECRET_KEY isn't configured — bot
 * protection is optional infrastructure, not a hard requirement to run the
 * app, matching how Google/Apple OAuth are also gated on env presence.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed:", err);
    // Fail closed: if we can't reach Cloudflare, don't let a bot through —
    // but this only matters when the feature is actually enabled.
    return false;
  }
}
