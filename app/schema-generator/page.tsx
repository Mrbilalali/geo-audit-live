"use client";

import Gate from "../../components/Gate";

import { useMemo, useState } from "react";

interface Faq { q: string; a: string; }

function copyText(t: string, btn: HTMLButtonElement) {
  const done = () => { btn.textContent = "Copied!"; setTimeout(() => (btn.textContent = "Copy"), 1500); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done).catch(() => done());
  else {
    const ta = document.createElement("textarea");
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch { /* noop */ }
    ta.remove(); done();
  }
}

export default function SchemaKit() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locality, setLocality] = useState("");
  const [services, setServices] = useState("");
  const [faqs, setFaqs] = useState<Faq[]>([{ q: "", a: "" }, { q: "", a: "" }]);
  const [tab, setTab] = useState(0);
  const [built, setBuilt] = useState(false);

  const cleanUrl = useMemo(() => {
    let u = url.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return u || "yoursite.com";
  }, [url]);

  const orgJson = useMemo(() => {
    const svc = services.split("\n").map((s) => s.trim()).filter(Boolean);
    const obj: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: name.trim() || "Your Business Name",
      url: "https://" + cleanUrl,
      description: desc.trim() || "One-line description of what the business does.",
    };
    if (phone.trim()) obj.telephone = phone.trim();
    if (email.trim()) obj.email = email.trim();
    if (locality.trim()) obj.address = { "@type": "PostalAddress", addressLocality: locality.trim() };
    if (svc.length) obj.makesOffer = svc.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s } }));
    return JSON.stringify(obj, null, 2);
  }, [name, cleanUrl, desc, phone, email, locality, services]);

  const faqJson = useMemo(() => {
    const valid = faqs.filter((f) => f.q.trim() && f.a.trim());
    return JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: valid.length
          ? valid.map((f) => ({ "@type": "Question", name: f.q.trim(), acceptedAnswer: { "@type": "Answer", text: f.a.trim() } }))
          : [{ "@type": "Question", name: "Your first customer question?", acceptedAnswer: { "@type": "Answer", text: "A concise 2–4 sentence answer." } }],
      },
      null, 2
    );
  }, [faqs]);

  const robotsTxt = useMemo(
    () =>
      `User-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: CCBot\nAllow: /`,
    []
  );

  const llmsTxt = useMemo(() => {
    const svc = services.split("\n").map((s) => s.trim()).filter(Boolean);
    return `# ${name.trim() || "Your Business Name"}\n> ${desc.trim() || "One-line description of the business."}\n\n## Key pages\n- [Homepage](https://${cleanUrl}/) — What the business does and who it serves\n- [Services](https://${cleanUrl}/services) — ${svc.slice(0, 3).join(", ") || "Core services"}${svc.length > 3 ? ", and more" : ""}\n- [Pricing](https://${cleanUrl}/pricing) — Pricing overview\n- [FAQ](https://${cleanUrl}/faq) — Top customer questions answered\n- [Contact](https://${cleanUrl}/contact) — ${phone.trim() ? "Call " + phone.trim() + " · " : ""}${email.trim() || "Get in touch"}`;
  }, [name, desc, cleanUrl, services, phone, email]);

  const tabs = [
    { label: "Organization JSON-LD", code: `<script type="application/ld+json">\n${orgJson}\n</script>`, hint: "Paste into your homepage <head>. Then validate at validator.schema.org." },
    { label: "FAQ JSON-LD", code: `<script type="application/ld+json">\n${faqJson}\n</script>`, hint: "Paste into pages that carry the matching visible FAQs." },
    { label: "robots.txt (AI allow)", code: robotsTxt, hint: "Append to your robots.txt — keeps bad bots out, lets AI crawlers in." },
    { label: "llms.txt", code: llmsTxt, hint: "Save as llms.txt at your site root, next to robots.txt." },
  ];

  return (
    <Gate tool="schema-generator" name="Schema & Meta Kit">
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Code generator</div>
        <h1>Schema &amp; Meta <span className="g">Kit</span></h1>
        <p>Fill in your business details once — get the four copy-paste files the GEO audit asks for. Real code, pre-filled with your data.</p>
      </div>

      <div className="card">
        <div className="formgrid">
          <div className="field"><label>Business name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bright Smile Dental Studio" /></div>
          <div className="field"><label>Website URL *</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="brightsmile.com" /></div>
        </div>
        <div className="field"><label>One-line description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Family dental clinic in Lahore — painless treatments, same-day appointments" /></div>
        <div className="formgrid">
          <div className="field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" /></div>
          <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@brightsmile.com" /></div>
        </div>
        <div className="field"><label>City / Area</label><input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Lahore" /></div>
        <div className="field"><label>Services (one per line)</label><textarea value={services} onChange={(e) => setServices(e.target.value)} placeholder={"Teeth cleaning\nRoot canal\nBraces"} /></div>
        <div className="field">
          <label>FAQs (real customer questions + short answers)</label>
          {faqs.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={f.q} onChange={(e) => { const c = [...faqs]; c[i].q = e.target.value; setFaqs(c); }} placeholder={`Question ${i + 1}`} style={{ flex: 1 }} />
              <input value={f.a} onChange={(e) => { const c = [...faqs]; c[i].a = e.target.value; setFaqs(c); }} placeholder="Answer" style={{ flex: 1 }} />
              {faqs.length > 1 && (
                <button className="tab" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
              )}
            </div>
          ))}
          <button className="tab" onClick={() => setFaqs([...faqs, { q: "", a: "" }])}>+ Add FAQ</button>
        </div>
        <div className="center no-print">
          <button className="btn" onClick={() => { if (!name.trim() || !url.trim()) { alert("Please enter business name and URL."); return; } setBuilt(true); setTab(0); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }}>
            Generate my code →
          </button>
        </div>
      </div>

      {built && (
        <div className="card">
          <div className="tabs no-print">
            {tabs.map((t, i) => (
              <button key={i} className={`tab${tab === i ? " on" : ""}`} onClick={() => setTab(i)}>{t.label}</button>
            ))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{tabs[tab].hint}</p>
          <div className="outbox">
            <button className="copy" onClick={(e) => copyText(tabs[tab].code, e.currentTarget)}>Copy</button>
            <pre>{tabs[tab].code}</pre>
          </div>
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
    </Gate>
  );
}
