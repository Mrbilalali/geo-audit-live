"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

export default function SitemapTools() {
  const [tab, setTab] = useState<"extract" | "generate">("extract");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<{ urls: string[]; count: number; source: string } | null>(null);
  const [genInput, setGenInput] = useState("");
  const [xml, setXml] = useState("");

  async function extract() {
    if (!url.trim() || loading) return;
    setLoading(true); setError(""); setFound(null);
    try {
      const r = await fetch(`/api/sitemap?url=${encodeURIComponent(url.trim())}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.tried ? `No sitemap found. Tried: ${d.tried.join(", ")}` : (d.error || "Failed"));
      setFound({ urls: d.urls, count: d.count, source: d.source });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  function generate() {
    const urls = [...new Set(
      genInput.split("\n").map((u) => u.trim()).filter((u) => /^https?:\/\/.+\..+/.test(u))
    )];
    if (urls.length === 0) { setXml(""); return; }
    const today = new Date().toISOString().slice(0, 10);
    const body = urls.map((u) =>
      `  <url>\n    <loc>${u.replace(/&/g, "&amp;")}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
    ).join("\n");
    setXml(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
  }

  function download(name: string, content: string, type: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Gate tool="sitemap-tools" name="Sitemap Tools">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">Technical SEO</div>
          <h1>Sitemap <span className="g">Tools</span></h1>
          <p>Extract every URL from any site's sitemap — or generate a valid sitemap.xml from a URL list.</p>
        </div>

        <div className="card no-print">
          <div className="tabs">
            <button className={"tab" + (tab === "extract" ? " on" : "")} onClick={() => setTab("extract")}>Extract sitemap</button>
            <button className={"tab" + (tab === "generate" ? " on" : "")} onClick={() => setTab("generate")}>Generate sitemap</button>
          </div>

          {tab === "extract" ? (
            <div className="urlrow" style={{ marginTop: 12 }}>
              <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && extract()} placeholder="https://example.com" aria-label="Website URL" />
              <button className="btn" onClick={extract} disabled={loading}>{loading ? "Fetching…" : "Extract →"}</button>
            </div>
          ) : (
            <>
              <div className="field" style={{ marginTop: 12 }}>
                <label>URLs — one per line</label>
                <textarea value={genInput} onChange={(e) => setGenInput(e.target.value)} placeholder={"https://example.com/\nhttps://example.com/about\nhttps://example.com/blog/post-1"} style={{ minHeight: 150 }} />
              </div>
              <button className="btn" onClick={generate} disabled={genInput.trim().length < 5}>Generate XML →</button>
            </>
          )}
          {error && <p className="err">{error}</p>}
        </div>

        {found && (
          <div className="card">
            <h2 style={{ fontSize: 19, marginBottom: 4 }}>{found.count} URLs found</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 12 }}>Source: <span className="ev" style={{ display: "inline-block", marginTop: 0 }}>{found.source}</span></p>
            <div className="outbox"><pre>{found.urls.slice(0, 200).join("\n")}{found.count > 200 ? `\n… and ${found.count - 200} more` : ""}</pre></div>
            <button className="btn ghost no-print" style={{ marginTop: 14 }} onClick={() => download("sitemap-urls.txt", found.urls.join("\n"), "text/plain")}>
              Download URL list
            </button>
          </div>
        )}

        {xml && (
          <div className="card">
            <h2 style={{ fontSize: 19, marginBottom: 8 }}>sitemap.xml ready</h2>
            <div className="outbox"><pre>{xml.slice(0, 3000)}{xml.length > 3000 ? "\n…" : ""}</pre></div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }} className="no-print">
              <button className="btn ghost" onClick={() => navigator.clipboard.writeText(xml)}>Copy XML</button>
              <button className="btn ghost" onClick={() => download("sitemap.xml", xml, "application/xml")}>Download sitemap.xml</button>
            </div>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
