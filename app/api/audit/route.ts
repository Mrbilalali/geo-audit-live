import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 25;

type Status = "pass" | "warn" | "fail";
interface Check {
  id: string;
  category: string;
  name: string;
  weight: number;
  status: Status;
  evidence: string;
  fix: string;
}

const AI_BOTS = ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "CCBot"];
const FETCH_TIMEOUT = 9000;
const UA = "Mozilla/5.0 (compatible; GEO-Audit-Tool/1.0; +https://github.com/Mrbilalali)";

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string; finalUrl: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/plain,*/*" },
    });
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text: text.slice(0, 1_500_000), finalUrl: res.url };
  } catch {
    return { ok: false, status: 0, text: "", finalUrl: url };
  } finally {
    clearTimeout(t);
  }
}

function normalizeUrl(raw: string): { origin: string; pageUrl: string } | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return { origin: u.origin, pageUrl: u.origin + (u.pathname === "/" ? "" : u.pathname) };
  } catch {
    return null;
  }
}

/** Parse robots.txt into groups: [{agents:[...], rules:[{dir:'allow'|'disallow', path}]}] */
function parseRobots(txt: string) {
  const groups: { agents: string[]; allows: string[]; disallows: string[] }[] = [];
  let cur: { agents: string[]; allows: string[]; disallows: string[] } | null = null;
  let seenRule = false;
  for (const rawLine of txt.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (seenRule || !cur) {
        cur = { agents: [], allows: [], disallows: [] };
        groups.push(cur);
        seenRule = false;
      }
      cur.agents.push(value.toLowerCase());
    } else if (field === "allow" && cur) {
      cur.allows.push(value); seenRule = true;
    } else if (field === "disallow" && cur) {
      cur.disallows.push(value); seenRule = true;
    }
  }
  return groups;
}

/** Is `bot` blocked from crawling `/`? Checks its own group, falls back to `*` group. */
function botBlocked(groups: ReturnType<typeof parseRobots>, bot: string): { blocked: boolean; evidence: string } {
  const b = bot.toLowerCase();
  const own = groups.find((g) => g.agents.includes(b));
  const star = groups.find((g) => g.agents.includes("*"));
  const g = own || star;
  if (!g) return { blocked: false, evidence: `No rules found for ${bot} (or *). Default: allowed.` };
  const blocked = g.disallows.some((d) => d === "/" || d === "/*");
  const lines = [
    `User-agent: ${g.agents.join(", ")}`,
    ...g.allows.map((a) => `Allow: ${a || "(empty)"}`),
    ...g.disallows.map((d) => `Disallow: ${d === "" ? "(empty = allow all)" : d}`),
  ];
  return { blocked, evidence: lines.join("\n") };
}

function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) collect(it);
    } catch { /* invalid JSON-LD block */ }
  }
  function collect(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(collect);
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    if (typeof t === "string") types.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
    const g = o["@graph"];
    if (g) collect(g);
  }
  return [...types];
}

function metaContent(html: string, attr: string, val: string): string | null {
  const re1 = new RegExp(`<meta[^>]+${attr}=["']${val}["'][^>]*>`, "i");
  const tag = html.match(re1)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "";
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") || "";
  const norm = normalizeUrl(raw);
  if (!norm) {
    return Response.json({ error: "Please enter a valid website URL, e.g. example.com" }, { status: 400 });
  }
  const { origin, pageUrl } = norm;
  const target = pageUrl || origin + "/";

  const [robots, llms, sitemap, home] = await Promise.all([
    fetchText(origin + "/robots.txt"),
    fetchText(origin + "/llms.txt"),
    fetchText(origin + "/sitemap.xml"),
    fetchText(target),
  ]);

  const checks: Check[] = [];
  const push = (c: Check) => checks.push(c);

  // ---------- 1. CRAWLER ACCESS ----------
  if (robots.ok) {
    const groups = parseRobots(robots.text);
    const perBot = AI_BOTS.map((b) => ({ bot: b, ...botBlocked(groups, b) }));
    const blocked = perBot.filter((x) => x.blocked);
    push({
      id: "ai-bots", category: "AI Crawler Access", name: "AI crawlers allowed in robots.txt", weight: 14,
      status: blocked.length === 0 ? "pass" : blocked.length <= 2 ? "warn" : "fail",
      evidence: perBot.map((x) => `${x.blocked ? "BLOCKED" : "allowed"} — ${x.bot}`).join("\n"),
      fix: blocked.length
        ? `These AI bots are blocked: ${blocked.map((x) => x.bot).join(", ")}. Add explicit Allow rules for them in robots.txt (see your robots.txt evidence above). If they cannot crawl you, they cannot cite you.`
        : "All major AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, CCBot) are allowed. Nothing to fix here.",
    });
    const star = groups.find((g) => g.agents.includes("*"));
    const sitewide = !!star && star.disallows.some((d) => d === "/" || d === "/*");
    push({
      id: "no-sitewide-block", category: "AI Crawler Access", name: "No site-wide crawl block", weight: 8,
      status: sitewide ? "fail" : "pass",
      evidence: sitewide
        ? "robots.txt contains a blanket 'Disallow: /' for all user-agents."
        : "No blanket Disallow: / found. Site is crawlable.",
      fix: sitewide
        ? "Remove the blanket 'Disallow: /' rule — it blocks every crawler including AI bots. Replace with targeted rules if you need to hide specific paths."
        : "No action needed.",
    });
  } else {
    push({
      id: "ai-bots", category: "AI Crawler Access", name: "AI crawlers allowed in robots.txt", weight: 14,
      status: "warn",
      evidence: `Could not fetch ${origin}/robots.txt (HTTP ${robots.status || "error"}).`,
      fix: "Make sure robots.txt exists and is reachable, then explicitly Allow AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended).",
    });
    push({
      id: "no-sitewide-block", category: "AI Crawler Access", name: "No site-wide crawl block", weight: 8,
      status: "warn", evidence: "robots.txt unreachable — could not verify.",
      fix: "Verify robots.txt is reachable and contains no blanket Disallow: / rule.",
    });
  }

  push({
    id: "llms-txt", category: "AI Crawler Access", name: "llms.txt file present", weight: 8,
    status: llms.ok && llms.text.trim().length > 100 ? "pass" : llms.ok ? "warn" : "fail",
    evidence: llms.ok
      ? `Found at ${origin}/llms.txt (${llms.text.trim().length} chars). Preview:\n${llms.text.trim().slice(0, 300)}`
      : `Not found at ${origin}/llms.txt (HTTP ${llms.status || "error"}).`,
    fix: llms.ok && llms.text.trim().length > 100
      ? "llms.txt exists. Keep it updated as you add key pages."
      : "Create /llms.txt at your site root: a short file listing your key pages with one-line descriptions each. It is the emerging standard that helps AI agents find the right content fast.",
  });

  // ---------- 2. MACHINE-READABLE FACTS ----------
  if (home.ok) {
    const html = home.text;
    const types = extractJsonLdTypes(html);
    const hasOrg = types.some((t) => ["Organization", "LocalBusiness", "Corporation", "Person", "ProfessionalService", "Store"].includes(t));
    push({
      id: "jsonld-org", category: "Machine-Readable Facts", name: "Organization structured data (JSON-LD)", weight: 10,
      status: hasOrg ? "pass" : types.length ? "warn" : "fail",
      evidence: types.length ? `JSON-LD @types found: ${types.join(", ")}` : "No JSON-LD structured data blocks found in the HTML.",
      fix: hasOrg
        ? "Organization schema is present. Keep name, URL and sameAs links accurate."
        : "Add an Organization (or LocalBusiness) JSON-LD block to your homepage <head> with name, url, description and sameAs links. Validate at validator.schema.org.",
    });
    const hasFaq = types.includes("FAQPage") || types.includes("Article") || types.includes("BlogPosting") || types.includes("NewsArticle");
    push({
      id: "jsonld-faq", category: "Machine-Readable Facts", name: "FAQ / Article schema", weight: 6,
      status: hasFaq ? "pass" : "fail",
      evidence: hasFaq ? `Found: ${types.filter((t) => ["FAQPage", "Article", "BlogPosting", "NewsArticle"].includes(t)).join(", ")}` : "No FAQPage or Article schema detected.",
      fix: hasFaq
        ? "Content schema present — good for citations."
        : "Add FAQPage schema to pages with FAQs and Article schema to guides/posts. These formats map directly to questions people ask AI assistants.",
    });
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    push({
      id: "title", category: "Machine-Readable Facts", name: "Title tag optimized", weight: 5,
      status: title.length >= 30 && title.length <= 65 ? "pass" : title ? "warn" : "fail",
      evidence: title ? `Title (${title.length} chars): "${title.slice(0, 90)}"` : "No <title> tag found.",
      fix: title.length >= 30 && title.length <= 65
        ? "Title length is in the ideal range."
        : "Rewrite the title to 30–65 characters: primary keyword + brand. This is what AI engines read first.",
    });
    const desc = metaContent(html, "name", "description");
    push({
      id: "meta-desc", category: "Machine-Readable Facts", name: "Meta description present", weight: 5,
      status: desc && desc.length >= 100 && desc.length <= 165 ? "pass" : desc ? "warn" : "fail",
      evidence: desc ? `Meta description (${desc.length} chars): "${desc.slice(0, 120)}"` : "No meta description found.",
      fix: desc && desc.length >= 100
        ? "Meta description looks good."
        : "Write a 120–160 character meta description summarizing the page with its main keyword.",
    });
    const canon = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
    const og = metaContent(html, "property", "og:title");
    push({
      id: "canon-og", category: "Machine-Readable Facts", name: "Canonical + Open Graph tags", weight: 4,
      status: canon && og ? "pass" : canon || og ? "warn" : "fail",
      evidence: `canonical: ${canon ? "present" : "MISSING"} | og:title: ${og ? "present" : "MISSING"}`,
      fix: canon && og ? "No action needed." : "Add a canonical link tag and Open Graph tags (og:title, og:description, og:image) to control how your pages appear when cited and shared.",
    });

    // ---------- 3. CONTENT ----------
    const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
    push({
      id: "h1", category: "Answer-First Content", name: "Single H1 heading", weight: 6,
      status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
      evidence: `Found ${h1Count} <h1> tag${h1Count === 1 ? "" : "s"} on the homepage.`,
      fix: h1Count === 1 ? "Good — one clear H1." : "Use exactly one H1 per page containing the page's main topic/question.",
    });
    const words = visibleText(html).split(/\s+/).filter(Boolean).length;
    push({
      id: "wordcount", category: "Answer-First Content", name: "Sufficient indexable text", weight: 7,
      status: words >= 400 ? "pass" : words >= 150 ? "warn" : "fail",
      evidence: `Approx. ${words} visible words on the homepage (HTML text, scripts stripped).`,
      fix: words >= 400
        ? "Healthy amount of crawlable text."
        : "AI engines cite pages with substantive text. Expand thin pages to 400+ words of real, useful content — put the direct answer to the page's main question in the first 2–3 sentences.",
    });
    const imgs = html.match(/<img[^>]*>/gi) || [];
    const noAlt = imgs.filter((t) => !/alt=["'][^"']+["']/i.test(t)).length;
    push({
      id: "alt", category: "Answer-First Content", name: "Images have alt text", weight: 6,
      status: imgs.length === 0 ? "pass" : noAlt === 0 ? "pass" : noAlt / imgs.length <= 0.2 ? "warn" : "fail",
      evidence: imgs.length ? `${noAlt} of ${imgs.length} images missing descriptive alt text.` : "No images found on homepage.",
      fix: noAlt === 0 ? "All images described." : `Add descriptive alt text to ${noAlt} image(s). Alt text is crawlable content AI engines can read.`,
    });
    const text = visibleText(html);
    const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
    const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
    push({
      id: "contact", category: "Answer-First Content", name: "Contact facts as real text", weight: 6,
      status: hasPhone || hasEmail ? "pass" : "fail",
      evidence: `phone number in text: ${hasPhone ? "yes" : "no"} | email in text: ${hasEmail ? "yes" : "no"}`,
      fix: hasPhone || hasEmail
        ? "Contact facts are machine-readable."
        : "Put your phone number and email as real HTML text (not inside images). AI cannot reliably read text baked into images.",
    });

    // ---------- 4. TRUST & TECH ----------
    push({
      id: "sitemap", category: "Trust & Tech", name: "sitemap.xml present", weight: 5,
      status: sitemap.ok ? "pass" : "warn",
      evidence: sitemap.ok ? `Found at ${origin}/sitemap.xml` : `Not found (HTTP ${sitemap.status || "error"}).`,
      fix: sitemap.ok ? "Sitemap exists." : "Publish /sitemap.xml and submit it in Google Search Console so crawlers discover all pages.",
    });
    const isHttps = target.startsWith("https://");
    push({
      id: "https", category: "Trust & Tech", name: "Served over HTTPS", weight: 5,
      status: isHttps ? "pass" : "fail",
      evidence: `Final URL: ${home.finalUrl.slice(0, 80)}`,
      fix: isHttps ? "Secure connection confirmed." : "Move the site to HTTPS — AI engines and browsers distrust plain HTTP.",
    });
    const lang = html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1];
    const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    push({
      id: "lang-viewport", category: "Trust & Tech", name: "Language + viewport declared", weight: 5,
      status: lang && viewport ? "pass" : lang || viewport ? "warn" : "fail",
      evidence: `html lang: ${lang || "MISSING"} | viewport meta: ${viewport ? "present" : "MISSING"}`,
      fix: lang && viewport ? "No action needed." : "Add lang to the <html> tag and a viewport meta tag — basic technical hygiene crawlers expect.",
    });
  } else {
    const msg = `Could not fetch the homepage (HTTP ${home.status || "network error"}). Content checks skipped.`;
    (["jsonld-org", "jsonld-faq", "title", "meta-desc", "canon-og", "h1", "wordcount", "alt", "contact"] as const).forEach((id) =>
      push({ id, category: "Content", name: id, weight: 0, status: "fail", evidence: msg, fix: "Make sure the site loads publicly without bot-blocking." })
    );
    push({ id: "sitemap", category: "Trust & Tech", name: "sitemap.xml present", weight: 5, status: sitemap.ok ? "pass" : "warn", evidence: sitemap.ok ? "Found." : "Not found.", fix: "Publish /sitemap.xml." });
    push({ id: "https", category: "Trust & Tech", name: "Served over HTTPS", weight: 5, status: target.startsWith("https://") ? "pass" : "fail", evidence: target, fix: "Use HTTPS." });
    push({ id: "lang-viewport", category: "Trust & Tech", name: "Language + viewport declared", weight: 5, status: "warn", evidence: "Page unreachable — could not verify.", fix: "Verify once the page loads." });
  }

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);
  const tier = score >= 90 ? "AI-Ready" : score >= 70 ? "Strong — almost there" : score >= 40 ? "Partially visible" : "Invisible to AI";

  return Response.json({
    url: target, origin, score, tier, totalWeight,
    fetchedAt: new Date().toISOString(),
    checks: checks.sort((a, b) => b.weight * (b.status === "fail" ? 1 : b.status === "warn" ? 0.5 : 0) - a.weight * (a.status === "fail" ? 1 : a.status === "warn" ? 0.5 : 0)),
  });
}
