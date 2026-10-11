"use client";

import Gate from "../../components/Gate";
import { useState } from "react";
import { getApiKey } from "../../lib/keys";
import ApiRequired from "../../components/ApiRequired";

interface Metrics {
  keywords: number;
  traffic: number;
  trafficCost: number;
  backlinks: number;
  refDomains: number;
  pos: { label: string; v: number }[];
}

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
  : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
  : String(Math.round(n));

export default function TrafficOverview() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [m, setM] = useState<Metrics | null>(null);
  const [noCreds, setNoCreds] = useState(false);

  async function run() {
    const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d || loading) return;
    const login = getApiKey("dataforseo_login");
    const password = getApiKey("dataforseo_password");
    if (!login || !password) { setNoCreds(true); return; }
    setNoCreds(false);
    setLoading(true); setError(""); setM(null);
    try {
      const r = await fetch("/api/dfs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login, password,
          endpoint: "domain_rank_overview",
          payload: [{ target: d, location_code: 2840, language_code: "en" }],
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.error === "NO_CREDS") { setNoCreds(true); return; }
        throw new Error(data.detail || "DataForSEO request failed.");
      }
      const res = data?.tasks?.[0]?.result?.[0];
      if (!res) throw new Error("No data returned for this domain.");
      const o = res.metrics?.organic || {};
      const b = res.metrics?.backlinks_info || {};
      const pos = [
        { label: "Top 3", v: o.pos_1 || 0 },
        { label: "4–10", v: o.pos_4_10 || 0 },
        { label: "11–20", v: o.pos_11_20 || 0 },
        { label: "21–30", v: o.pos_21_30 || 0 },
        { label: "31–100", v: (o.pos_31_40 || 0) + (o.pos_41_50 || 0) + (o.pos_51_60 || 0) + (o.pos_61_100 || 0) },
      ];
      setM({
        keywords: o.count || 0,
        traffic: o.etv || 0,
        trafficCost: o.estimated_paid_traffic_cost || 0,
        backlinks: b.backlinks || 0,
        refDomains: b.referring_domains || 0,
        pos,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  const maxPos = Math.max(1, ...(m?.pos.map((p) => p.v) || [1]));

  return (
    <Gate tool="traffic-overview" name="Traffic Overview">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">Keyword research</div>
          <h1>Traffic <span className="g">Overview</span></h1>
          <p>Real organic traffic, keyword & backlink data for any domain — powered by your DataForSEO credentials.</p>
        </div>

        <div className="card no-print">
          <div className="urlrow" style={{ marginTop: 0 }}>
            <input value={domain} onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()} placeholder="example.com" aria-label="Domain" />
            <button className="btn" onClick={run} disabled={loading}>
              {loading ? <><span className="spin" />Loading…</> : "Analyze →"}
            </button>
          </div>
          {error && <p className="err">{error} (Tip: check your DataForSEO balance & credentials.)</p>}
        </div>

        {noCreds && (
          <ApiRequired apiName="DataForSEO API Login + Password">
            Traffic data comes from DataForSEO (pay-per-request). Add your API login &amp; password in Settings —
            they stay in your browser and are only sent to DataForSEO with your requests.
          </ApiRequired>
        )}

        {m && (
          <>
            <div className="statgrid">
              {[
                { k: "Organic keywords", v: fmt(m.keywords), s: "ranking in Google US" },
                { k: "Est. monthly traffic", v: fmt(m.traffic), s: "visits / month" },
                { k: "Traffic value", v: "$" + fmt(m.trafficCost), s: "est. ad cost / month" },
                { k: "Backlinks", v: fmt(m.backlinks), s: `from ${fmt(m.refDomains)} domains` },
              ].map((s, i) => (
                <div className="stat" key={i}>
                  <div className="k">{s.k}</div>
                  <div className="v">{s.v}</div>
                  <div className="s">{s.s}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>Ranking positions</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>Where this domain's keywords rank</p>
              {m.pos.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ width: 70, fontSize: 13.5, color: "var(--muted)" }}>{p.label}</span>
                  <div className="meter" style={{ flex: 1, marginTop: 0 }}>
                    <span style={{ width: `${(p.v / maxPos) * 100}%` }} />
                  </div>
                  <b style={{ width: 70, textAlign: "right", fontSize: 14 }}>{fmt(p.v)}</b>
                </div>
              ))}
            </div>
          </>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
