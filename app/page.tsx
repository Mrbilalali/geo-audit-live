"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuditRecord, getHistory } from "../lib/history";
import { getPlan } from "../lib/access";
import { BILLING } from "../lib/billing";

const TOOLS = [
  { href: "/geo-audit", label: "Live Audit", ico: "🔍", desc: "15 live checks of any website", chip: "#38bdf8", access: "limited" as const },
  { href: "/keyword-suggest", label: "Keyword Suggest", ico: "🔑", desc: "Live Google autocomplete ideas", chip: "#2dd4bf", access: "free" as const },
  { href: "/traffic-overview", label: "Traffic Overview", ico: "📈", desc: "Traffic, keywords & backlinks", chip: "#818cf8", access: "pro" as const },
  { href: "/gsc-analyzer", label: "GSC Analyzer", ico: "📊", desc: "Search Console CTR insights", chip: "#38bdf8", access: "pro" as const },
  { href: "/backlink-analyzer", label: "Backlink Analyzer", ico: "🔗", desc: "Referring domains & anchors", chip: "#2dd4bf", access: "pro" as const },
  { href: "/ai-command", label: "AI Command Center", ico: "🧠", desc: "One prompt → full website work", chip: "#818cf8", access: "pro" as const },
  { href: "/ai-assistant", label: "AI Assistant", ico: "💭", desc: "Muse-style SEO copilot", chip: "#2dd4bf", access: "pro" as const },
  { href: "/ai-images", label: "AI Images", ico: "🎨", desc: "DALL-E 3 image generation", chip: "#38bdf8", access: "pro" as const },
  { href: "/site-monitor", label: "Site Monitor", ico: "📡", desc: "Multi-site health dashboard", chip: "#2dd4bf", access: "pro" as const },
  { href: "/domain-intel", label: "Domain Intel", ico: "🎯", desc: "Moz + Semrush + PageSpeed", chip: "#f59e0b", access: "pro" as const },
  { href: "/crm", label: "Client CRM", ico: "👥", desc: "Clients, pipeline & follow-ups", chip: "#2dd4bf", access: "pro" as const },
  { href: "/ai-writer", label: "AI Writer", ico: "✍️", desc: "GEO-optimized articles", chip: "#38bdf8", access: "pro" as const },
  { href: "/wp-publisher", label: "WP Publisher", ico: "🚀", desc: "Publish to WordPress in 1 click", chip: "#2dd4bf", access: "pro" as const },
  { href: "/thumbnail-maker", label: "Thumbnail Maker", ico: "🖼️", desc: "Blog & YouTube thumbnails", chip: "#818cf8", access: "pro" as const },
  { href: "/content-optimizer", label: "Optimizer Pro", ico: "⚡", desc: "20-rule semantic content scoring", chip: "#818cf8", access: "pro" as const },
  { href: "/schema-generator", label: "Schema Kit", ico: "🧩", desc: "JSON-LD, robots.txt, llms.txt", chip: "#2dd4bf", access: "pro" as const },
  { href: "/content-checker", label: "Content Checker", ico: "📝", desc: "Answer-first GEO analysis", chip: "#38bdf8", access: "limited" as const },
  { href: "/entity-extractor", label: "Entity Extractor", ico: "🏷️", desc: "People, orgs & places in text", chip: "#818cf8", access: "pro" as const },
  { href: "/ngram-analyzer", label: "N-gram Analyzer", ico: "🔤", desc: "Top words & phrases, density", chip: "#2dd4bf", access: "pro" as const },
  { href: "/brief-builder", label: "Brief Builder", ico: "📋", desc: "Full SEO content briefs", chip: "#38bdf8", access: "pro" as const },
  { href: "/schema-validator", label: "Schema Validator", ico: "✅", desc: "Validate JSON-LD blocks", chip: "#2dd4bf", access: "pro" as const },
  { href: "/sitemap-tools", label: "Sitemap Tools", ico: "🗺️", desc: "Extract or generate sitemaps", chip: "#818cf8", access: "pro" as const },
  { href: "/bulk-meta", label: "Bulk Meta", ico: "📦", desc: "Titles & metas for 10 URLs", chip: "#38bdf8", access: "pro" as const },
  { href: "/serp-preview", label: "SERP Preview", ico: "🔎", desc: "Google snippet preview", chip: "#2dd4bf", access: "free" as const },
  { href: "/heading-analyzer", label: "Headings", ico: "📑", desc: "H1–H6 structure analysis", chip: "#818cf8", access: "pro" as const },
  { href: "/readability", label: "Readability", ico: "📖", desc: "Flesch score + keywords", chip: "#38bdf8", access: "free" as const },
  { href: "/robots-validator", label: "robots.txt", ico: "🤖", desc: "AI-bot allow/block verdicts", chip: "#2dd4bf", access: "pro" as const },
  { href: "/prompt-kit", label: "Prompt Kit", ico: "💬", desc: "30 AI-visibility prompts", chip: "#818cf8", access: "pro" as const },
];

function Gauge({ value }: { value: number | null }) {
  const v = value ?? 0;
  const C = 2 * Math.PI * 84;
  const color = value === null ? "#33475f" : v >= 80 ? "#3ecf8e" : v >= 55 ? "#38bdf8" : "#f0524d";
  return (
    <div className="ring" style={{ width: 168, height: 168 }}>
      <svg width="168" height="168" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(139,163,196,.15)" strokeWidth="16" />
        <circle cx="100" cy="100" r="84" fill="none" stroke={color} strokeWidth="16"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * v) / 100} />
      </svg>
      <div className="num">
        <b style={{ fontSize: 44, color: value === null ? "var(--muted)" : color }}>{value === null ? "—" : v}</b>
        <span>avg / 100</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [url, setUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    setHistory(getHistory());
    setPlan(getPlan());
  }, []);

  const mk = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; };
  const thisMonth = history.filter((h) => {
    const d = new Date(h.at);
    return `${d.getFullYear()}-${d.getMonth()}` === mk();
  });
  const avg = thisMonth.length
    ? Math.round(thisMonth.reduce((a, h) => a + h.score, 0) / thisMonth.length)
    : null;
  const unlocked = plan === "pro" ? 28 : 5;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function quickAudit() {
    const u = url.trim();
    if (!u) return;
    router.push(`/geo-audit?url=${encodeURIComponent(u)}`);
  }

  return (
    <div className="wrap" style={{ maxWidth: 1080 }}>
      {/* header */}
      <div className="dashhead">
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{today}</p>
          <h1>Welcome to <span style={{ color: "var(--accent)" }}>GEO Toolkit</span></h1>
          <p>Every tool you need to get cited by ChatGPT, Perplexity & Google AI.</p>
        </div>
        <Link href="/geo-audit" className="btn no-print" style={{ textDecoration: "none", marginTop: 0 }}>
          ▶ Run site audit
        </Link>
      </div>

      {/* quick audit */}
      <div className="card no-print">
        <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ Quick audit</div>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 4 }}>
          Paste any URL — get its AI-visibility score in seconds.
        </p>
        <div className="quickbar">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAudit()}
            placeholder="https://example.com"
            aria-label="Website URL"
          />
          <button className="btn" onClick={quickAudit}>Audit →</button>
        </div>
      </div>

      <div className="dashcols">
        {/* site health */}
        <div className="card" style={{ marginTop: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Site health</div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
            Based on your saved audits this month
          </p>
          <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <Gauge value={avg} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="metricrow">
                <span className="metricico">🔍</span>
                <div className="grow">
                  <div className="mk">Audits this month</div>
                  <div className="mv">{thisMonth.length}</div>
                  <div className="meter"><span style={{ width: `${Math.min(100, (thisMonth.length / 10) * 100)}%` }} /></div>
                </div>
              </div>
              <div className="metricrow">
                <span className="metricico">🧰</span>
                <div className="grow">
                  <div className="mk">Tools unlocked</div>
                  <div className="mv">{unlocked}<span className="dim" style={{ fontSize: 15, color: "var(--muted)" }}>/28</span></div>
                  <div className="meter"><span style={{ width: `${(unlocked / 28) * 100}%` }} /></div>
                </div>
              </div>
              <div className="metricrow">
                <span className="metricico">💎</span>
                <div className="grow">
                  <div className="mk">Plan</div>
                  <div className="mv" style={{ color: plan === "pro" ? "var(--accent)" : "var(--ink)" }}>
                    {plan === "pro" ? "Pro ⚡" : "Free"}
                  </div>
                  {plan === "free" && (
                    <Link href="/pricing" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700 }}>
                      Upgrade for $9/mo →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right column */}
        <div>
          <div className="card" style={{ marginTop: 0, background: "linear-gradient(160deg, rgba(56,189,248,.12), rgba(56,189,248,.02))" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              {plan === "pro" ? "⚡ Pro active" : "💎 Go Pro"}
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 14px" }}>
              {plan === "pro"
                ? "All 28 tools unlocked. New tools included as they ship."
                : `Unlock all 28 tools for $${BILLING.monthlyDeal}/mo — or $${BILLING.lifetimeDeal} lifetime (first ${BILLING.lifetimeSeats}).`}
            </p>
            {plan === "free" && (
              <Link href="/pricing" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "11px", fontSize: 14 }}>
                See pricing →
              </Link>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 15 }}>Recent audits</div>
            {history.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 10 }}>
                No audits yet. Run your first audit above ☝️
              </p>
            ) : (
              <table className="audittable">
                <tbody>
                  {history.slice(0, 5).map((h, i) => (
                    <tr key={i}>
                      <td>
                        <span className="scorebadge" style={{
                          color: h.score >= 80 ? "#3ecf8e" : h.score >= 55 ? "#38bdf8" : "#f0524d",
                          background: h.score >= 80 ? "rgba(62,207,142,.12)" : h.score >= 55 ? "rgba(56,189,248,.12)" : "rgba(240,82,77,.12)",
                        }}>{h.score}</span>
                      </td>
                      <td className="url" style={{ color: "var(--muted)" }}>{h.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="dashsec">Quick actions</div>
      <p>Jump straight into any tool.</p>
      <div className="qtiles">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="qtile">
            {t.access === "pro" && plan === "free" && <span className="qlock">🔒</span>}
            <span className="qi" style={{ background: `${t.chip}22` }}>{t.ico}</span>
            <span className="ql">{t.label}</span>
            <span className="qtag">{t.desc}</span>
          </Link>
        ))}
      </div>

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
