import Link from "next/link";

// Standard "API required" alert — shown wherever a feature needs the user's
// own API key / credentials. Names the exact key so nothing is ambiguous.
export default function ApiRequired({ apiName, children }: { apiName: string; children: React.ReactNode }) {
  return (
    <div className="card center" style={{ borderColor: "var(--amber)" }}>
      <h2 style={{ fontSize: 19, marginBottom: 8 }}>🔑 API Required: {apiName}</h2>
      <p style={{ color: "var(--muted)", fontSize: 14.5, maxWidth: 540, margin: "0 auto 16px" }}>
        {children}
      </p>
      <Link href="/settings" className="btn" style={{ textDecoration: "none" }}>Add in Settings →</Link>
    </div>
  );
}
