"use client";

import { useState } from "react";

const AI_BOTS = ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "CCBot"];

interface Group { agents: string[]; allows: string[]; disallows: string[]; }

function parseRobots(txt: string): Group[] {
  const groups: Group[] = [];
  let cur: Group | null = null;
  let seenRule = false;
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (seenRule || !cur) { cur = { agents: [], allows: [], disallows: [] }; groups.push(cur); seenRule = false; }
      cur.agents.push(value.toLowerCase());
    } else if (field === "allow" && cur) { cur.allows.push(value); seenRule = true; }
    else if (field === "disallow" && cur) { cur.disallows.push(value); seenRule = true; }
  }
  return groups;
}

export default function RobotsValidator() {
  const [txt, setTxt] = useState("");
  const [done, setDone] = useState(false);

  const groups = done ? parseRobots(txt) : [];
  const star = groups.find((g) => g.agents.includes("*"));
  const sitewide = !!star && star.disallows.some((d) => d === "/" || d === "/*");
  const sitemap = txt.split("\n").some((l) => l.trim().toLowerCase().startsWith("sitemap:"));

  function botStatus(bot: string): { label: string; cls: "pass" | "fail" | "warn"; detail: string } {
    const b = bot.toLowerCase();
    const own = groups.find((g) => g.agents.includes(b));
    const g = own || star;
    if (!g) return { label: "No rule", cls: "warn", detail: `No rules for ${bot} (or *). Default: allowed.` };
    const blocked = g.disallows.some((d) => d === "/" || d === "/*");
    const lines = [`User-agent: ${g.agents.join(", ")}`, ...g.disallows.map((d) => `Disallow: ${d === "" ? "(empty = allow all)" : d}`)].join("\n");
    return blocked
      ? { label: "BLOCKED", cls: "fail", detail: lines }
      : { label: "Allowed", cls: "pass", detail: lines };
  }

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Validator</div>
        <h1>robots.txt <span className="g">AI-Bot Validator</span></h1>
        <p>Paste any robots.txt — instantly see whether ChatGPT, Perplexity, Claude &amp; Google AI crawlers are allowed or silently blocked.</p>
      </div>

      <div className="card">
        <div className="field">
          <label>Paste robots.txt content *</label>
          <textarea value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"User-agent: *\nDisallow: /admin/\n\nUser-agent: GPTBot\nAllow: /"} style={{ minHeight: 180, fontFamily: "Consolas, monospace", fontSize: 13.5 }} />
        </div>
        <div className="center no-print" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => { if (!txt.trim()) { alert("Paste a robots.txt first."); return; } setDone(true); }}>Validate →</button>
          <button className="btn ghost" onClick={async () => {
            const u = prompt("Or fetch live from a domain (e.g. example.com):");
            if (!u) return;
            const dom = u.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
            try {
              const r = await fetch(`/api/audit?url=${encodeURIComponent(dom)}`);
              const d = await r.json();
              const chk = d.checks?.find((c: { id: string }) => c.id === "ai-bots");
              if (chk) { alert("Live result: " + chk.evidence.split("\n").slice(0, 8).join("\n")); }
            } catch { alert("Could not fetch. Paste the robots.txt manually."); }
          }}>Fetch live from URL</button>
        </div>
      </div>

      {done && (
        <div className="card">
          <div className="check" style={{ borderLeft: `4px solid ${sitewide ? "var(--red)" : "var(--green)"}` }}>
            <div className="hd"><span className={`dot ${sitewide ? "fail" : "pass"}`} />
              <h3>Site-wide crawl block</h3>
              <span className={`st ${sitewide ? "fail" : "pass"}`}>{sitewide ? "BLOCKED" : "Open"}</span></div>
            <div className="fix">{sitewide ? "A blanket Disallow: / blocks EVERYTHING including AI bots. Remove it unless the whole site must be hidden." : "No blanket block — crawlers can enter."}</div>
          </div>
          <div className="check" style={{ borderLeft: `4px solid ${sitemap ? "var(--green)" : "var(--amber)"}` }}>
            <div className="hd"><span className={`dot ${sitemap ? "pass" : "warn"}`} />
              <h3>Sitemap directive</h3>
              <span className={`st ${sitemap ? "pass" : "warn"}`}>{sitemap ? "Present" : "Missing"}</span></div>
            <div className="fix">{sitemap ? "Sitemap directive found in robots.txt." : "Add a 'Sitemap: https://yoursite.com/sitemap.xml' line so crawlers discover all pages."}</div>
          </div>
          <h2 className="cathead">AI crawler verdicts</h2>
          {AI_BOTS.map((b) => {
            const s = botStatus(b);
            return (
              <div className="check" key={b}>
                <div className="hd"><span className={`dot ${s.cls}`} /><h3>{b}</h3><span className={`st ${s.cls}`}>{s.label}</span></div>
                <div className="ev">{s.detail}</div>
                {s.cls === "fail" && <div className="fix"><b>Fix:</b> add an explicit group:<br /><span style={{ fontFamily: "monospace" }}>User-agent: {b}<br />Allow: /</span></div>}
              </div>
            );
          })}
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
