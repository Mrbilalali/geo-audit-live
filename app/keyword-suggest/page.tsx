"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

const QUESTION_STARTS = ["who", "what", "where", "when", "why", "how", "is", "are", "can", "does"];
const SUFFIX_IDEAS = ["for beginners", "for small business", "near me", "cost", "price", "vs", "alternatives", "review", "guide", "tutorial", "2026", "best practices", "mistakes", "benefits"];
const PREFIXES = ["best", "top", "cheap", "affordable", "free"];

async function suggest(q: string): Promise<string[]> {
  try {
    const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    return Array.isArray(d.suggestions) ? d.suggestions : [];
  } catch {
    return [];
  }
}

export default function KeywordSuggest() {
  const [tab, setTab] = useState<"auto" | "combine">("auto");
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<{ label: string; kws: string[] }[] | null>(null);
  const [combined, setCombined] = useState<string[] | null>(null);

  async function runAutocomplete() {
    const s = seed.trim().toLowerCase();
    if (!s || loading) return;
    setLoading(true); setGroups(null);
    const variants: { label: string; q: string }[] = [
      { label: `“${s}”`, q: s },
      ...QUESTION_STARTS.map((w) => ({ label: `Questions`, q: `${w} ${s}` })),
      ...["for", "vs", "with", "without"].map((w) => ({ label: "Modifiers", q: `${s} ${w}` })),
    ];
    const results = await Promise.all(variants.map((v) => suggest(v.q)));
    const seen = new Set<string>();
    const out: { label: string; kws: string[] }[] = [];
    const byLabel = new Map<string, string[]>();
    variants.forEach((v, i) => {
      const fresh = results[i].filter((k) => {
        const k_ = k.toLowerCase();
        if (seen.has(k_)) return false;
        seen.add(k_);
        return true;
      });
      if (fresh.length > 0) {
        if (!byLabel.has(v.label)) byLabel.set(v.label, []);
        byLabel.get(v.label)!.push(...fresh);
      }
    });
    for (const [label, kws] of byLabel) out.push({ label, kws });
    setGroups(out);
    setLoading(false);
  }

  function runCombine() {
    const s = seed.trim().toLowerCase();
    if (!s) return;
    const set_ = new Set<string>();
    for (const p of PREFIXES) set_.add(`${p} ${s}`);
    for (const suf of SUFFIX_IDEAS) set_.add(`${s} ${suf}`);
    for (const w of QUESTION_STARTS.slice(0, 6)) set_.add(`${w} ${s}`);
    for (const y of [2025, 2026]) set_.add(`${s} ${y}`);
    setCombined([...set_]);
  }

  const total = groups?.reduce((a, g) => a + g.kws.length, 0) ?? 0;

  function download(list: string[], name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([list.join("\n")], { type: "text/plain" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Gate tool="keyword-suggest" name="Keyword Suggest">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">Keyword research</div>
          <h1>Keyword <span className="g">Suggest</span></h1>
          <p>Real Google autocomplete data for any seed keyword — plus a long-tail combiner. No API key needed.</p>
        </div>

        <div className="card no-print">
          <div className="tabs">
            <button className={"tab" + (tab === "auto" ? " on" : "")} onClick={() => setTab("auto")}>🔍 Autocomplete</button>
            <button className={"tab" + (tab === "combine" ? " on" : "")} onClick={() => setTab("combine")}>🧩 Combiner</button>
          </div>
          <div className="urlrow" style={{ marginTop: 12 }}>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (tab === "auto" ? runAutocomplete() : runCombine())}
              placeholder="e.g. ai chatbots"
              aria-label="Seed keyword"
            />
            <button className="btn" onClick={tab === "auto" ? runAutocomplete : runCombine} disabled={loading || seed.trim().length < 2}>
              {loading ? <><span className="spin" />Fetching…</> : tab === "auto" ? "Get suggestions →" : "Combine →"}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
            Autocomplete pulls live suggestions from Google for your seed + question/modifier variants.
          </p>
        </div>

        {groups && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 19 }}>{total} keyword ideas</h2>
              <button className="btn ghost no-print" onClick={() => download(groups.flatMap((g) => g.kws), "keyword-ideas.txt")}>
                Download all
              </button>
            </div>
            {groups.length === 0 && <p style={{ color: "var(--muted)" }}>No suggestions returned — try a different seed.</p>}
            {groups.map((g, i) => (
              <div key={i} style={{ marginTop: 18 }}>
                <h3 style={{ fontSize: 14, color: "var(--accent)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{g.label} ({g.kws.length})</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {g.kws.map((k, j) => (
                    <span key={j} className="tooltag" style={{ marginBottom: 0, cursor: "pointer" }} title="Click to copy"
                      onClick={() => navigator.clipboard.writeText(k)}>{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {combined && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 19 }}>{combined.length} long-tail combinations</h2>
              <button className="btn ghost no-print" onClick={() => download(combined, "long-tail-keywords.txt")}>Download</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {combined.map((k, i) => (
                <span key={i} className="tooltag" style={{ marginBottom: 0, cursor: "pointer" }} title="Click to copy"
                  onClick={() => navigator.clipboard.writeText(k)}>{k}</span>
              ))}
            </div>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
