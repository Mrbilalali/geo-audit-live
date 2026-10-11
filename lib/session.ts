import { createHash, createHmac, timingSafeEqual } from "crypto";

// Signed session cookie for Pro access. The license key itself is never stored
// in the cookie — only its SHA-256 hash, the plan, and an expiry.
const SECRET = process.env.GTK_SESSION_SECRET || "geo-toolkit-dev-secret-change-before-launch";
export const SESSION_COOKIE = "gtk_sess";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionData {
  keyHash: string;
  plan: "monthly" | "lifetime";
  exp: number;
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function signSession(d: SessionData): string {
  const payload = Buffer.from(JSON.stringify(d)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionData | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
    if (!d.keyHash || !d.plan || typeof d.exp !== "number" || d.exp < Date.now()) return null;
    return d;
  } catch {
    return null;
  }
}

export function newSessionCookie(key: string, plan: "monthly" | "lifetime"): string {
  const token = signSession({ keyHash: hashKey(key), plan, exp: Date.now() + THIRTY_DAYS_MS });
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
