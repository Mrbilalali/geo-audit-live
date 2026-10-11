import { getApiKey } from "./keys";

// BYO third-party SEO APIs — Moz, Semrush. Credentials stay in the browser;
// PageSpeed needs no key at all.
export function getMozCreds(): { accessId: string; secretKey: string } | null {
  const accessId = getApiKey("moz_access_id");
  const secretKey = getApiKey("moz_secret_key");
  if (!accessId || !secretKey) return null;
  return { accessId, secretKey };
}

export function getSemrushKey(): string | null {
  return getApiKey("semrush_key") || null;
}

async function postSeo(body: Record<string, string>) {
  const r = await fetch("/api/seo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || d.error || "Request failed");
  return d.data;
}

export interface MozData {
  domain_authority: number | null;
  page_authority: number | null;
  linking_domains: number | null;
  total_links: number | null;
  spam_score: number | null;
}

export async function mozMetrics(domain: string): Promise<MozData> {
  const c = getMozCreds();
  if (!c) throw new Error("NO_CREDS");
  return postSeo({ provider: "moz", access_id: c.accessId, secret_key: c.secretKey, domain });
}

export interface SemrushData {
  rank: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
}

export async function semrushOverview(domain: string, database = "us"): Promise<SemrushData> {
  const key = getSemrushKey();
  if (!key) throw new Error("NO_CREDS");
  return postSeo({ provider: "semrush", api_key: key, domain, database });
}

export interface PageSpeedData {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  best_practices: number | null;
}

export async function pageSpeed(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedData> {
  return postSeo({ provider: "pagespeed", url, strategy });
}
