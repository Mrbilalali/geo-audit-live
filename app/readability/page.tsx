"use client";

import { useState } from "react";

const STOP = new Set(("a,an,the,and,or,but,if,then,else,when,while,of,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,them,his,her,its,our,their,this,that,these,those,as,also,may,might,must,shall,us,me,my,your,what,which,who,whom,how,why,where,because,until,between,among,per,via,within,without,within,across").split(","));

function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]e|ed|es)$/, "").replace(/^y/, "");
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export default function Readability() {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  let stats: { words: number; sentences: number; syl: number; fre: number; grade: number; avgSent: number; top: [string, number][] } | null = null;
  if (done) {
    const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
    const syl = words.reduce((s, w) => s + syllables(w), 0);
    const W = words.length || 1, S = sentences.length || 1;
    const fre = 206.835 - 1.015 * (W / S) - 84.6 * (syl / W);
    const grade = 0.39 * (W / S) + 11.8 * (syl / W) - 15.59;
    const freq = new Map<string, number>();
    words.forEach((w) => {
      const k = w.toLowerCase().replace(/[^a-z]/g, "");
      if (k.length >= 4 && !STOP.has(k)) freq.set(k, (freq.get(k) || 0) + 1);
    });
    const top = [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 15);
    stats = { words: W, sentences: S, syl, fre, grade, avgSent: W / S, top };
  }

  const level = stats ? (stats.fre >= 60 ? { t: "Easy to read", c: "pass" } : stats.fre >= 40 ? { t: "Fairly difficult", c: "warn" } : { t: "Hard to read", c: "fail" }) : null;

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Content metrics</div>
        <h1>Readability <span className="g">&amp; Keywords</span></h1>
        <p>Paste any text — get its Flesch reading score, grade level, top keywords and sentence stats. AI engines quote clear, focused content.</p>
      </div>

      <div className="card">
        <div className="field">
          <label>Text *</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste article or page text…" style={{ minHeight: 200 }} />
        </div>
        <div className="center no-print">
          <button className="btn" onClick={() => { if (text.trim().split(/\s+/).length < 50) { alert("Paste at least ~50 words."); return; } setDone(true); }}>Analyze →</button>
        </div>
      </div>

      {done && stats && level && (
        <div className="card">
          <div className="center" style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, letterSpacing: 2, color: "var(--muted)" }}>FLESCH READING EASE</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: level.c === "pass" ? "#3ecf8e" : level.c === "warn" ? "#f5a623" : "#f0524d" }}>{stats.fre.toFixed(0)}</div>
            <div style={{ fontWeight: 700 }}>{level.t} · Grade {Math.max(1, stats.grade).toFixed(1)} level</div>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 8, maxWidth: 520 }}>60+ is the sweet spot for web content. AI engines prefer quoting passages a broad audience can understand.</p>
          </div>
          <div className="check"><div className="hd"><span className="dot pass" /><h3>Text stats</h3></div>
            <div className="fix">{stats.words} words · {stats.sentences} sentences · {stats.avgSent.toFixed(1)} words/sentence · {(stats.syl / stats.words).toFixed(2)} syllables/word</div></div>
          <div className="check"><div className="hd"><span className={`dot ${stats.top.length >= 5 ? "pass" : "warn"}`} /><h3>Top keywords</h3><span className={`st ${stats.top.length >= 5 ? "pass" : "warn"}`}>{stats.top.length >= 5 ? "Focused" : "Thin"}</span></div>
            {stats.top.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {stats.top.map(([k, c]) => (
                  <span key={k} style={{ border: "1px solid var(--line)", borderRadius: 99, padding: "6px 14px", fontSize: 13.5 }}>
                    <b style={{ color: "var(--gold)" }}>{k}</b> <span style={{ color: "var(--muted)" }}>×{c}</span>
                  </span>
                ))}
              </div>
            ) : <div className="fix">No repeated keywords found — the text may lack a clear topical focus. Repeat the core term naturally 3–5 times.</div>}
            {stats.top.length > 0 && stats.top.length < 5 && <div className="fix">Only a few repeated terms — strengthen topical focus around 2–3 core keywords.</div>}
          </div>
          {stats.avgSent > 22 && <div className="check"><div className="hd"><span className="dot warn" /><h3>Long sentences</h3><span className="st warn">Warning</span></div><div className="fix">Average {stats.avgSent.toFixed(1)} words/sentence. Break the longest ones — short sentences get quoted verbatim by AI answers.</div></div>}
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
