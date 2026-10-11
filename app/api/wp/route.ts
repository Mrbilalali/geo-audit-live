import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/wp { site, user, appPassword, action, ... }
// Proxies the user's OWN WordPress credentials (Application Password).
// Credentials are never stored or logged — they travel with this one request only.
function normSite(site: string): string {
  let s = (site || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const site = normSite(String(body.site || ""));
  const user = String(body.user || "");
  const appPassword = String(body.appPassword || "");
  const action = String(body.action || "");
  if (!site || !user || !appPassword) {
    return Response.json({ error: "NO_CREDS" }, { status: 400 });
  }
  const auth = "Basic " + Buffer.from(`${user}:${appPassword}`).toString("base64");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);

  try {
    if (action === "test") {
      const r = await fetch(`${site}/wp-json/wp/v2/users/me`, {
        signal: ctrl.signal, headers: { Authorization: auth },
      });
      if (!r.ok) {
        return Response.json({ error: "WP_AUTH", detail: `WordPress rejected the credentials (HTTP ${r.status}). Check the site URL, username and application password.` }, { status: 502 });
      }
      const me = await r.json();
      return Response.json({ ok: true, name: me?.name || user });
    }

    if (action === "posts") {
      const r = await fetch(`${site}/wp-json/wp/v2/posts?per_page=5&_fields=id,title,link,status,date`, {
        signal: ctrl.signal, headers: { Authorization: auth },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const posts = await r.json();
      return Response.json({ posts });
    }

    if (action === "publish") {
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      const status = body.status === "publish" ? "publish" : "draft";
      if (!title || !content) {
        return Response.json({ error: "Title and content are required." }, { status: 400 });
      }
      const r = await fetch(`${site}/wp-json/wp/v2/posts`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, status }),
      });
      const d = await r.json();
      if (!r.ok) {
        return Response.json(
          { error: "WP_ERROR", detail: String(d?.message || `HTTP ${r.status}`).slice(0, 300) },
          { status: 502 }
        );
      }
      return Response.json({ id: d.id, link: d.link, status: d.status });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e: unknown) {
    return Response.json(
      { error: "WP_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
