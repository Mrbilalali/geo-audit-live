import { BILLING, FREE_MONTHLY_LIMIT, FREE_UNLIMITED } from "./billing";

export type Plan = "free" | "pro";

interface LicenseCache {
  key: string;
  plan: "monthly" | "lifetime";
  at: number;
}

const LK = "geo-toolkit-license";
const UK = "geo-toolkit-usage";

export function getLicense(): LicenseCache | null {
  try {
    const raw = localStorage.getItem(LK);
    return raw ? (JSON.parse(raw) as LicenseCache) : null;
  } catch {
    return null;
  }
}

export function setLicense(c: LicenseCache): void {
  try {
    localStorage.setItem(LK, JSON.stringify(c));
  } catch {
    /* noop */
  }
}

export function clearLicense(): void {
  try {
    localStorage.removeItem(LK);
  } catch {
    /* noop */
  }
}

export function getPlan(): Plan {
  return getLicense() ? "pro" : "free";
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* noop */
  }
  clearLicense();
}

export async function fetchPlan(): Promise<Plan> {
  try {
    const r = await fetch("/api/auth/session");
    const s = await r.json();
    if (s.plan === "pro") return "pro";
  } catch {
    /* noop */
  }
  return getPlan();
}

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

interface UsageMap {
  month: string;
  counts: Record<string, number>;
}

function readUsage(): UsageMap {
  try {
    const raw = localStorage.getItem(UK);
    const u = raw ? (JSON.parse(raw) as UsageMap) : null;
    if (u && u.month === monthKey()) return u;
  } catch {
    /* noop */
  }
  return { month: monthKey(), counts: {} };
}

export function recordUse(tool: string): void {
  try {
    const u = readUsage();
    u.counts[tool] = (u.counts[tool] || 0) + 1;
    localStorage.setItem(UK, JSON.stringify(u));
  } catch {
    /* noop */
  }
}

export interface Access {
  allowed: boolean;
  kind: "unlimited" | "limited" | "locked";
  left: number;
  reason?: "pro-only" | "limit-reached";
}

export function checkAccess(tool: string): Access {
  if (getPlan() === "pro") return { allowed: true, kind: "unlimited", left: Infinity };
  if (FREE_UNLIMITED.includes(tool)) return { allowed: true, kind: "unlimited", left: Infinity };
  const limit = FREE_MONTHLY_LIMIT[tool];
  if (limit !== undefined) {
    const used = readUsage().counts[tool] || 0;
    const left = Math.max(0, limit - used);
    return left > 0
      ? { allowed: true, kind: "limited", left }
      : { allowed: false, kind: "locked", left: 0, reason: "limit-reached" };
  }
  return { allowed: false, kind: "locked", left: 0, reason: "pro-only" };
}

export async function verifyKey(key: string): Promise<{ valid: boolean; plan?: string }> {
  const r = await fetch("/api/license", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return r.json();
}

export function checkoutUrl(kind: "monthly" | "lifetime"): string {
  const permalink = kind === "monthly" ? BILLING.monthlyPermalink : BILLING.lifetimePermalink;
  return `${BILLING.storeUrl}/l/${permalink}`;
}
