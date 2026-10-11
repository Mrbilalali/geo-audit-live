"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  OAUTH_CALLBACK, OAUTH_STATE_SS, getOAuthCreds, setGoogleTokens,
} from "../../../lib/google";

// This page must live at https://geo-audit-live.vercel.app/oauth/callback
// (registered as the redirect URI in the user's Google Cloud OAuth client).
export default function OAuthCallback() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const err = params.get("error");
      if (err) { setStatus("error"); setError(`Google said: ${err}`); return; }
      if (!code) { setStatus("error"); setError("No authorization code returned."); return; }
      let savedState: string | null = null;
      try { savedState = sessionStorage.getItem(OAUTH_STATE_SS); } catch { /* noop */ }
      if (savedState && state !== savedState) {
        setStatus("error"); setError("State mismatch — please try connecting again."); return;
      }
      const creds = getOAuthCreds();
      if (!creds) { setStatus("error"); setError("Google client credentials missing in Settings."); return; }
      try {
        const r = await fetch("/api/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant: "code", code,
            client_id: creds.clientId, client_secret: creds.clientSecret,
            redirect_uri: OAUTH_CALLBACK,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || d.error || "Token exchange failed.");
        setGoogleTokens({
          access_token: d.access_token,
          refresh_token: d.refresh_token,
          expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        });
        try { sessionStorage.removeItem(OAUTH_STATE_SS); } catch { /* noop */ }
        setStatus("done");
      } catch (e: unknown) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Token exchange failed.");
      }
    })();
  }, []);

  return (
      <div className="wrap" style={{ maxWidth: 560, paddingTop: 40 }}>
        <div className="card center">
          {status === "working" && (<><h2 style={{ fontSize: 20 }}><span className="spin" /> Connecting…</h2><p style={{ color: "var(--muted)" }}>Exchanging the authorization code with Google.</p></>)}
          {status === "done" && (
            <>
              <h2 style={{ fontSize: 22, marginBottom: 8 }}>✓ Google connected</h2>
              <p style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 18 }}>
                Your Search Console & Analytics read access is live. Tokens stay in your browser.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/gsc-analyzer" className="btn" style={{ textDecoration: "none" }}>Open GSC Analyzer →</Link>
                <Link href="/traffic-overview" className="btn ghost" style={{ textDecoration: "none" }}>Traffic Overview →</Link>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Couldn't connect</h2>
              <p className="err">{error}</p>
              <Link href="/gsc-analyzer" className="btn ghost" style={{ textDecoration: "none", marginTop: 10 }}>Back to GSC Analyzer</Link>
            </>
          )}
        </div>
      </div>
  );
}
