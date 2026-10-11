import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/seo { provider: "moz"|"semrush"|"pagespeed", ...params }
// Proxies the user's OWN third-party SEO API credentials. Credentials travel
// with this one request only — never stored or logged server-side.
export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const provider = body.provider;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);

  try {
    // ---------- Moz Links API (Domain Authority, Page Authority) ----------
    if (provider === "moz") {
      const { access_id, secret_key, domain } = body;
      if (!access_id || !secret_key || !domain) {
        return Response.json({ error: "NO_CREDS" }, { status: 400 });
      }
      const r = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: "Basic " + Buffer.from(`${access_id}:${secret_key}`).toString("base64"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targets: [domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")] }),
      });
      const d = await r.json();
      if (!r.ok) {
        const msg = (d as { message?: string })?.message || `HTTP ${r.status}`;
        return Response.json({ error: "SEO_ERROR", detail: `Moz: ${String(msg).slice(0, 200)}` }, { status: 502 });
      }
      const m = Array.isArray(d) ? d[0] : d;
      return Response.json({
        data: {
          domain_authority: m?.domain_authority ?? null,
          page_authority: m?.page_authority ?? null,
          linking_domains: m?.linking_domains ?? null,
          total_links: m?.total_links ?? null,
          spam_score: m?.spam_score ?? null,
        },
      });
    }

    // ---------- Semrush API (domain ranks / organic overview) ----------
    if (provider === "semrush") {
      const { api_key, domain, database } = body;
      if (!api_key || !domain) {
        return Response.json({ error: "NO_CREDS" }, { status: 400 });
      }
      const dom = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const url =
        `https://api.semrush.com/?type=domain_ranks&key=${encodeURIComponent(api_key)}` +
        `&domain=${encodeURIComponent(dom)}&database=${encodeURIComponent(database || "us")}&display_limit=1`;
      const r = await fetch(url, { signal: ctrl.signal });
      const text = await r.text();
      if (!r.ok) {
        return Response.json({ error: "SEO_ERROR", detail: `Semrush: HTTP ${r.status}` }, { status: 502 });
      }
      if (/ERROR/i.test(text.slice(0, 120))) {
        return Response.json({ error: "SEO_ERROR", detail: `Semrush: ${text.slice(0, 160)}` }, { status: 502 });
      }
      // semicolon-separated: header line + data line
      const lines = text.trim().split("\n");
      const dataLine = lines.length > 1 ? lines[1] : "";
      const cols = dataLine.split(";");
      const num = (i: number) => {
        const v = parseFloat((cols[i] || "").replace(/,/g, ""));
        return Number.isFinite(v) ? v : null;
      };
      return Response.json({
        data: {
          rank: num(2),
          organic_keywords: num(3),
          organic_traffic: num(4),
          organic_cost: num(5),
        },
      });
    }

    // ---------- Google PageSpeed Insights (free; key optional, raises quota) ----------
    if (provider === "pagespeed") {
      const { url, strategy, api_key } = body;
      if (!url) return Response.json({ error: "URL required." }, { status: 400 });
      let u = url.trim();
      if (!/^https?:\/\//i.test(u)) u = "https://" + u;
      const strat = strategy === "desktop" ? "desktop" : "mobile";
      const keyParam = api_key ? `&key=${encodeURIComponent(api_key)}` : "";
      const r = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(u)}` +
          `&strategy=${strat}&category=performance&category=seo&category=accessibility&category=best-practices${keyParam}`,
        { signal: ctrl.signal }
      );
      const d = await r.json();
      if (!r.ok) {
        const msg = (d as { error?: { message?: string } })?.error?.message || `HTTP ${r.status}`;
        return Response.json({ error: "SEO_ERROR", detail: `PageSpeed: ${String(msg).slice(0, 200)}` }, { status: 502 });
      }
      const cats = (d as { lighthouseResult?: { categories?: Record<string, { score?: number }> } })?.lighthouseResult?.categories || {};
      const pct = (k: string) => {
        const s = cats[k]?.score;
        return typeof s === "number" ? Math.round(s * 100) : null;
      };
      return Response.json({
        data: {
          performance: pct("performance"),
          seo: pct("seo"),
          accessibility: pct("accessibility"),
          best_practices: pct("best-practices"),
        },
      });
    }

    return Response.json({ error: "Unknown provider." }, { status: 400 });
  } catch (e: unknown) {
    return Response.json(
      { error: "SEO_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
