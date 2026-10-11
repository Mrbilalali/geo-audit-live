"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

interface Issue { level: "error" | "warning"; msg: string; }
interface Block { index: number; type: string; issues: Issue[]; valid: boolean; raw: string; }

const REQUIRED: Record<string, string[]> = {
  Article: ["headline", "author", "datePublished"],
  NewsArticle: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  FAQPage: ["mainEntity"],
  Product: ["name"],
  LocalBusiness: ["name", "address"],
  Organization: ["name"],
  WebSite: ["name", "url"],
  WebPage: ["name"],
  BreadcrumbList: ["itemListElement"],
  HowTo: ["name", "step"],
  Recipe: ["name", "recipeIngredient"],
  Event: ["name", "startDate", "location"],
  JobPosting: ["title", "hiringOrganization", "datePosted"],
};

function getType(node: Record<string, unknown>): string {
  const t = node["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t) && typeof t[0] === "string") return t[0];
  return "";
}

function validateNode(node: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = [];
  const type = getType(node);
  if (!type) {
    issues.push({ level: "error", msg: `${path}: missing @type — search engines can't classify this block.` });
    return issues;
  }
  if (!node["@context"]) {
    issues.push({ level: "warning", msg: `${path}: missing @context (expected "https://schema.org").` });
  }
  for (const f of REQUIRED[type] || []) {
    if (node[f] === undefined || node[f] === null || node[f] === "") {
      issues.push({ level: "error", msg: `${path}: ${type} is missing required field "${f}".` });
    }
  }
  // nested checks
  if (type === "FAQPage" && Array.isArray(node.mainEntity)) {
    (node.mainEntity as Record<string, unknown>[]).forEach((q, i) => {
      if (getType(q) !== "Question") issues.push({ level: "error", msg: `${path}.mainEntity[${i}]: expected @type "Question".` });
      const acc = q.acceptedAnswer as Record<string, unknown> | undefined;
      if (!acc || getType(acc) !== "Answer" || !acc.text) {
        issues.push({ level: "error", msg: `${path}.mainEntity[${i}]: Question needs acceptedAnswer with text.` });
      }
    });
  }
  if (type === "BreadcrumbList" && Array.isArray(node.itemListElement)) {
    (node.itemListElement as Record<string, unknown>[]).forEach((it, i) => {
      if (!it.position || !it.name) {
        issues.push({ level: "warning", msg: `${path}.itemListElement[${i}]: breadcrumb items should have position and name.` });
      }
    });
  }
  if (type === "Product" && !node.offers && !node.review && !node.aggregateRating) {
    issues.push({ level: "warning", msg: `${path}: Product without offers/review/aggregateRating rarely earns rich results.` });
  }
  return issues;
}

function extractBlocks(html: string): { blocks: Block[]; error?: string } {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks: Block[] = [];
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(html))) {
    idx++;
    const raw = m[1].trim();
    try {
      const parsed: unknown = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      const issues: Issue[] = [];
      const types: string[] = [];
      for (const n of nodes) {
        if (typeof n !== "object" || n === null) {
          issues.push({ level: "error", msg: `Block ${idx}: not a JSON object.` });
          continue;
        }
        const rec = n as Record<string, unknown>;
        types.push(getType(rec) || "(no @type)");
        if (rec["@graph"] && Array.isArray(rec["@graph"])) {
          (rec["@graph"] as Record<string, unknown>[]).forEach((g, gi) => {
            types.push(getType(g) || "(no @type)");
            issues.push(...validateNode(g, `Block ${idx} @graph[${gi}]`));
          });
        } else {
          issues.push(...validateNode(rec, `Block ${idx}`));
        }
      }
      const errs = issues.filter((i) => i.level === "error").length;
      blocks.push({ index: idx, type: types.join(", "), issues, valid: errs === 0, raw: raw.slice(0, 200) });
    } catch {
      blocks.push({
        index: idx, type: "(invalid JSON)", valid: false, raw: raw.slice(0, 200),
        issues: [{ level: "error", msg: `Block ${idx}: JSON parse failed — check commas and quotes.` }],
      });
    }
  }
  return { blocks };
}

export default function SchemaValidator() {
  const [tab, setTab] = useState<"paste" | "url">("paste");
  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function validateHtml(source: string) {
    const { blocks: b } = extractBlocks(source);
    setBlocks(b);
  }

  async function runUrl() {
    if (!url.trim() || loading) return;
    setLoading(true); setError(""); setBlocks(null);
    try {
      const r = await fetch(`/api/fetch-html?url=${encodeURIComponent(url.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Fetch failed");
      validateHtml(d.html);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  const totalErr = blocks?.reduce((a, b) => a + b.issues.filter((i) => i.level === "error").length, 0) ?? 0;
  const totalWarn = blocks?.reduce((a, b) => a + b.issues.filter((i) => i.level === "warning").length, 0) ?? 0;

  return (
    <Gate tool="schema-validator" name="Schema Validator">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">Technical SEO</div>
          <h1>Schema <span className="g">Validator</span></h1>
          <p>Paste HTML or enter a URL — every JSON-LD block gets extracted and validated against Schema.org requirements.</p>
        </div>

        <div className="card no-print">
          <div className="tabs">
            <button className={"tab" + (tab === "paste" ? " on" : "")} onClick={() => setTab("paste")}>Paste HTML</button>
            <button className={"tab" + (tab === "url" ? " on" : "")} onClick={() => setTab("url")}>Fetch URL</button>
          </div>
          {tab === "paste" ? (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>HTML source</label>
                <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<html>…<script type=&quot;application/ld+json&quot;>…" style={{ minHeight: 150 }} />
              </div>
              <button className="btn" onClick={() => validateHtml(html)} disabled={html.trim().length < 10}>Validate →</button>
            </>
          ) : (
            <div className="urlrow" style={{ marginTop: 12 }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runUrl()} placeholder="https://example.com/page" aria-label="Page URL" />
              <button className="btn" onClick={runUrl} disabled={loading}>{loading ? "Fetching…" : "Fetch & validate →"}</button>
            </div>
          )}
          {error && <p className="err">{error}</p>}
        </div>

        {blocks && (
          <div className="card">
            <h2 style={{ fontSize: 19, marginBottom: 4 }}>
              {blocks.length === 0 ? "No JSON-LD found" : `${blocks.length} schema block${blocks.length > 1 ? "s" : ""} checked`}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}>
              {blocks.length === 0
                ? "This page has no application/ld+json blocks. Add schema to become eligible for rich results."
                : <><span style={{ color: "var(--red)", fontWeight: 700 }}>{totalErr} errors</span> · <span style={{ color: "var(--amber)", fontWeight: 700 }}>{totalWarn} warnings</span></>}
            </p>
            {blocks.map((b) => (
              <div className="check" key={b.index}>
                <div className="hd">
                  <span className={"dot " + (b.valid ? "pass" : "fail")} />
                  <h3>Block {b.index}: {b.type}</h3>
                  <span className={"st " + (b.valid ? "pass" : "fail")}>{b.valid ? "Valid" : "Invalid"}</span>
                </div>
                {b.issues.length > 0 ? (
                  <ul style={{ margin: "10px 0 0 26px", fontSize: 14 }}>
                    {b.issues.map((is, i) => (
                      <li key={i} style={{ color: is.level === "error" ? "var(--red)" : "var(--amber)", marginBottom: 6 }}>
                        <b>[{is.level}]</b> {is.msg}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="fix">All required fields present. 🎉</p>
                )}
              </div>
            ))}
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
