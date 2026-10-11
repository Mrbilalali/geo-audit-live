"use client";

import { useEffect, useState } from "react";
import { KEYS_LS } from "../../lib/keys";

const FIELDS = [
  { key: "dataforseo_login", label: "DataForSEO Login", hint: "For keyword data, SERP checks (dataforseo.com)", type: "text" },
  { key: "dataforseo_password", label: "DataForSEO Password", hint: "Pairs with the login above", type: "password" },
  { key: "openai_key", label: "OpenAI API Key", hint: "For AI-powered features (content AI, agents)", type: "password" },
  { key: "places_key", label: "Google Places API Key", hint: "For local lead & rank tools", type: "password" },
  { key: "deepseek_key", label: "DeepSeek API Key (optional)", hint: "Cheaper AI fallback", type: "password" },
  { key: "wp_url", label: "WordPress Site URL", hint: "e.g. https://mysite.com — for one-click publishing", type: "text" },
  { key: "wp_user", label: "WordPress Username", hint: "Your WP admin username", type: "text" },
  { key: "wp_app_password", label: "WordPress Application Password", hint: "WP Dashboard → Users → Profile → Application Passwords", type: "password" },
  { key: "google_client_id", label: "Google OAuth Client ID", hint: "Google Cloud Console → Credentials → OAuth client (for Search Console + Analytics connect)", type: "text" },
  { key: "google_client_secret", label: "Google OAuth Client Secret", hint: "Pairs with the client ID above", type: "password" },
] as const;

const LS_KEY = KEYS_LS;

export default function Settings() {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setVals(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(vals));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert("Could not save — browser storage unavailable."); }
  }

  function clear() {
    if (!confirm("Remove all saved API keys from this browser?")) return;
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
    setVals({});
  }

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">BYO API keys</div>
        <h1>API <span className="g">Settings</span></h1>
        <p>Paste your own API keys once — the data-powered tools use them directly. Keys stay in <b>your browser only</b>; they are never sent to our servers.</p>
      </div>

      <div className="card">
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={show[f.key] ? "text" : f.type}
                value={vals[f.key] || ""}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                placeholder={f.type === "password" ? "••••••••" : "your login"}
                style={{ flex: 1 }}
              />
              {f.type === "password" && (
                <button className="tab" onClick={() => setShow({ ...show, [f.key]: !show[f.key] })}>
                  {show[f.key] ? "Hide" : "Show"}
                </button>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{f.hint}</div>
          </div>
        ))}
        <div className="center no-print" style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
          <button className="btn" onClick={save}>{saved ? "Saved ✓" : "Save keys"}</button>
          <button className="btn ghost" onClick={clear}>Remove all</button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Where to get keys</h2>
        <ul style={{ marginLeft: 20, color: "var(--muted)", fontSize: 14.5 }}>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>DataForSEO</b> — dataforseo.com → sign up → top-up balance → use your API login &amp; password. Pays per request (SERP, keywords).</li>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>OpenAI</b> — platform.openai.com → API keys → create key. Pays per token for AI features.</li>
          <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Google Places</b> — Google Cloud Console → enable Places API → create key. For local tools.</li>
        </ul>
        <p className="note">Same model as the big SEO suites: you bring the keys, you pay the provider directly per use, the tools just do the work.</p>
      </div>

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
