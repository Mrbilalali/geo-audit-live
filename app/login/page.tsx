"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setLicense } from "../../lib/access";

export default function Login() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit() {
    const k = key.trim();
    if (!k || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "Login failed.");
      // keep the client-side license cache in sync (sidebar pills, instant gates)
      setLicense({ key: k, plan: d.plan === "lifetime" ? "lifetime" : "monthly", at: Date.now() });
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 480, paddingTop: 60 }}>
      <div className="card center">
        <div className="badge" style={{ marginBottom: 12 }}>🔐 Sign in</div>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Welcome <span className="g">back</span></h1>
        <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 20 }}>
          Paste the license key Gumroad emailed you after purchase.
        </p>
        <div className="field" style={{ textAlign: "left" }}>
          <label>License key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="btn" style={{ width: "100%" }} onClick={submit} disabled={busy || key.trim().length < 4}>
          {busy ? <><span className="spin" />Signing in…</> : "Sign in →"}
        </button>
        {error && <p className="err">{error}</p>}
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 18 }}>
          No key yet? <Link href="/pricing" style={{ color: "var(--accent)", fontWeight: 700 }}>See plans →</Link>
        </p>
      </div>
      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
