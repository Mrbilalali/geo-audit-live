"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Access, checkAccess, clearLicense, getLicense } from "../lib/access";
import { BILLING, FREE_MONTHLY_LIMIT } from "../lib/billing";

export const PRO_UNLIMITED: Access = { allowed: true, kind: "unlimited", left: Infinity };

export default function Gate({
  tool,
  name,
  children,
}: {
  tool: string;
  name: string;
  children: React.ReactNode;
}) {
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. server session is the source of truth
      try {
        const r = await fetch("/api/auth/session");
        const s = await r.json();
        if (!cancelled && s.plan === "pro") { setAccess(PRO_UNLIMITED); return; }
      } catch { /* fall through */ }
      // 2. migrate a legacy localStorage license into a session cookie
      const lic = getLicense();
      if (lic) {
        try {
          const r = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: lic.key }),
          });
          const d = await r.json();
          if (!cancelled && r.ok && d.ok) { setAccess(PRO_UNLIMITED); return; }
          clearLicense();
        } catch { /* fall through */ }
      }
      // 3. free-tier rules
      if (!cancelled) setAccess(checkAccess(tool));
    })();
    return () => { cancelled = true; };
  }, [tool]);

  if (!access) return <div className="wrap"><div className="card center">Loading…</div></div>;
  if (access.allowed) {
    return (
      <>
        {access.kind === "limited" && (
          <div className="wrap no-print" style={{ paddingBottom: 0 }}>
            <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 16px", fontSize: 13.5, color: "var(--muted)", background: "var(--card)" }}>
              Free plan: <b style={{ color: "var(--accent)" }}>{access.left} of {FREE_MONTHLY_LIMIT[tool]} free runs</b> left this month —{" "}
              <Link href="/pricing" style={{ color: "var(--accent)", fontWeight: 700 }}>Go Pro for unlimited →</Link>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="wrap">
      <div className="card center" style={{ padding: "60px 28px", borderColor: "var(--accent)" }}>
        <div className="badge">Pro tool</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10 }}>
          {name} <span style={{ color: "var(--accent)" }}>is Pro</span>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto 8px" }}>
          {access.reason === "limit-reached"
            ? "You've used your 3 free runs this month on the free plan."
            : "This tool is part of the Pro toolkit."}{" "}
          Unlock everything for <b style={{ color: "var(--ink)" }}>${BILLING.monthlyDeal}/mo</b>{" "}
          <span style={{ textDecoration: "line-through", color: "var(--muted)" }}>${BILLING.monthlyPrice}</span> — or grab lifetime access for{" "}
          <b style={{ color: "var(--ink)" }}>${BILLING.lifetimeDeal}</b> (first {BILLING.lifetimeSeats} users).
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          <Link href="/pricing" className="btn" style={{ textDecoration: "none", marginTop: 0 }}>See pricing →</Link>
        </div>
        <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--muted)" }}>
          Already subscribed? <Link href="/pricing#license" style={{ color: "var(--accent)", fontWeight: 700 }}>Enter your license key →</Link>
        </p>
      </div>
    </div>
  );
}
