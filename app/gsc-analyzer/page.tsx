"use client";

import Gate from "../../components/Gate";
import { useState } from "react";
import { parseCsv, parseGsc, GscRow } from "../../lib/csv";

const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
  : n >= 1_000 ? (n / 1_000).toFixed(1) + "K"
  : String(Math.round(n));

export default function GscAnalyzer() {
  const [rows, setRows] = useState<GscRow[] | null>(null);
  const [fname, setFname] = useState("");
  const [error, setError] = useState("");

  function handleText(text: string, name: string) {
    setError("");
    try {
      const parsed = parseGsc(parseCsv(text));
      if (parsed.length === 0) {
        setError("Couldn't find a Clicks/Impressions table. Export the Performance report from Google Search Console (Download button → CSV).");
        setRows(null);
        return;
      }
      setRows(parsed);
      setFname(name);
    } catch {
      setError("Couldn't parse that file. Make sure it's the CSV export from Search Console.");
      setRows(null);
    }
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => handleText(String(r.result || ""), f.name);
    r.readAsText(f);
  }

  const totals = rows ? {
    clicks: rows.reduce((a, r) => a + r.clicks, 0),
    impr: rows.reduce((a, r) => a + r.impressions, 0),
    avgPos: rows.reduce((a, r) => a + r.position * r.impressions, 0) / Math.max(1, rows.reduce((a, r) => a + r.impressions, 0)),
  } : null;
  const avgCtr = totals && totals.impr ? (totals.clicks / totals.impr) * 100 : 0;

  const top = rows ? [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 25) : [];
  const opportunities = rows
    ? rows.filter((r) => r.impressions >= 50 && r.position <= 20 && r.position > 0 && r.ctr < 3)
        .sort((a, b) => b.impressions - a.impressions).slice(0, 20)
    : [];
  const buckets = rows ? [
    { label: "Top 3", n: rows.filter((r) => r.position >= 1 && r.position <= 3).length },
    { label: "4–10", n: rows.filter((r) => r.position > 3 && r.position <= 10).length },
    { label: "11–20", n: rows.filter((r) => r.position > 10 && r.position <= 20).length },
    { label: "21+", n: rows.filter((r) => r.position > 20).length },
  ] : [];
  const maxBucket = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <Gate tool="gsc-analyzer" name="GSC Analyzer">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">Search Console</div>
          <h1>GSC <span className="g">Analyzer</span></h1>
          <p>Export your Search Console Performance report (CSV) → upload here → get CTR opportunities & position insights.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Upload GSC performance CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])}
              style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, color: "var(--ink)", width: "100%" }} />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            In Search Console: Performance → Export (download icon, top right) → upload that CSV here. Your data never leaves this browser.
          </p>
          {error && <p className="err">{error}</p>}
        </div>

        {rows && totals && (
          <>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>📄 {fname} · {rows.length} rows analyzed</p>
            <div className="statgrid">
              {[
                { k: "Total clicks", v: fmt(totals.clicks), s: "from Google Search" },
                { k: "Total impressions", v: fmt(totals.impr), s: "times shown" },
                { k: "Average CTR", v: avgCtr.toFixed(1) + "%", s: "clicks ÷ impressions" },
                { k: "Avg. position", v: totals.avgPos.toFixed(1), s: "impression-weighted" },
              ].map((s, i) => (
                <div className="stat" key={i}>
                  <div className="k">{s.k}</div>
                  <div className="v">{s.v}</div>
                  <div className="s">{s.s}</div>
                </div>
              ))}
            </div>

            <div className="dashcols">
              <div className="card" style={{ marginTop: 0 }}>
                <h2 style={{ fontSize: 18 }}>🎯 CTR opportunities</h2>
                <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
                  High impressions + page 1–2 + CTR under 3% → rewrite these titles & meta descriptions first.
                </p>
                {opportunities.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>No clear CTR opportunities in this export. 🎉</p>
                ) : (
                  <table className="tracktable">
                    <thead><tr><th>Query</th><th className="c">Impr.</th><th className="c">CTR</th><th className="c">Pos.</th></tr></thead>
                    <tbody>
                      {opportunities.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.label}</td>
                          <td className="c">{fmt(r.impressions)}</td>
                          <td className="c" style={{ color: "var(--amber)", fontWeight: 700 }}>{r.ctr.toFixed(1)}%</td>
                          <td className="c">{r.position.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card" style={{ marginTop: 0 }}>
                <h2 style={{ fontSize: 18 }}>Position spread</h2>
                <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>Queries per ranking bucket</p>
                {buckets.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ width: 60, fontSize: 13.5, color: "var(--muted)" }}>{b.label}</span>
                    <div className="meter" style={{ flex: 1, marginTop: 0 }}>
                      <span style={{ width: `${(b.n / maxBucket) * 100}%` }} />
                    </div>
                    <b style={{ width: 50, textAlign: "right", fontSize: 14 }}>{b.n}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ overflowX: "auto" }}>
              <h2 style={{ fontSize: 18 }}>Top queries by clicks</h2>
              <table className="tracktable" style={{ marginTop: 10, minWidth: 640 }}>
                <thead><tr><th>#</th><th>Query</th><th className="c">Clicks</th><th className="c">Impr.</th><th className="c">CTR</th><th className="c">Pos.</th></tr></thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={i}>
                      <td className="c" style={{ color: "var(--muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{r.label}</td>
                      <td className="c">{fmt(r.clicks)}</td>
                      <td className="c">{fmt(r.impressions)}</td>
                      <td className="c">{r.ctr.toFixed(1)}%</td>
                      <td className="c">{r.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
