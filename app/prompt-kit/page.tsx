"use client";

import Gate from "../../components/Gate";

import { useState } from "react";

const TYPES = [
  "Local service business", "Online store", "SaaS / software", "Agency / freelancer",
  "Restaurant / café", "Clinic / healthcare", "Coach / educator", "Real estate",
];

function buildPrompts(name: string, type: string, services: string[], city: string): { cat: string; items: string[] }[] {
  const n = name || "Your Business";
  const c = city ? ` in ${city}` : "";
  const s1 = services[0] || "your main service";
  const s2 = services[1] || "your second service";
  const t = type.toLowerCase().includes("local") ? "service provider" : type.toLowerCase().includes("store") ? "online store" : type.toLowerCase();
  return [
    { cat: "Direct recommendations", items: [
      `What is the best ${t}${c}?`,
      `Recommend a reliable ${t}${c}.`,
      `Who should I hire for ${s1}${c}?`,
      `Top-rated ${t}${c} — who do you suggest?`,
      `I need ${s1}${c}. Any recommendations?`,
    ]},
    { cat: "Comparisons", items: [
      `${n} vs competitors — which is better?`,
      `Compare the top ${t}s${c}.`,
      `${s1} vs ${s2} — which do I need?`,
      `What is the difference between cheap and premium ${s1}?`,
      `Best ${t} for beginners${c}?`,
    ]},
    { cat: "Pricing questions", items: [
      `How much does ${s1} cost${c}?`,
      `What is the average price of ${s2}${c}?`,
      `Is ${s1} worth the money?`,
      `Are there affordable ${t}s${c}?`,
      `What affects the cost of ${s1}?`,
    ]},
    { cat: "How-to & problems", items: [
      `How do I choose the right ${t}${c}?`,
      `What should I ask before hiring someone for ${s1}?`,
      `Common mistakes when choosing ${s1}?`,
      `How long does ${s1} usually take?`,
      `What are the signs of a bad ${t}?`,
    ]},
    { cat: "Trust & reputation", items: [
      `Is ${n} reliable?`,
      `${n} reviews — what do customers say?`,
      `Has anyone used ${n}?`,
      `What is ${n} known for?`,
      `Would you recommend ${n}?`,
    ]},
    { cat: "Specific needs", items: [
      `Best ${s1} for small budgets${c}?`,
      `${s1} near me — what are my options?`,
      `Fastest way to get ${s2}${c}?`,
      `${t} with same-day service${c}?`,
      `Who offers ${s1} with a guarantee${c}?`,
    ]},
  ];
}

export default function PromptKit() {
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [services, setServices] = useState("");
  const [city, setCity] = useState("");
  const [groups, setGroups] = useState<{ cat: string; items: string[] }[] | null>(null);

  function run() {
    if (!name.trim()) { alert("Please enter your business name."); return; }
    const svc = services.split("\n").map((s) => s.trim()).filter(Boolean);
    setGroups(buildPrompts(name.trim(), type, svc, city.trim()));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  let n = 0;
  return (
    <Gate tool="prompt-kit" name="AI Prompt Tracker Kit">
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Tracking kit</div>
        <h1>AI Prompt <span className="g">Tracker Kit</span></h1>
        <p>What gets measured gets improved. Generate 30 real customer prompts, run them monthly in ChatGPT, Perplexity &amp; Gemini, and log which engines mention you.</p>
      </div>

      <div className="card">
        <div className="formgrid">
          <div className="field"><label>Business name *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bright Smile Dental Studio" /></div>
          <div className="field"><label>Business type</label><select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div className="field"><label>Main services (one per line)</label><textarea value={services} onChange={(e) => setServices(e.target.value)} placeholder={"Teeth cleaning\nRoot canal"} style={{ minHeight: 80 }} /></div>
        <div className="field"><label>City / area (optional)</label><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" /></div>
        <div className="center no-print">
          <button className="btn" onClick={run}>Build my 30-prompt list →</button>
        </div>
      </div>

      {groups && (
        <>
          <div className="card">
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Your 30 test prompts</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>Run each prompt once a month in ChatGPT, Perplexity and Gemini. Mark whether your business gets mentioned.</p>
            {groups.map((g) => (
              <div key={g.cat} style={{ marginBottom: 18 }}>
                <h3 style={{ color: "var(--gold)", fontSize: 15, marginBottom: 10 }}>{g.cat}</h3>
                {g.items.map((p) => { n++; return (
                  <div className="promptitem" key={n}><span className="n">{n}</span><span>{p}</span></div>
                ); })}
              </div>
            ))}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Monthly tracking sheet</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>Print this and check the boxes each month. ✓ = your business was mentioned.</p>
            <div style={{ overflowX: "auto" }}>
              <table className="tracktable">
                <thead><tr><th>#</th><th>Prompt</th><th>ChatGPT</th><th>Perplexity</th><th>Gemini</th><th>Notes</th></tr></thead>
                <tbody>
                  {groups.flatMap((g) => g.items).map((p, i) => (
                    <tr key={i}><td>{i + 1}</td><td style={{ fontSize: 12.5 }}>{p}</td><td className="c">☐</td><td className="c">☐</td><td className="c">☐</td><td></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="center no-print" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => window.print()}>Print tracking sheet</button>
            </div>
          </div>
        </>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
    </Gate>
  );
}
