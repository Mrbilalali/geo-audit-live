import { NextRequest } from "next/server";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// GET /api/suggest?q=ai+chatbots → { suggestions: string[] }
// Uses Google's public autocomplete endpoint (no key needed).
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return Response.json({ suggestions: [] });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
      { signal: ctrl.signal, headers: { "User-Agent": UA } }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const suggestions: string[] = Array.isArray(d) && Array.isArray(d[1]) ? d[1].filter((s) => typeof s === "string") : [];
    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  } finally {
    clearTimeout(t);
  }
}
