"use client";

import { useState } from "react";
import { checkoutUrl, setLicense, verifyKey } from "../../lib/access";
import { BILLING } from "../../lib/billing";

export default function Pricing() {
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock() {
    if (!key.trim() || busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await verifyKey(key.trim());
      if (r.valid) {
        setLicense({ key: key.trim(), plan: r.plan === "lifetime" ? "lifetime" : "monthly", at: Date.now() });
        setMsg("Key accepted — Pro unlocked on this device. Enjoy the toolkit.");
        setKey("");
      } else {
        setMsg("That key didn't verify. Check it against the key Gumroad emailed you, or contact support.");
      }
    } catch {
      setMsg("Verification failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 30, display: "flex", flexDirection: "column" };
  const price: React.CSSProperties = { fontSize: 44, fontWeight: 800, margin: "10px 0 2px" };
  const strike: React.CSSProperties = { textDecoration: "line-through", color: "var(--muted)", fontSize: 18, fontWeight: 400 };

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Simple pricing</div>
        <h1>One toolkit. <span className="g">Every AI-visibility tool.</span></h1>
        <p>Start free. Upgrade when you're ready to rank. Cancel anytime.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginTop: 26 }}>
        <div style={card}>
          <span className="tooltag">Free</span>
          <div style={price}>$0</div>
          <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "8px 0 16px" }}>Taste the toolkit.</p>
          <ul style={{ marginLeft: 18, fontSize: 14.5, color: "var(--muted)", flex: 1 }}>
            <li style={{ marginBottom: 8 }}>GEO Live Audit — 3 scans/month</li>
            <li style={{ marginBottom: 8 }}>Content Checker — 3 runs/month</li>
            <li style={{ marginBottom: 8 }}>SERP Preview + Readability — unlimited</li>
          </ul>
          <div className="center" style={{ marginTop: 18 }}><span style={{ color: "var(--muted)", fontSize: 14 }}>You're on Free right now</span></div>
        </div>

        <div style={{ ...card, borderColor: "var(--accent)", boxShadow: "0 0 40px rgba(56,189,248,.12)" }}>
          <span className="tooltag">Most popular</span>
          <div style={price}>${BILLING.monthlyDeal}<span style={{ fontSize: 18, color: "var(--muted)" }}>/mo</span> <span style={strike}>${BILLING.monthlyPrice}</span></div>
          <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "8px 0 16px" }}>Launch price — locked for early members.</p>
          <ul style={{ marginLeft: 18, fontSize: 14.5, color: "var(--muted)", flex: 1 }}>
            <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>All 25 tools, unlimited</b></li>
            <li style={{ marginBottom: 8 }}>New tools included as they ship</li>
            <li style={{ marginBottom: 8 }}>BYO API keys for data tools</li>
            <li style={{ marginBottom: 8 }}>Cancel anytime</li>
          </ul>
          <div className="center no-print" style={{ marginTop: 18 }}>
            <a href={checkoutUrl("monthly")} className="btn" style={{ textDecoration: "none", display: "inline-block", marginTop: 0 }}>Start Pro →</a>
          </div>
        </div>

        <div style={card}>
          <span className="tooltag">Founding members</span>
          <div style={price}>${BILLING.lifetimeDeal} <span style={strike}>${BILLING.lifetimePrice}</span></div>
          <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "8px 0 16px" }}>One payment. Yours forever. Only for the first {BILLING.lifetimeSeats} users.</p>
          <ul style={{ marginLeft: 18, fontSize: 14.5, color: "var(--muted)", flex: 1 }}>
            <li style={{ marginBottom: 8 }}><b style={{ color: "var(--ink)" }}>Everything in Pro, lifetime</b></li>
            <li style={{ marginBottom: 8 }}>Every future tool included</li>
            <li style={{ marginBottom: 8 }}>Founding-member badge</li>
          </ul>
          <div className="center no-print" style={{ marginTop: 18 }}>
            <a href={checkoutUrl("lifetime")} className="btn ghost" style={{ textDecoration: "none", display: "inline-block", marginTop: 0 }}>Claim lifetime →</a>
          </div>
        </div>
      </div>

      <div className="card" id="license">
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Already subscribed? Unlock your tools</h2>
        <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 14 }}>Gumroad emailed you a license key after purchase. Paste it here — Pro unlocks instantly on this device.</p>
        <div className="urlrow" style={{ marginTop: 0 }}>
          <input value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="License key" style={{ fontFamily: "Consolas, monospace" }} />
          <button className="btn" onClick={unlock} disabled={busy}>{busy ? "Verifying…" : "Unlock Pro →"}</button>
        </div>
        {msg && <p style={{ marginTop: 12, fontSize: 14.5, color: msg.startsWith("Key accepted") ? "var(--green)" : "var(--amber)" }}>{msg}</p>}
      </div>

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
