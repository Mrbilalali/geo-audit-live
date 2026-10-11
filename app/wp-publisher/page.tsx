"use client";

import Gate from "../../components/Gate";
import Link from "next/link";
import ApiRequired from "../../components/ApiRequired";
import { useEffect, useState } from "react";
import { getWpCreds } from "../../lib/ai";
import { mdToWpHtml } from "../../lib/md";

interface WpPost { id: number; title: { rendered: string }; link: string; status: string; date: string; }

export default function WpPublisher() {
  const [creds, setCreds] = useState<{ site: string; user: string; appPassword: string } | null>(null);
  const [conn, setConn] = useState<"idle" | "ok" | "bad">("idle");
  const [connMsg, setConnMsg] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "publish">("draft");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ id: number; link: string; status: string } | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<WpPost[]>([]);

  useEffect(() => {
    const c = getWpCreds();
    setCreds(c);
    // prefill from AI Writer
    try {
      const raw = localStorage.getItem("geo-wp-draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(d.title);
        if (d.content) setContent(mdToWpHtml(d.content));
        localStorage.removeItem("geo-wp-draft");
      }
    } catch { /* noop */ }
    if (c) loadRecent(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function callWp(body: Record<string, unknown>) {
    const r = await fetch("/api/wp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || d.error || "WordPress request failed");
    return d;
  }

  async function testConnection() {
    if (!creds) return;
    setConn("idle"); setConnMsg("Testing…");
    try {
      const d = await callWp({ ...creds, action: "test" });
      setConn("ok"); setConnMsg(`Connected as ${d.name} ✓`);
    } catch (e: unknown) {
      setConn("bad"); setConnMsg(e instanceof Error ? e.message : "Failed.");
    }
  }

  async function loadRecent(c = creds) {
    if (!c) return;
    try {
      const d = await callWp({ ...c, action: "posts" });
      setRecent(d.posts || []);
    } catch { /* silent */ }
  }

  async function publish() {
    if (!creds || !title.trim() || !content.trim() || publishing) return;
    setPublishing(true); setError(""); setResult(null);
    try {
      const d = await callWp({ ...creds, action: "publish", title: title.trim(), content: content.trim(), status });
      setResult(d);
      loadRecent();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Gate tool="wp-publisher" name="WordPress Publisher">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>WordPress <span className="g">Publisher</span></h1>
          <p>Connect your site once — publish drafts or live posts from here in one click.</p>
        </div>

        {!creds ? (
          <ApiRequired apiName="WordPress Site + Application Password">
            Add your site URL, username and an <b>Application Password</b> in Settings
            (WP Dashboard → Users → Profile → Application Passwords). Credentials stay in your browser.
          </ApiRequired>
        ) : (
          <>
            <div className="card no-print">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <b>🌐 {creds.site}</b>
                  <div style={{ fontSize: 13, color: conn === "ok" ? "var(--green)" : conn === "bad" ? "var(--red)" : "var(--muted)" }}>
                    {connMsg || `User: ${creds.user}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn ghost" onClick={testConnection}>Test connection</button>
                  <Link href="/settings" className="btn ghost" style={{ textDecoration: "none" }}>Change</Link>
                </div>
              </div>
            </div>

            <div className="dashcols">
              <div className="card no-print" style={{ marginTop: 0 }}>
                <h2 style={{ fontSize: 18, marginBottom: 10 }}>New post</h2>
                <div className="field">
                  <label>Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
                </div>
                <div className="field">
                  <label>Content (HTML)</label>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="<h2>…</h2><p>…" style={{ minHeight: 220, fontFamily: "Consolas, monospace", fontSize: 13 }} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "publish")}>
                    <option value="draft">Draft (review in WordPress first)</option>
                    <option value="publish">Publish immediately</option>
                  </select>
                </div>
                <button className="btn" onClick={publish} disabled={publishing || !title.trim() || !content.trim()}>
                  {publishing ? <><span className="spin" />Publishing…</> : status === "draft" ? "Save as draft →" : "🚀 Publish live →"}
                </button>
                {error && <p className="err">{error}</p>}
                {result && (
                  <p style={{ marginTop: 12, color: "var(--green)", fontWeight: 700 }}>
                    ✓ {result.status === "publish" ? "Published" : "Draft saved"}!{" "}
                    <a href={result.link} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>View post →</a>
                  </p>
                )}
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>Recent posts</h2>
                {recent.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Nothing yet — publish your first post 👈</p>
                ) : (
                  recent.map((p) => (
                    <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
                      <a href={p.link} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}
                        dangerouslySetInnerHTML={{ __html: p.title.rendered }} />
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>
                        {p.status} · {new Date(p.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
