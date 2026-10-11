"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuditRecord, clearHistory, getHistory } from "../lib/history";

const TOOLS = [
  {
    href: "/geo-audit", tag: "Live website check", name: "GEO Live Audit",
    desc: "Enter any URL — the server fetches the site live and scores whether ChatGPT, Perplexity, Gemini & Google AI Overviews can find and cite it. 15 real checks, evidence included.",
    cta: "Run an audit →",
  },
  {
    href: "/schema-generator", tag: "Code generator", name: "Schema & Meta Kit",
    desc: "Enter your business details once — get copy-paste Organization + FAQ JSON-LD, an AI-friendly robots.txt block, and an llms.txt template. The exact fixes the audit asks for.",
    cta: "Generate code →",
  },
  {
    href: "/content-checker", tag: "Content analysis", name: "Content GEO Checker",
    desc: "Paste any page's text — get an answer-first analysis: direct-answer opening, depth, question coverage, quotable numbers. Scored with concrete fixes.",
    cta: "Check my content →",
  },
  {
    href: "/prompt-kit", tag: "Tracking kit", name: "AI Prompt Tracker Kit",
    desc: "Generates 30 tailored test prompts your customers really ask — run them monthly in ChatGPT, Perplexity & Gemini to measure whether AI mentions you. Printable tracking sheet included.",
    cta: "Build my prompt list →",
  },
  {
    href: "/robots-validator", tag: "Validator", name: "robots.txt AI-Bot Validator",
    desc: "Paste any robots.txt — instantly see whether GPTBot, PerplexityBot, ClaudeBot & Google-Extended are allowed or silently blocked. Or fetch it live from a URL.",
    cta: "Validate robots.txt →",
  },
  {
    href: "/serp-preview", tag: "SEO classic", name: "SERP Preview",
    desc: "Type your title, URL and meta description — see exactly how Google will show your page on desktop and mobile, with length and keyword checks.",
    cta: "Preview my snippet →",
  },
  {
    href: "/heading-analyzer", tag: "Structure check", name: "Heading Analyzer",
    desc: "Paste a page's HTML — see its full H1–H6 outline and catch hierarchy mistakes (multiple H1s, skipped levels, empty headings) that confuse crawlers.",
    cta: "Analyze headings →",
  },
  {
    href: "/readability", tag: "Content metrics", name: "Readability & Keywords",
    desc: "Paste any text — Flesch reading score, grade level, top keywords and sentence stats. AI engines quote clear, focused content.",
    cta: "Analyze text →",
  },
];

export default function Dashboard() {
  const [history, setHistory] = useState<AuditRecord[]>([]);
  useEffect(() => { setHistory(getHistory()); }, []);

  return (
    <div className="wrap">
      <header className="center" style={{ padding: "40px 0 10px" }}>
        <div className="badge">100% SEO / GEO · 8 working tools</div>
        <h1 className="hero">
          Get cited by <span className="g">ChatGPT,</span>
          <br />
          <span className="g">Perplexity &amp; Google AI</span>
        </h1>
        <p className="sub">
          A complete Generative Engine Optimization toolkit. Audit your site, generate the fix code,
          check your content, and track your AI visibility month after month.
        </p>
      </header>

      <div className="toolgrid">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="toolcard">
            <span className="tooltag">{t.tag}</span>
            <h2>{t.name}</h2>
            <p>{t.desc}</p>
            <span className="toolcta">{t.cta}</span>
          </Link>
        ))}
      </div>

      {history.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 20 }}>Recent audits</h2>
            <button className="tab no-print" onClick={() => { clearHistory(); setHistory([]); }}>Clear</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {history.slice(0, 6).map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid rgba(212,175,55,.08)", fontSize: 14.5 }}>
                <span style={{ fontWeight: 800, color: h.score >= 80 ? "#3ecf8e" : h.score >= 55 ? "#d4af37" : "#f0524d", minWidth: 52 }}>{h.score}/100</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.url}</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{new Date(h.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>The GEO workflow</h2>
        <ol style={{ marginLeft: 20, color: "var(--muted)", fontSize: 15 }}>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Audit</b> — run the Live Audit on your site, get a real 0–100 AI-visibility score with evidence.</li>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Fix the code</b> — generate JSON-LD, robots.txt and llms.txt with the Schema Kit; validate robots.txt separately any time.</li>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Fix the content</b> — Content Checker, Headings, SERP Preview and Readability until every page is quotable.</li>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Measure</b> — build your 30-prompt list with the Prompt Kit and re-audit monthly. History is saved on this device.</li>
        </ol>
      </div>

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
