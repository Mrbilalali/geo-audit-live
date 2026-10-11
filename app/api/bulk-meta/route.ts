import { NextRequest } from "next/server";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface MetaRow {
  url: string;
  status: number | null;
  title: string;
  titleLen: number;
  description: string;
  descLen: number;
  h1: string;
  error?: string;
}

function tag(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 300) : "";
}

async function fetchMeta(raw: string): Promise<MetaRow> {
  const base: MetaRow = {
    url: raw, status: null, title: "", titleLen: 0, description: "", descLen: 0, h1: "",
  };
  let u: URL;
  try {
    u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) throw new Error("URL must start with http(s)");
  } catch {
    return { ...base, error: "Invalid URL" };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    base.status = r.status;
    if (!r.ok) return { ...base, error: `HTTP ${r.status}` };
    const buf = await r.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, 600_000));
    base.title = tag(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    base.titleLen = base.title.length;
    base.description =
      tag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      tag(html, /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
    base.descLen = base.description.length;
    base.h1 = tag(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "");
    return base;
  } catch (e: unknown) {
    return { ...base, error: e instanceof Error ? e.message : "Fetch failed" };
  } finally {
    clearTimeout(t);
  }
}

// POST /api/bulk-meta { urls: string[] } → { rows: MetaRow[] }
export async function POST(req: NextRequest) {
  let urls: string[] = [];
  try {
    const body = await req.json();
    urls = Array.isArray(body.urls) ? body.urls : [];
  } catch {
    /* noop */
  }
  urls = urls.map((u) => (u || "").trim()).filter(Boolean).slice(0, 10);
  if (urls.length === 0) {
    return Response.json({ error: "Send up to 10 URLs in { urls: [] }." }, { status: 400 });
  }
  const rows = await Promise.all(urls.map(fetchMeta));
  return Response.json({ rows });
}
