"use client";

import Gate from "../../components/Gate";
import ApiRequired from "../../components/ApiRequired";
import { useState } from "react";
import { getApiKey } from "../../lib/keys";
import {
  MozData, SemrushData, PageSpeedData,
  getMozCreds, getSemrushKey, mozMetrics, semrushOverview, pageSpeed,
} from "../../lib/seo";

const fmt = (n: number | null) =>
  n === null || n === undefined ? "—"
  : n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
  : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
  : String(Math.round(n));

function ScoreRing({ v }: { v: number | null }) {
  const c = v === null ? "#33475f" : v >= 80 ? "#3ecf8e" : v >= 50 ? "#38bdf8" : "#f0524d";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 56, height: 56, borderRadius: "50%",
      border: `5px solid ${c}`, color: v === null ? "var(--muted)" : c,
      fontWeight: 800, fontSize: 16,
    }}>
      {v === null ? "—" : v}
    </span>
  );
}

export default function DomainIntel() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [moz, setMoz] = useState<MozData | null>(null);
  const [sem, setSem] = useState<SemrushData | null>(null);
  const [psm, setPsm] = useState<PageSpeedData | null>(null);
  const [psd, setPsd] = useState<PageSpeedData | null>(null);
  const [dfs, setDfs] = useState<{ keywords: number; traffic: number; refDomains: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasMoz = !!getMozCreds();
  const hasSem = !!getSemrushKey();
  const hasDfs = !!(getApiKey("dataforseo_login") && getApiKey("dataforseo_password"));

  async function run() {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || loading) return;
    setLoading(true); setRan(true);
    setMoz(null); setSem(null); setPsm(null); setPsd(null); setDfs(null);
    setErrors({});
    const err = (k: string, e: unknown) =>
      setErrors((p) => ({ ...p, [k]: e instanceof Error ? e.message : "Failed." }));

    const jobs: Promise<void>[] = [];
    if (hasMoz) jobs.push(mozMetrics(d).then(setMoz).catch((e) => err("moz", e)));
    if (hasSem) jobs.push(semrushOverview(d).then(setSem).catch((e) => err("semrush", e)));
    jobs.push(pageSpeed("https://" + d, "mobile").then(setPsm).catch((e) => err("pagespeed", e)));
    jobs.push(pageSpeed("https://" + d, "desktop").then(setPsd).catch((e) => err("pagespeed", e)));
    if (hasDfs) {
      jobs.push((async () => {
        try {
          const r = await fetch("/api/dfs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              login: getApiKey("dataforseo_login"), password: getApiKey("dataforseo_password"),
              endpoint: "domain_rank_overview",
              payload: [{ target: d, location_code: 2840, language_code: "en" }],
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.detail || "DataForSEO failed.");
          const res = data?.tasks?.[0]?.result?.[0];
          const o = res?.metrics?.organic || {};
          setDfs({ keywords: o.count || 0, traffic: o.etv || 0, refDomains: res?.metrics?.backlinks_info?.referring_domains || 0 });
        } catch (e) { err("dfs", e); }
      })());
    }
    await Promise.all(jobs);
    setLoading(false);
  }

  const card = (title: string, sub: string, body: React.ReactNode) => (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
      <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 14px" }}>{sub}</p>
      {body}
    </div>
  );

  const stat = (k: string, v: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <b>{v}</b>
    </div>
  );

  return (
    <Gate tool="domain-intel" name="Domain Intel">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">🔎 Search Data</div>
          <h1>Domain <span className="g">Intel</span></h1>
          <p>Every SEO tool's data on one screen — Moz, Semrush, PageSpeed & DataForSEO, via your own API keys.</p>
        </div>

        <div className="card no-print">
          <div className="urlrow" style={{ marginTop: 0 }}>
            <input value={domain} onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()} placeholder="example.com" aria-label="Domain" />
            <button className="btn" onClick={run} disabled={loading || domain.trim().length < 4}>
              {loading ? <><span className="spin" />Gathering…</> : "Analyze →"}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 8 }}>
            Moz free tier allows ~1 request per 10 seconds.
          </p>
        </div>

        {ran && (
          <div className="dashcols">
            {card("🟣 Moz", "Authority & link metrics",
              !hasMoz ? <ApiRequired apiName="Moz API Access ID + Secret Key">Domain Authority & Page Authority need your Moz API credentials (free tier at moz.com).<br />Add them in Settings.</ApiRequired>
              : errors.moz ? <p className="err">{errors.moz}</p>
              : !moz ? <p style={{ color: "var(--muted)" }}><span className="spin" /> Loading…</p>
              : <>
                  <div style={{ display: "flex", gap: 18, marginBottom: 8 }}>
                    <div style={{ textAlign: "center" }}><ScoreRing v={moz.domain_authority} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Domain Auth.</div></div>
                    <div style={{ textAlign: "center" }}><ScoreRing v={moz.page_authority} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Page Auth.</div></div>
                  </div>
                  {stat("Linking domains", fmt(moz.linking_domains))}
                  {stat("Total links", fmt(moz.total_links))}
                  {moz.spam_score !== null && stat("Spam score", `${moz.spam_score}%`)}
                </>
            )}

            {card("🟠 Semrush", "Organic visibility (US)",
              !hasSem ? <ApiRequired apiName="Semrush API Key">Organic keywords & traffic need your Semrush API key (requires a Semrush plan with API units).<br />Add it in Settings.</ApiRequired>
              : errors.semrush ? <p className="err">{errors.semrush}</p>
              : !sem ? <p style={{ color: "var(--muted)" }}><span className="spin" /> Loading…</p>
              : <>
                  {stat("Semrush rank", sem.rank !== null ? "#" + fmt(sem.rank) : "—")}
                  {stat("Organic keywords", fmt(sem.organic_keywords))}
                  {stat("Organic traffic", fmt(sem.organic_traffic) + "/mo")}
                  {stat("Traffic cost", sem.organic_cost !== null ? "$" + fmt(sem.organic_cost) : "—")}
                </>
            )}
          </div>
        )}

        {ran && (
          <div className="dashcols">
            {card("⚡ PageSpeed", "Google Core Web Vitals — free, no key needed",
              errors.pagespeed ? <p className="err">{errors.pagespeed}</p>
              : !psm || !psd ? <p style={{ color: "var(--muted)" }}><span className="spin" /> Loading…</p>
              : <>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
                    <div style={{ textAlign: "center" }}><ScoreRing v={psm.performance} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Mobile perf.</div></div>
                    <div style={{ textAlign: "center" }}><ScoreRing v={psd.performance} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Desktop perf.</div></div>
                    <div style={{ textAlign: "center" }}><ScoreRing v={psm.seo} /><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>SEO</div></div>
                  </div>
                  {stat("Mobile accessibility", psm.accessibility !== null ? psm.accessibility + "/100" : "—")}
                  {stat("Best practices", psm.best_practices !== null ? psm.best_practices + "/100" : "—")}
                </>
            )}

            {card("🔵 DataForSEO", "Organic & backlink overview",
              !hasDfs ? <ApiRequired apiName="DataForSEO API Login + Password">Add your DataForSEO credentials in Settings.</ApiRequired>
              : errors.dfs ? <p className="err">{errors.dfs}</p>
              : !dfs ? <p style={{ color: "var(--muted)" }}><span className="spin" /> Loading…</p>
              : <>
                  {stat("Organic keywords", fmt(dfs.keywords))}
                  {stat("Est. traffic", fmt(dfs.traffic) + "/mo")}
                  {stat("Referring domains", fmt(dfs.refDomains))}
                </>
            )}
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
