import { getApiKey } from "./keys";

// BYO Google OAuth — the user creates their own OAuth client in Google Cloud
// Console and pastes the ID + secret in Settings. Tokens live in their browser.
export const GOOGLE_TOKENS_LS = "gtk_google_tokens";
export const OAUTH_STATE_SS = "gtk_oauth_state";
export const OAUTH_CALLBACK = "https://geo-audit-live.vercel.app/oauth/callback";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly", // Search Console
  "https://www.googleapis.com/auth/analytics.readonly",   // GA4
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
}

export function getGoogleTokens(): GoogleTokens | null {
  try {
    const raw = localStorage.getItem(GOOGLE_TOKENS_LS);
    if (!raw) return null;
    const t = JSON.parse(raw) as GoogleTokens;
    return t.access_token ? t : null;
  } catch {
    return null;
  }
}

export function setGoogleTokens(t: GoogleTokens): void {
  try {
    localStorage.setItem(GOOGLE_TOKENS_LS, JSON.stringify(t));
  } catch { /* noop */ }
}

export function clearGoogleTokens(): void {
  try {
    localStorage.removeItem(GOOGLE_TOKENS_LS);
  } catch { /* noop */ }
}

export function getOAuthCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = getApiKey("google_client_id");
  const clientSecret = getApiKey("google_client_secret");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildAuthUrl(clientId: string): string {
  const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  try {
    sessionStorage.setItem(OAUTH_STATE_SS, state);
  } catch { /* noop */ }
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: OAUTH_CALLBACK,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString();
}

// Returns a valid access token, refreshing it when expired.
export async function ensureAccessToken(): Promise<string> {
  const creds = getOAuthCreds();
  const toks = getGoogleTokens();
  if (!creds || !toks) throw new Error("Google not connected.");
  if (toks.expires_at - Date.now() > 60_000) return toks.access_token;
  if (!toks.refresh_token) throw new Error("Session expired — reconnect Google.");
  const r = await fetch("/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant: "refresh",
      refresh_token: toks.refresh_token,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || d.error || "Token refresh failed.");
  const next: GoogleTokens = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || toks.refresh_token,
    expires_at: Date.now() + (d.expires_in || 3600) * 1000,
  };
  setGoogleTokens(next);
  return next.access_token;
}

// Call a Google API through the server proxy (avoids CORS issues).
// `path` examples: "webmasters/v3/sites", "webmasters/v3/sites/{site}/searchAnalytics/query"
export async function gapi<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const access_token = await ensureAccessToken();
  const r = await fetch("/api/gapi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, method: opts?.method || "GET", body: opts?.body, access_token }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || d.error || "Google API request failed.");
  return d.data as T;
}
