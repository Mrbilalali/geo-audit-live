"use client";

import Gate from "../../components/Gate";
import { useEffect, useState } from "react";
import { callAi, getAiCreds } from "../../lib/ai";
import { ensureAccessToken, gapi, getGoogleTokens } from "../../lib/google";

const SITES_LS = "gtk_sites";
const REPORTS_LS = "gtk_site_reports";

interface Fail { name: string; evidence: string; fix: string; weight: number; }
interface SiteReport { score: number; tier: string; fails: Fail[]; at: number; }
interface GscStat { clicks: number; impressions: number; }

function loadSites(): string[] {
  try {
    const raw = localStorage.getItem(SITES_LS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveSites(s: string[]): void {
  try { localStorage.setItem(SITES_LS, JSON.stringify(s)); } catch { /* noop */ }
}
function loadReports(): Record<string, SiteReport> {
  try {
    const raw = localStorage.getItem(REPORTS_LS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveReports(r: Record<string, SiteReport>): void {
  try { localStorage.setItem(REPORTS_LS, JSON.stringify(r)); } catch { /* noop */ }
}
function normUrl(u: string): string {
  let s = u.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}
function domainOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

export default function SiteMonitor() {
  const [sites, setSites] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, SiteReport>>({});
  const [gscStats, setGscStats] = useState<Record<string, GscStat>>({});
  const [single, setSingle] = useState("");
  const [bulk, setBulk] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkAll, setCheckAll] = useState(false);
  const [progress, setProgress] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [gscProps, setGscProps] = useState<string[]>([]);
  const [gscLoading, setGscLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    setSites(loadSites());
    setReports(loadReports());
    if (getGoogleTokens()) loadGscProps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadGscProps() {
    try {
      await ensureAccessToken();
      const d = await gapi<{ siteEntry?: { siteUrl: string }[] }>("webmasters/v3/sites");
      setGscProps((d.siteEntry || []).map((s) => s.siteUrl));
    } catch { /* silent */ }
  }

  function matchProp(url: string): string | null {
    const dom = domainOf(url);
    for (const p of gscProps) {
      const pd = domainOf(p.replace("sc-domain:", ""));
      if (pd === dom || p.includes(dom)) return p;
    }
    return null;
  }

  async function fetchGscStat(url: string): Promise<void> {
    const prop = matchProp(url);
    if (!prop) return;
    try {
      const end = new Date();
      const start = new Date(Date.now() - 27 * 86400000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const d = await gapi<{ rows?: { clicks: number; impressions: number }[] }>(
        `webmasters/v3/sites/${encodeURIComponent(prop)}/searchAnalytics/query`,
        { method: "POST", body: { startDate: iso(start), endDate: iso(end), rowLimit: 5000, dataState: "final" } }
      );
      const clicks = (d.rows || []).reduce((a, r) => a + (r.clicks || 0), 0);
      const impressions = (d.rows || []).reduce((a, r) => a + (r.impressions || 0), 0);
      setGscStats((s) => ({ ...s, [url]: { clicks, impressions } }));
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (gscProps.length === 0 || sites.length === 0) return;
    setGscLoading(true);
    Promise.all(sites.map((u) => fetchGscStat(u))).finally(() => setGscLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gscProps]);

  function addMany(urls: string[]) {
    const clean = urls.map(normUrl).filter((u, i, a) => u.length > 8 && a.indexOf(u) === i);
    if (clean.length === 0) return;
    const next = [...sites];
    for (const u of clean) if (!next.includes(u)) next.push(u);
    setSites(next); saveSites(next);
  }

  function removeSite(url: string) {
    const next = sites.filter((s) => s !== url);
    setSites(next); saveSites(next);
    if (selected === url) { setSelected(null); setAiPlan(""); }
  }

  async function checkSite(url: string): Promise<void> {
    setChecking(url);
    try {
      const r = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Audit failed");
      const fails: Fail[] = (d.checks || [])
        .filter((c: { status: string }) => c.status === "fail")
        .map((c: { name: string; evidence: string; fix: string; weight: number }) => ({
          name: c.name, evidence: c.evidence || "", fix: c.fix || "", weight: c.weight || 1,
        }))
        .sort((a: Fail, b: Fail) => b.weight - a.weight);
      const next = { ...loadReports(), [url]: { score: d.score, tier: d.tier, fails, at: Date.now() } };
      setReports(next); saveReports(next);
    } catch { /* silent — row keeps old data */ }
    finally { setChecking(null); }
  }

  async function checkAllSites() {
    if (checkAll || sites.length === 0) return;
    setCheckAll(true);
    for (let i = 0; i < sites.length; i++) {
      setProgress(`Checking ${i + 1} of ${sites.length}…`);
      await checkSite(sites[i]);
    }
    setProgress(""); setCheckAll(false);
  }

  async function genAiPlan(url: string) {
    const rep = reports[url];
    if (!rep || aiBusy) return;
    if (!getAiCreds()) { setAiPlan("NO_KEY"); return; }
    setAiBusy(true); setAiPlan("");
    try {
      const fails = rep.fails.slice(0, 8).map((f) => `- ${f.name}: ${f.evidence}`).join("\n");
      const text = await callAi([
        { role: "system", content: "You are an SEO/GEO consultant. Write a prioritized, concrete action plan. Short bullet steps, no fluff, no analogies. Each step: what to do + why it matters for AI-search visibility." },
        { role: "user", content: `Site: ${url}\nAI-visibility score: ${rep.score}/100 (${rep.tier})\nFailed checks:\n${fails}\n\nWrite the improvement plan.` },
      ], { max_tokens: 1500, temperature: 0.5 });
      setAiPlan(text || "Empty response.");
    } catch (e: unknown) {
      setAiPlan(e instanceof Error ? e.message : "Failed.");
    } finally {
      setAiBusy(false);
    }
  }

  const sel = selected ? reports[selected] : null;
  const ago = (at: number) => {
    const m = Math.floor((Date.now() - at) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Gate tool="site-monitor" name="Site Monitor">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">📡 Monitoring</div>
          <h1>Site <span className="g">Monitor</span></h1>
          <p>All your sites in one dashboard — health scores, Search Console data & what to fix next.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Add a site</label>
            <div className="urlrow" style={{ marginTop: 0 }}>
              <input value={single} onChange={(e) => setSingle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (addMany([single]), setSingle(""))}
                placeholder="https://example.com" aria-label="Site URL" />
              <button className="btn" onClick={() => { addMany([single]); setSingle(""); }}>+ Add</button>
              <button className="btn ghost" onClick={() => setShowBulk(!showBulk)}>Bulk add</button>
            </div>
          </div>
          {showBulk && (
            <div className="field">
              <label>Bulk add — one URL per line</label>
              <textarea value={bulk} onChange={(e) => setBulk(e.target.value)}
                placeholder={"https://site1.com\nhttps://site2.com\nhttps://site3.com"}
                style={{ minHeight: 90, fontFamily: "Consolas, monospace", fontSize: 13 }} />
              <button className="btn" style={{ marginTop: 10 }} onClick={() => { addMany(bulk.split("\n")); setBulk(""); setShowBulk(false); }}>
                Add all →
              </button>
            </div>
          )}
          {sites.length > 0 && (
            <button className="btn" onClick={checkAllSites} disabled={checkAll}>
              {checkAll ? <><span className="spin" />{progress}</> : `🔍 Check all ${sites.length} sites`}
            </button>
          )}
        </div>

        {sites.length === 0 ? (
          <div className="card center">
            <h2 style={{ fontSize: 19, marginBottom: 8 }}>📡 No sites yet</h2>
            <p style={{ color: "var(--muted)", fontSize: 14.5 }}>Add your first site above — then run a check to see its AI-visibility health.</p>
          </div>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="tracktable" style={{ minWidth: 720 }}>
              <thead><tr><th>Site</th><th className="c">Score</th><th className="c">Issues</th><th className="c">GSC 28d</th><th className="c">Checked</th><th></th></tr></thead>
              <tbody>
                {sites.map((u) => {
                  const rep = reports[u];
                  const gs = gscStats[u];
                  return (
                    <tr key={u}>
                      <td style={{ fontWeight: 600, fontSize: 13.5, wordBreak: "break-all" }}>{domainOf(u)}</td>
                      <td className="c">
                        {rep ? (
                          <span className="scorebadge" style={{
                            color: rep.score >= 80 ? "#3ecf8e" : rep.score >= 55 ? "#38bdf8" : "#f0524d",
                            background: rep.score >= 80 ? "rgba(62,207,142,.12)" : rep.score >= 55 ? "rgba(56,189,248,.12)" : "rgba(240,82,77,.12)",
                          }}>{rep.score}</span>
                        ) : <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td className="c">{rep ? (rep.fails.length === 0 ? <span style={{ color: "var(--green)" }}>0 ✓</span> : <b style={{ color: "var(--amber)" }}>{rep.fails.length}</b>) : "—"}</td>
                      <td className="c" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                        {gs ? `${gs.clicks >= 1000 ? (gs.clicks / 1000).toFixed(1) + "K" : gs.clicks} clicks` : gscLoading ? "…" : "—"}
                      </td>
                      <td className="c" style={{ fontSize: 12.5, color: "var(--muted)" }}>{rep ? ago(rep.at) : "never"}</td>
                      <td className="c no-print" style={{ whiteSpace: "nowrap" }}>
                        {rep && <button className="tab" onClick={() => { setSelected(u); setAiPlan(""); }}>📋 Guide</button>}
                        <button className="tab" onClick={() => checkSite(u)} disabled={checking === u}>
                          {checking === u ? "…" : "↻"}
                        </button>
                        <button className="tab" onClick={() => removeSite(u)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!getGoogleTokens() && (
              <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>
                💡 Connect Google in <b>GSC Analyzer</b> to see live Search Console clicks per site here.
              </p>
            )}
          </div>
        )}

        {selected && sel && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <h2 style={{ fontSize: 19 }}>📋 Improvement guide — <span style={{ color: "var(--accent)" }}>{domainOf(selected)}</span></h2>
              <button className="tab no-print" onClick={() => { setSelected(null); setAiPlan(""); }}>Close ✕</button>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
              AI-visibility score <b style={{ color: "var(--ink)" }}>{sel.score}/100</b> ({sel.tier}) · {sel.fails.length} issues found · checked {ago(sel.at)}
            </p>
            {sel.fails.length === 0 ? (
              <p style={{ color: "var(--green)", fontWeight: 700 }}>🎉 Nothing to fix — this site passes all AI-visibility checks.</p>
            ) : (
              sel.fails.map((f, i) => (
                <div className="check" key={i}>
                  <div className="hd">
                    <span className="dot fail" />
                    <h3>{i + 1}. {f.name}</h3>
                  </div>
                  {f.evidence && <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0" }}>{f.evidence}</p>}
                  {f.fix && <p className="fix">→ {f.fix}</p>}
                </div>
              ))
            )}
            <div className="no-print" style={{ marginTop: 14 }}>
              <button className="btn ghost" onClick={() => genAiPlan(selected)} disabled={aiBusy}>
                {aiBusy ? <><span className="spin" />Writing plan…</> : "🤖 Generate AI action plan"}
              </button>
              {aiPlan === "NO_KEY" && <p className="err" style={{ marginTop: 10 }}>Add your OpenAI or DeepSeek key in Settings first.</p>}
              {aiPlan && aiPlan !== "NO_KEY" && (
                <div className="outbox" style={{ marginTop: 12, maxHeight: 360 }}>
                  <div style={{ padding: 18, fontSize: 14.5, whiteSpace: "pre-wrap" }}>{aiPlan}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
