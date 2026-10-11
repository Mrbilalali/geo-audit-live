"use client";

import Gate from "../../components/Gate";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { saveAudit } from "../../lib/history";
import { recordUse } from "../../lib/access";

type Status = "pass" | "warn" | "fail";
interface Check {
  id: string; category: string; name: string; weight: number;
  status: Status; evidence: string; fix: string;
}
interface Result {
  url: string; origin: string; score: number; tier: string;
  fetchedAt: string; checks: Check[]; error?: string;
}

const TIER_COLOR: Record<string, string> = {
  "AI-Ready": "#3ecf8e",
  "Strong — almost there": "#38bdf8",
  "Partially visible": "#f5a623",
  "Invisible to AI": "#f0524d",
};

function AuditInner() {
  const sp = useSearchParams();
  const [url, setUrl] = useState(sp.get("url") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function run() {
    if (!url.trim() || loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch(`/api/audit?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
      saveAudit({ url: data.url, score: data.score, tier: data.tier, at: data.fetchedAt });
      recordUse("geo-audit");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Audit failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const cats = result ? [...new Set(result.checks.map((c) => c.category))] : [];
  const fails = result?.checks.filter((c) => c.status !== "pass") ?? [];

  return (
    <Gate tool="geo-audit" name="GEO Live Audit">
    <div className="wrap">
      <div className="pagehead no-print">
        <div className="badge">Live website check — no quiz</div>
        <h1>GEO Live Audit<br /><span className="g">Real AI Visibility Score</span></h1>
        <p>Enter any website URL. This tool fetches the site <b>live</b> and checks whether ChatGPT, Perplexity, Gemini &amp; Google AI Overviews can find — and cite — it.</p>
      </div>

      <div className="card no-print">
        <div className="urlrow">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. example.com"
            aria-label="Website URL"
          />
          <button className="btn" onClick={run} disabled={loading}>
            {loading ? (<><span className="spin" /> Auditing…</>) : "Run live audit →"}
          </button>
        </div>
        {error && <div className="err">{error}</div>}
        {loading && <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 12 }}>Fetching robots.txt, llms.txt, sitemap and homepage…</p>}
      </div>

      {result && (
        <>
          <div className="card">
            <div className="sitehead">
              <div className="u">{result.url}</div>
              <div className="ring" style={{ marginTop: 18 }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="84" fill="none" stroke="#13263f" strokeWidth="15" />
                  <circle cx="100" cy="100" r="84" fill="none" stroke="#38bdf8" strokeWidth="15"
                    strokeLinecap="round" strokeDasharray="528"
                    strokeDashoffset={528 - (528 * result.score) / 100}
                    style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                </svg>
                <div className="num"><b>{result.score}</b><span>/ 100</span></div>
              </div>
              <div className="tier" style={{ color: TIER_COLOR[result.tier] ?? "#38bdf8" }}>{result.tier}</div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                {fails.length} of {result.checks.length} checks need attention · checked{" "}
                {new Date(result.fetchedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {cats.map((cat) => {
            const list = result.checks.filter((c) => c.category === cat);
            const earned = list.reduce((s, c) => s + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
            const max = list.reduce((s, c) => s + c.weight, 0);
            return (
              <div key={cat}>
                <h2 className="cathead">{cat}<span className="pts">{Math.round(earned)}/{max} pts</span></h2>
                {list.map((c) => (
                  <div className="check" key={c.id}>
                    <div className="hd">
                      <span className={`dot ${c.status}`} />
                      <h3>{c.name}</h3>
                      <span className={`st ${c.status}`}>{c.status === "pass" ? "Pass" : c.status === "warn" ? "Warning" : "Failed"}</span>
                    </div>
                    <div className="ev">{c.evidence}</div>
                    {c.status !== "pass" && <div className="fix"><b>Fix:</b> {c.fix}</div>}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="center no-print" style={{ marginTop: 26 }}>
            <button className="btn" onClick={() => window.print()}>Download / print report</button>
          </div>

          <p className="note">
            How this works: the server fetches the site&apos;s robots.txt, llms.txt, sitemap.xml and homepage HTML
            live, then runs {result.checks.length} real checks against 2026 Generative Engine Optimization best practices.
            Nothing is guessed — every finding shows the evidence it was based on.
          </p>
        </>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
    </Gate>
  );
}

export default function GeoAudit() {
  return (
    <Suspense fallback={<div className="wrap"><div className="card center">Loading…</div></div>}>
      <AuditInner />
    </Suspense>
  );
}
