import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/gapi { path, method?, body?, access_token }
// Generic proxy for the user's Google API calls (Search Console, Analytics).
// The access token travels with the request only — never stored server-side.
const BASE = "https://www.googleapis.com/";

export async function POST(req: NextRequest) {
  let body: { path?: string; method?: string; body?: unknown; access_token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { path, access_token } = body;
  if (!path || !access_token || !/^[a-zA-Z0-9/_{}:.-]+$/.test(path)) {
    return Response.json({ error: "NO_CREDS" }, { status: 400 });
  }
  const method = (body.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(method)) {
    return Response.json({ error: "Method not allowed." }, { status: 400 });
  }
  // Allow the Analytics Data API host as well as www.googleapis.com paths.
  const url = path.startsWith("analyticsdata.googleapis.com/")
    ? "https://" + path
    : BASE + path;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(body.body ?? {}) : undefined,
    });
    const text = await r.text();
    let d: unknown = null;
    try { d = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!r.ok) {
      const msg = (d as { error?: { message?: string } } | null)?.error?.message || `HTTP ${r.status}`;
      return Response.json({ error: "GAPI_ERROR", detail: String(msg).slice(0, 300) }, { status: 502 });
    }
    return Response.json({ data: d });
  } catch (e: unknown) {
    return Response.json(
      { error: "GAPI_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
