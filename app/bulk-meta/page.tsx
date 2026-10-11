"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

interface Row {
  url: string; status: number | null; title: string; titleLen: number;
  description: string; descLen: number; h1: string; error?: string;
}

const verdict = (len: number, lo: number, hi: number) =>
  len === 0 ? { c: "var(--red)", t: "missing" }
  : len < lo ? { c: "var(--amber)", t: "short" }
  : len > hi ? { c: "var(--amber)", t: "long" }
  : { c: "var(--green)", t: "good" };

export default function BulkMeta() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const urls = input.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, 10);
    if (urls.length === 0 || loading) return;
    setLoading(true); setError(""); setRows(null);
    try {
      const r = await fetch("/api/bulk-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setRows(d.rows);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!rows) return;
    const q = (s: string | number | null) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = ["URL,Status,Title,Title length,Description,Description length,H1,Error",
      ...rows.map((r) => [r.url, r.status, r.title, r.titleLen, r.description, r.descLen, r.h1, r.error || ""].map(q).join(",")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "bulk-meta.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Gate tool="bulk-meta" name="Bulk Meta Extractor">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">Technical SEO</div>
          <h1>Bulk Meta <span className="g">Extractor</span></h1>
          <p>Paste up to 10 URLs — get every title, meta description and H1 in one table, with length verdicts.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>URLs — one per line (max 10)</label>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={"https://example.com/\nhttps://example.com/about"} style={{ minHeight: 130 }} />
          </div>
          <button className="btn" onClick={run} disabled={loading || input.trim().length < 5}>
            {loading ? <><span className="spin" />Fetching…</> : "Extract meta →"}
          </button>
          {error && <p className="err">{error}</p>}
        </div>

        {rows && (
          <div className="card" style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 19 }}>{rows.length} pages analyzed</h2>
              <button className="btn ghost no-print" onClick={downloadCsv}>Download CSV</button>
            </div>
            <table className="tracktable" style={{ marginTop: 12, minWidth: 760 }}>
              <thead>
                <tr><th>URL</th><th className="c">Status</th><th>Title</th><th>Meta description</th><th>H1</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const tv = verdict(r.titleLen, 50, 60);
                  const dv = verdict(r.descLen, 120, 160);
                  return (
                    <tr key={i}>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}>{r.url}</td>
                      <td className="c">{r.error ? <span style={{ color: "var(--red)" }}>✗</span> : r.status}</td>
                      <td style={{ fontSize: 13 }}>
                        {r.error ? <span style={{ color: "var(--red)" }}>{r.error}</span> : <>
                          {r.title || <i style={{ color: "var(--muted)" }}>—</i>}{" "}
                          <span style={{ color: tv.c, fontWeight: 700 }}>({r.titleLen} · {tv.t})</span>
                        </>}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {r.description || <i style={{ color: "var(--muted)" }}>—</i>}{" "}
                        {r.description && <span style={{ color: dv.c, fontWeight: 700 }}>({r.descLen} · {dv.t})</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{r.h1 || <i style={{ color: "var(--muted)" }}>—</i>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="note">Title sweet spot: 50–60 chars. Meta description: 120–160 chars.</p>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
