"use client";

import { useMemo, useState } from "react";

function verdict(ok: boolean, warn: boolean): { t: string; cls: "pass" | "warn" | "fail" } {
  if (ok) return { t: "Good", cls: "pass" };
  if (warn) return { t: "Check", cls: "warn" };
  return { t: "Fix", cls: "fail" };
}

export default function SerpPreview() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [mobile, setMobile] = useState(false);

  const cleanUrl = useMemo(() => {
    const u = url.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "") || "yoursite.com/page";
    return u.length > 62 ? u.slice(0, 60) + "…" : u;
  }, [url]);

  const t = useMemo(() => {
    const len = title.trim().length;
    return { ...verdict(len >= 40 && len <= 60, len > 0 && len < 70), len, msg: len === 0 ? "Add a title tag." : len < 40 ? "A bit short — use 50–60 characters to own the snippet." : len <= 60 ? "Ideal length — won't get truncated." : len <= 70 ? "Slightly long — may truncate on desktop." : "Too long — Google will cut it off." };
  }, [title]);
  const d = useMemo(() => {
    const len = desc.trim().length;
    return { ...verdict(len >= 140 && len <= 160, len > 0 && len < 170), len, msg: len === 0 ? "Add a meta description." : len < 120 ? "Too short to sell the click — aim for 150–160." : len <= 160 ? "Ideal length." : "Will be truncated — trim to ~155 characters." };
  }, [desc]);
  const kw = useMemo(() => {
    const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const inDesc = words.filter((w) => desc.toLowerCase().includes(w));
    return { words, inDesc };
  }, [title, desc]);

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">SEO classic</div>
        <h1>SERP <span className="g">Preview</span></h1>
        <p>Type your title, URL and meta description — see exactly how Google will show your page, with length and keyword checks.</p>
      </div>

      <div className="card">
        <div className="field"><label>Title tag</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="60-Second AI Lead Response Systems | Mr Bilal Ali" /></div>
        <div className="field"><label>URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yoursite.com/services/ai-lead-response" /></div>
        <div className="field"><label>Meta description</label><textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="We build AI systems that answer every lead in 60 seconds…" style={{ minHeight: 80 }} /></div>
        <div className="tabs no-print">
          <button className={`tab${!mobile ? " on" : ""}`} onClick={() => setMobile(false)}>Desktop</button>
          <button className={`tab${mobile ? " on" : ""}`} onClick={() => setMobile(true)}>Mobile</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Google preview</h2>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: mobile ? 380 : 640, color: "#202124", fontFamily: "Arial, sans-serif" }}>
          <div style={{ fontSize: 12, color: "#202124", marginBottom: 4 }}>🌐 {cleanUrl}</div>
          <div style={{ fontSize: mobile ? 18 : 20, color: "#1a0dab", lineHeight: 1.3, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {title.trim() || "Your page title appears here"}
          </div>
          <div style={{ fontSize: 14, color: "#4d5156", lineHeight: 1.5 }}>
            {desc.trim() || "Your meta description appears here. Write something that earns the click."}
          </div>
        </div>

        <h2 className="cathead">Checks</h2>
        <div className="check"><div className="hd"><span className={`dot ${t.cls}`} /><h3>Title length — {t.len} chars</h3><span className={`st ${t.cls}`}>{t.t}</span></div><div className="fix">{t.msg}</div></div>
        <div className="check"><div className="hd"><span className={`dot ${d.cls}`} /><h3>Meta description — {d.len} chars</h3><span className={`st ${d.cls}`}>{d.t}</span></div><div className="fix">{d.msg}</div></div>
        <div className="check"><div className="hd"><span className={`dot ${kw.inDesc.length > 0 ? "pass" : "warn"}`} /><h3>Keyword consistency</h3><span className={`st ${kw.inDesc.length > 0 ? "pass" : "warn"}`}>{kw.inDesc.length > 0 ? "Aligned" : "Weak"}</span></div>
          <div className="fix">{kw.inDesc.length > 0 ? `Title keywords also in description: ${kw.inDesc.slice(0, 4).join(", ")}.` : "Repeat the title's main keyword once in the description — it bolds in results and lifts clicks."}</div></div>
      </div>

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
