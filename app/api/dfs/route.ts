import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/dfs { login, password, endpoint, payload }
// Proxies the user's OWN DataForSEO credentials to DataForSEO's API.
// Credentials are never stored or logged — they travel with this one request only.
const ALLOWLIST: Record<string, string> = {
  domain_rank_overview:
    "https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live",
  ranked_keywords:
    "https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live",
  backlinks_summary: "https://api.dataforseo.com/v3/backlinks/summary/live",
};

export async function POST(req: NextRequest) {
  let body: { login?: string; password?: string; endpoint?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { login, password, endpoint, payload } = body;
  if (!login || !password) {
    return Response.json({ error: "NO_CREDS" }, { status: 400 });
  }
  const url = endpoint ? ALLOWLIST[endpoint] : undefined;
  if (!url) return Response.json({ error: "Unknown endpoint." }, { status: 400 });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? []),
    });
    const d = await r.json();
    if (!r.ok) {
      return Response.json(
        { error: "DFS_ERROR", detail: d?.status_message || `HTTP ${r.status}` },
        { status: 502 }
      );
    }
    return Response.json(d);
  } catch (e: unknown) {
    return Response.json(
      { error: "DFS_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
