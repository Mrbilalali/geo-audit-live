"use client";

import Gate from "../../components/Gate";
import { useState } from "react";
import { parseCsv } from "../../lib/csv";

interface Link { url: string; anchor: string; domain: string; follow: string; }

function findIdx(cols: string[], needles: string[]): number {
  return cols.findIndex((c) => needles.some((n) => c.includes(n)));
}

export default function BacklinkAnalyzer() {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState("");

  function handleText(text: string) {
    setError("");
    try {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("empty");
      const cols = rows[0].map((c) => c.toLowerCase().trim());
      const urlI = findIdx(cols, ["url", "link", "target", "page"]);
      if (urlI < 0) {
        setError("Couldn't find a URL/link column. Export links from Search Console (Links report), Ahrefs or Semrush as CSV.");
        setLinks(null);
        return;
      }
      const anchorI = findIdx(cols, ["anchor", "text"]);
      const domainI = findIdx(cols, ["domain", "site", "referring"]);
      const followI = findIdx(cols, ["follow", "rel", "type", "dofollow"]);
      const out: Link[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const url = (r[urlI] || "").trim();
        if (!url) continue;
        let domain = domainI >= 0 ? (r[domainI] || "").trim() : "";
        if (!domain) {
          try { domain = new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, ""); }
          catch { domain = "(unknown)"; }
        }
        out.push({
          url,
          anchor: anchorI >= 0 ? (r[anchorI] || "").trim() || "(no anchor)" : "(no anchor)",
          domain: domain.toLowerCase(),
          follow: followI >= 0 ? (r[followI] || "").toLowerCase().trim() : "",
        });
      }
      if (out.length === 0) throw new Error("empty");
      setLinks(out);
    } catch {
      setError("Couldn't parse that CSV. Make sure it has a header row with a URL/link column.");
      setLinks(null);
    }
  }

  function onFile(f: File | undefined) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => handleText(String(r.result || ""));
    r.readAsText(f);
  }

  const stats = links ? (() => {
    const domains = new Map<string, number>();
    const anchors = new Map<string, number>();
    const pages = new Map<string, number>();
    let follow = 0, nofollow = 0;
    for (const l of links) {
      domains.set(l.domain, (domains.get(l.domain) || 0) + 1);
      anchors.set(l.anchor, (anchors.get(l.anchor) || 0) + 1);
      pages.set(l.url, (pages.get(l.url) || 0) + 1);
      if (/nofollow|sponsored|ugc/.test(l.follow)) nofollow++;
      else if (/follow/.test(l.follow) || l.follow === "") follow++;
    }
    const top = <T,>(m: Map<string, number>, n: number): [string, number][] =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n) as [string, number][];
    return {
      total: links.length,
      domains: domains.size,
      anchors: top(anchors, 15),
      pages: top(pages, 10),
      topDomains: top(domains, 10),
      follow, nofollow,
    };
  })() : null;

  return (
    <Gate tool="backlink-analyzer" name="Backlink Analyzer">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">Off-page SEO</div>
          <h1>Backlink <span className="g">Analyzer</span></h1>
          <p>Upload a link export (Search Console, Ahrefs, Semrush CSV) → referring domains, anchors & top pages.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Upload backlinks CSV</label>
            <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])}
              style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, color: "var(--ink)", width: "100%" }} />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Search Console: Links → export. Or Ahrefs/Semrush backlink export. Data never leaves your browser.
          </p>
          {error && <p className="err">{error}</p>}
        </div>

        {stats && (
          <>
            <div className="statgrid">
              {[
                { k: "Total backlinks", v: String(stats.total), s: "links in file" },
                { k: "Referring domains", v: String(stats.domains), s: "unique websites" },
                { k: "Follow", v: String(stats.follow), s: "link equity passing" },
                { k: "Nofollow", v: String(stats.nofollow), s: "sponsored / ugc / nofollow" },
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
                <h2 style={{ fontSize: 18 }}>⚓ Top anchor texts</h2>
                <table className="tracktable">
                  <thead><tr><th>Anchor</th><th className="c">Links</th></tr></thead>
                  <tbody>
                    {stats.anchors.map(([a, n], i) => (
                      <tr key={i}><td>{a}</td><td className="c">{n}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{ marginTop: 0 }}>
                <h2 style={{ fontSize: 18 }}>🌐 Top referring domains</h2>
                <table className="tracktable">
                  <thead><tr><th>Domain</th><th className="c">Links</th></tr></thead>
                  <tbody>
                    {stats.topDomains.map(([d, n], i) => (
                      <tr key={i}><td style={{ fontSize: 13 }}>{d}</td><td className="c">{n}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: 18 }}>📄 Most linked pages</h2>
              <table className="tracktable">
                <thead><tr><th>Page</th><th className="c">Links</th></tr></thead>
                <tbody>
                  {stats.pages.map(([p, n], i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 13, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p}</td>
                      <td className="c">{n}</td>
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
