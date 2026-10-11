"use client";

import Gate from "../../components/Gate";

import { useState } from "react";

interface H { level: number; text: string; }

function extractHeadings(html: string): H[] {
  const out: H[] = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    out.push({ level: +m[1], text });
  }
  return out;
}

export default function HeadingAnalyzer() {
  const [html, setHtml] = useState("");
  const [done, setDone] = useState(false);
  const heads = done ? extractHeadings(html) : [];

  const h1s = heads.filter((h) => h.level === 1);
  const empty = heads.filter((h) => !h.text);
  const long = heads.filter((h) => h.text.length > 70);
  const skipped: number[] = [];
  heads.forEach((h, i) => { if (i > 0 && h.level > heads[i - 1].level + 1) skipped.push(i); });

  const issues: { ok: boolean; warn?: boolean; t: string; d: string }[] = done ? [
    { ok: h1s.length === 1, t: `Exactly one H1 (${h1s.length} found)`, d: h1s.length === 1 ? "One clear main heading — correct." : h1s.length === 0 ? "No H1 at all. Add one containing the page's main topic." : "Multiple H1s confuse crawlers about the page's topic. Keep one; demote the rest to H2." },
    { ok: skipped.length === 0, warn: true, t: `No skipped levels (${skipped.length} found)`, d: skipped.length === 0 ? "Heading hierarchy flows cleanly." : `Jumped levels at heading #${skipped.map((i) => i + 1).join(", ")} (e.g. H2 → H4). Nest sequentially: H1 → H2 → H3.` },
    { ok: empty.length === 0, t: `No empty headings (${empty.length} found)`, d: empty.length === 0 ? "All headings carry text." : "Empty headings are invisible to users but noise for crawlers — fill or remove them." },
    { ok: long.length === 0, warn: true, t: `Concise headings (${long.length} over 70 chars)`, d: long.length === 0 ? "Headings are scannable." : "Trim long headings under ~70 characters so they read well in outlines and AI citations." },
    { ok: heads.length >= 3, warn: true, t: `Enough structure (${heads.length} headings)`, d: heads.length >= 3 ? "Good section breakdown." : "Only a couple of headings — break long content into more H2/H3 sections so AI can quote precise parts." },
  ] : [];

  return (
    <Gate tool="heading-analyzer" name="Heading Analyzer">
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Structure check</div>
        <h1>Heading <span className="g">Analyzer</span></h1>
        <p>Paste a page&apos;s HTML — see its full H1–H6 outline and catch the hierarchy mistakes that confuse crawlers and AI engines.</p>
      </div>

      <div className="card">
        <div className="field">
          <label>Page HTML *</label>
          <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h1>…</h1><h2>…</h2>" style={{ minHeight: 160, fontFamily: "Consolas, monospace", fontSize: 13 }} />
        </div>
        <div className="center no-print">
          <button className="btn" onClick={() => { if (!/<h[1-6]/i.test(html)) { alert("No headings found in that HTML."); return; } setDone(true); }}>Analyze headings →</button>
        </div>
      </div>

      {done && (
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Outline ({heads.length} headings)</h2>
          <div style={{ marginBottom: 20 }}>
            {heads.map((h, i) => (
              <div key={i} style={{ padding: "7px 0 7px " + (h.level - 1) * 26 + "px", borderBottom: "1px solid rgba(212,175,55,.08)", fontSize: 14.5 }}>
                <span style={{ color: "var(--gold)", fontWeight: 700, marginRight: 10, fontSize: 12 }}>H{h.level}</span>
                <span style={{ color: h.text ? "var(--ink)" : "var(--red)" }}>{h.text || "(empty)"}</span>
              </div>
            ))}
          </div>
          <h2 className="cathead">Issues</h2>
          {issues.map((x, i) => (
            <div className="check" key={i}>
              <div className="hd"><span className={`dot ${x.ok ? "pass" : x.warn ? "warn" : "fail"}`} /><h3>{x.t}</h3>
                <span className={`st ${x.ok ? "pass" : x.warn ? "warn" : "fail"}`}>{x.ok ? "Pass" : x.warn ? "Warning" : "Fix"}</span></div>
              <div className="fix">{x.d}</div>
            </div>
          ))}
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
    </Gate>
  );
}
