import { NextRequest } from "next/server";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchHtml(url: string, timeoutMs = 20000, maxBytes = 600_000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    const bytes = buf.slice(0, maxBytes);
    return new TextDecoder().decode(bytes);
  } finally {
    clearTimeout(t);
  }
}

// GET /api/fetch-html?url=https://example.com  → { html }
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  let u: URL;
  try {
    u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol");
  } catch {
    return Response.json({ error: "Provide a valid http(s) URL." }, { status: 400 });
  }
  try {
    const html = await fetchHtml(u.toString());
    return Response.json({ html });
  } catch (e: unknown) {
    return Response.json(
      { error: e instanceof Error ? `Fetch failed: ${e.message}` : "Fetch failed." },
      { status: 502 }
    );
  }
}
