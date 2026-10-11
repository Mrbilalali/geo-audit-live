import { OAUTH_CALLBACK } from "../lib/google";

// Numbered setup instructions for the user's own Google Cloud OAuth client.
// Shown wherever Google connect is offered.
export default function GoogleSetup() {
  return (
    <ol style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.9, paddingLeft: 20, margin: "10px 0 0" }}>
      <li>Go to <b style={{ color: "var(--ink)" }}>Google Cloud Console → APIs & Services → Credentials</b> and create an <b style={{ color: "var(--ink)" }}>OAuth client ID</b> (type: Web application).</li>
      <li>Add this exact <b style={{ color: "var(--ink)" }}>Authorized redirect URI</b>:<br />
        <code style={{ background: "var(--bg2)", padding: "3px 8px", borderRadius: 6, fontSize: 12.5, wordBreak: "break-all" }}>{OAUTH_CALLBACK}</code>
      </li>
      <li>Enable the <b style={{ color: "var(--ink)" }}>Google Search Console API</b> and <b style={{ color: "var(--ink)" }}>Google Analytics Data API</b> in Library.</li>
      <li>Paste the Client ID + Client Secret in <b style={{ color: "var(--ink)" }}>Settings</b> below, then come back and click Connect.</li>
    </ol>
  );
}
