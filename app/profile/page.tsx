"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchPlan, getLicense, signOut } from "../../lib/access";
import { getApiKey } from "../../lib/keys";
import { clearGoogleTokens, getGoogleTokens } from "../../lib/google";
import { getHistory } from "../../lib/history";

const CONNECTIONS = [
  { key: "openai_key", label: "OpenAI API Key", desc: "AI Writer, Assistant, Command Center, Images" },
  { key: "deepseek_key", label: "DeepSeek API Key", desc: "Cheaper AI fallback" },
  { key: "dataforseo_login", label: "DataForSEO", desc: "Traffic Overview keyword data", pair: "dataforseo_password" },
  { key: "wp_url", label: "WordPress", desc: "One-click publishing", pair: "wp_app_password" },
  { key: "google_client_id", label: "Google OAuth", desc: "Search Console + Analytics live data", pair: "google_client_secret" },
];

export default function Profile() {
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [tier, setTier] = useState("");
  const [keyMasked, setKeyMasked] = useState("");
  const [googleOn, setGoogleOn] = useState(false);
  const [audits, setAudits] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchPlan().then(setPlan);
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      if (s.tier) setTier(s.tier);
    }).catch(() => { /* noop */ });
    const lic = getLicense();
    if (lic) setKeyMasked("…" + lic.key.slice(-4));
    setGoogleOn(!!getGoogleTokens());
    try {
      const h = getHistory();
      const m = new Date();
      setAudits(h.filter((x) => {
        const d = new Date(x.at);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      }).length);
    } catch { /* noop */ }
  }, []);

  async function doSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  function disconnectGoogle() {
    clearGoogleTokens();
    setGoogleOn(false);
  }

  const connStatus = (c: { key: string; pair?: string }) => {
    if (c.key === "google_client_id") return !!getApiKey("google_client_id") && !!getApiKey("google_client_secret");
    if (c.pair) return !!getApiKey(c.key) && !!getApiKey(c.pair);
    return !!getApiKey(c.key);
  };

  return (
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="pagehead">
          <div className="badge">👤 Account</div>
          <h1>Your <span className="g">Profile</span></h1>
          <p>Plan, connections and usage — everything about your toolkit account.</p>
        </div>

        <div className="dashcols">
          <div className="card" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Plan</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 34 }}>{plan === "pro" ? "⚡" : "💎"}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{plan === "pro" ? `Pro${tier ? ` · ${tier}` : ""}` : "Free"}</div>
                {keyMasked && <div style={{ color: "var(--muted)", fontSize: 13 }}>License key {keyMasked}</div>}
              </div>
            </div>
            <div className="metricrow" style={{ marginTop: 12 }}>
              <span className="metricico">🔍</span>
              <div className="grow">
                <div className="mk">Audits this month</div>
                <div className="mv">{audits}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }} className="no-print">
              {plan === "pro" ? (
                <button className="btn ghost" onClick={doSignOut}>Sign out</button>
              ) : (
                <>
                  <Link href="/login" className="btn" style={{ textDecoration: "none" }}>Sign in →</Link>
                  <Link href="/pricing" className="btn ghost" style={{ textDecoration: "none" }}>Go Pro →</Link>
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 18 }}>Connections</h2>
              <Link href="/settings" className="tab" style={{ textDecoration: "none" }}>Edit in Settings →</Link>
            </div>
            {CONNECTIONS.map((c) => {
              const on = connStatus(c);
              return (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 18 }}>{on ? "✅" : "⬜"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.label}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12.5 }}>{c.desc}</div>
                  </div>
                  <span style={{ fontSize: 12.5, color: on ? "var(--green)" : "var(--muted)", fontWeight: 700 }}>
                    {on ? "Connected" : "Not set"}
                  </span>
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
              <span style={{ fontSize: 18 }}>{googleOn ? "✅" : "⬜"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Google account</div>
                <div style={{ color: "var(--muted)", fontSize: 12.5 }}>Live Search Console & Analytics tokens</div>
              </div>
              {googleOn ? (
                <button className="tab" onClick={disconnectGoogle}>Disconnect</button>
              ) : (
                <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 700 }}>Not connected</span>
              )}
            </div>
          </div>
        </div>

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
  );
}
