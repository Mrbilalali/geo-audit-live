import { NextRequest } from "next/server";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function get(url: string, timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    return new TextDecoder().decode(buf.slice(0, 2_000_000));
  } finally {
    clearTimeout(t);
  }
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < 5000) out.push(m[1].trim());
  return out;
}

const isSitemapIndex = (xml: string) => /<sitemapindex/i.test(xml);

// GET /api/sitemap?url=https://example.com → { urls[], count, source }
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("url") || "").trim();
  let origin: string;
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad");
    origin = u.origin;
  } catch {
    return Response.json({ error: "Provide a valid http(s) URL." }, { status: 400 });
  }

  const tried: string[] = [];
  const candidates: string[] = [];
  if (/sitemap.*\.xml/i.test(raw)) candidates.push(raw);
  candidates.push(`${origin}/sitemap.xml`);

  // robots.txt → Sitemap: lines
  try {
    const robots = await get(`${origin}/robots.txt`);
    const sm = [...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    candidates.push(...sm);
  } catch {
    /* ignore */
  }

  for (const c of candidates) {
    tried.push(c);
    try {
      const xml = await get(c);
      if (!/^\s*</.test(xml)) continue;
      if (isSitemapIndex(xml)) {
        const children = extractLocs(xml).slice(0, 5);
        const urls: string[] = [];
        for (const child of children) {
          try {
            const cxml = await get(child);
            urls.push(...extractLocs(cxml));
            if (urls.length >= 2000) break;
          } catch {
            /* skip bad child */
          }
        }
        const uniq = [...new Set(urls)].slice(0, 2000);
        return Response.json({ urls: uniq, count: uniq.length, source: c, index: true });
      }
      const urls = [...new Set(extractLocs(xml))].slice(0, 2000);
      if (urls.length > 0) return Response.json({ urls, count: urls.length, source: c, index: false });
    } catch {
      /* try next */
    }
  }
  return Response.json(
    { error: "No sitemap found.", tried },
    { status: 404 }
  );
}
