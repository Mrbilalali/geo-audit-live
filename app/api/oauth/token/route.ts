import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/oauth/token
// { grant: "code", code, client_id, client_secret, redirect_uri } → first exchange
// { grant: "refresh", refresh_token, client_id, client_secret } → refresh
// Proxies the user's OWN OAuth client credentials to Google. Nothing is stored
// or logged server-side.
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { grant, client_id, client_secret } = body;
  if (!client_id || !client_secret) {
    return Response.json({ error: "NO_CREDS" }, { status: 400 });
  }
  const form = new URLSearchParams({ client_id, client_secret });
  if (grant === "code") {
    if (!body.code || !body.redirect_uri) {
      return Response.json({ error: "Missing code." }, { status: 400 });
    }
    form.set("grant_type", "authorization_code");
    form.set("code", body.code);
    form.set("redirect_uri", body.redirect_uri);
  } else if (grant === "refresh") {
    if (!body.refresh_token) {
      return Response.json({ error: "Missing refresh token." }, { status: 400 });
    }
    form.set("grant_type", "refresh_token");
    form.set("refresh_token", body.refresh_token);
  } else {
    return Response.json({ error: "Unknown grant." }, { status: 400 });
  }

  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = d?.error_description || d?.error || `HTTP ${r.status}`;
      return Response.json({ error: "OAUTH_ERROR", detail: String(msg).slice(0, 300) }, { status: 502 });
    }
    return Response.json({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_in: d.expires_in,
    });
  } catch (e: unknown) {
    return Response.json(
      { error: "OAUTH_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  }
}
