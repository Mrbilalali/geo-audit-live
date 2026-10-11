"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

const STOP = new Set(
  ("a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,don,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,them,his,her,its,our,their,this,that,these,those,am,an,as,of,s,ve,re,ll,d,m,t,your,my,me,him,us,what,which,who,whom,where,why,how,because,until,while,between,among,per,via,also,may,might,must,shall,let,like,get,got,one,two,three,many,much,well,even,back,still,however,therefore,thus,hence,although,though,since,despite,toward,towards,within,without,along,across,behind,beyond,plus,except,amongst,every,either,neither,rather,quite,almost,enough,upon,everyone,everything,someone,something,anyone,anything,nothing,none")
    .split(",")
);

interface Gram { text: string; count: number; pct: number; }

function analyze(text: string, n: number, useStop: boolean): { grams: Gram[]; total: number } {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length >= 2 && (!useStop || !STOP.has(w)));
  const counts = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n).join(" ");
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  const grams = [...counts.entries()]
    .map(([text_, count]) => ({ text: text_, count, pct: (count / Math.max(1, words.length)) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);
  return { grams, total: words.length };
}

export default function NgramAnalyzer() {
  const [text, setText] = useState("");
  const [n, setN] = useState(2);
  const [useStop, setUseStop] = useState(true);
  const [res, setRes] = useState<{ grams: Gram[]; total: number } | null>(null);

  function run() {
    if (text.trim().length < 20) return;
    setRes(analyze(text, n, useStop));
  }

  const label = n === 1 ? "words" : n === 2 ? "2-word phrases" : "3-word phrases";

  return (
    <Gate tool="ngram-analyzer" name="N-gram Analyzer">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">NLP pack</div>
          <h1>N-gram <span className="g">Analyzer</span></h1>
          <p>Find the exact words and phrases your content repeats — the raw material of topical relevance.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Text to analyze</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste article text…" style={{ minHeight: 150 }} />
          </div>
          <div className="tabs">
            {[1, 2, 3].map((v) => (
              <button key={v} className={"tab" + (n === v ? " on" : "")} onClick={() => setN(v)}>
                {v === 1 ? "Single words" : v === 2 ? "2-word phrases" : "3-word phrases"}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--muted)", margin: "12px 0 16px" }}>
            <input type="checkbox" checked={useStop} onChange={(e) => setUseStop(e.target.checked)} />
            Remove stopwords (the, and, of…)
          </label>
          <button className="btn" onClick={run} disabled={text.trim().length < 20}>Analyze →</button>
        </div>

        {res && (
          <div className="card">
            <h2 style={{ fontSize: 19, marginBottom: 4 }}>
              Top {label} <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 400 }}>· {res.total} words analyzed</span>
            </h2>
            {res.grams.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Nothing to show — try longer text.</p>
            ) : (
              <table className="tracktable">
                <thead><tr><th>#</th><th>Phrase</th><th className="c">Count</th><th className="c">Density</th></tr></thead>
                <tbody>
                  {res.grams.map((g, i) => (
                    <tr key={i}>
                      <td className="c" style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{g.text}</td>
                      <td className="c">{g.count}</td>
                      <td className="c">{g.pct.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
