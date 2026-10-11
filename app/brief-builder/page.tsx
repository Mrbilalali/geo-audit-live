"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

interface Brief {
  h1s: string[];
  metaTitle: string;
  metaDesc: string;
  outline: { h2: string; h3s: string[] }[];
  questions: string[];
  entities: string[];
  perSection: number;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function buildBrief(topicRaw: string, kind: string, words: number): Brief {
  const topic = topicRaw.trim().replace(/\.$/, "");
  const T = cap(topic);
  const kw = topic.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  const h1s = [
    `${T}: The Complete ${kind === "Landing page" ? "Solution" : "Guide"} (${new Date().getFullYear()})`,
    `How ${T} Works — Everything You Need to Know`,
    `${T} Explained: Benefits, Costs & Best Practices`,
  ];

  let metaTitle = `${T} — Complete Guide ${new Date().getFullYear()}`;
  if (metaTitle.length > 60) metaTitle = metaTitle.slice(0, 57) + "...";
  let metaDesc = `Learn ${topic} the easy way: how it works, key benefits, costs, mistakes to avoid, and FAQs — all in one place.`;
  if (metaDesc.length > 160) metaDesc = metaDesc.slice(0, 157) + "...";

  const outline = [
    { h2: `What Is ${T}?`, h3s: ["Simple definition", "Why it matters now"] },
    { h2: `How ${T} Works`, h3s: ["The process step by step", "Key components"] },
    { h2: `Key Benefits of ${T}`, h3s: ["Benefit 1 with proof", "Benefit 2 with proof", "Who benefits most"] },
    { h2: `${T}: Costs & Considerations`, h3s: ["Typical pricing", "What affects the cost"] },
    { h2: `Common ${T} Mistakes to Avoid`, h3s: ["Mistake 1", "Mistake 2", "How to fix them"] },
    { h2: `How to Get Started with ${T}`, h3s: ["Step 1", "Step 2", "Step 3"] },
    { h2: `${T} FAQs`, h3s: ["Top 5 questions, 40 words each"] },
  ];

  const questions = [
    `What is ${topic}?`,
    `How does ${topic} work?`,
    `What are the benefits of ${topic}?`,
    `How much does ${topic} cost?`,
    `What are common mistakes with ${topic}?`,
    `Is ${topic} worth it?`,
  ];

  const entities = [...new Set([...kw, `${topic} guide`, `${topic} benefits`, `${topic} cost`, `${topic} how to`])].slice(0, 10);

  return { h1s, metaTitle, metaDesc, outline, questions, entities, perSection: Math.round(words / outline.length) };
}

export default function BriefBuilder() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("Blog post");
  const [words, setWords] = useState(1500);
  const [brief, setBrief] = useState<Brief | null>(null);

  function run() {
    if (topic.trim().length < 3) return;
    setBrief(buildBrief(topic, kind, words));
  }

  function copyAll() {
    if (!brief) return;
    const lines = [
      "CONTENT BRIEF",
      ...brief.h1s.map((h, i) => `H1 option ${i + 1}: ${h}`),
      "",
      `Meta title (${brief.metaTitle.length} chars): ${brief.metaTitle}`,
      `Meta description (${brief.metaDesc.length} chars): ${brief.metaDesc}`,
      "",
      "OUTLINE:",
      ...brief.outline.flatMap((s) => [`H2: ${s.h2}`, ...s.h3s.map((h) => `  H3: ${h}`)]),
      "",
      "QUESTIONS TO ANSWER:",
      ...brief.questions.map((q) => `- ${q}`),
      "",
      "ENTITIES / KEYWORDS TO INCLUDE:",
      brief.entities.join(", "),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <Gate tool="brief-builder" name="Content Brief Builder">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">Content ops</div>
          <h1>Content Brief <span className="g">Builder</span></h1>
          <p>Topic in → complete SEO/GEO content brief out: headlines, outline, questions, entities, meta tags.</p>
        </div>

        <div className="card no-print">
          <div className="formgrid">
            <div className="field">
              <label>Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. AI chatbots for dental clinics" onKeyDown={(e) => e.key === "Enter" && run()} />
            </div>
            <div className="field">
              <label>Content type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option>Blog post</option>
                <option>Guide</option>
                <option>Landing page</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Target word count</label>
            <select value={words} onChange={(e) => setWords(Number(e.target.value))}>
              <option value={800}>800 — quick answer post</option>
              <option value={1500}>1,500 — standard article</option>
              <option value={2500}>2,500 — definitive guide</option>
            </select>
          </div>
          <button className="btn" onClick={run} disabled={topic.trim().length < 3}>Build brief →</button>
        </div>

        {brief && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ fontSize: 19 }}>📋 Your brief</h2>
              <button className="btn ghost no-print" onClick={copyAll}>Copy full brief</button>
            </div>

            <h3 className="cathead">H1 options</h3>
            {brief.h1s.map((h, i) => (
              <div className="promptitem" key={i}><span className="n">{i + 1}</span><span>{h}</span></div>
            ))}

            <h3 className="cathead">Meta tags</h3>
            <div className="ev">Title ({brief.metaTitle.length}/60): {brief.metaTitle}</div>
            <div className="ev" style={{ marginTop: 8 }}>Description ({brief.metaDesc.length}/160): {brief.metaDesc}</div>

            <h3 className="cathead">Outline <span className="pts">~{brief.perSection} words per section</span></h3>
            {brief.outline.map((s, i) => (
              <div className="check" key={i}>
                <div className="hd"><span className="dot pass" />
                  <h3>H2: {s.h2}</h3>
                </div>
                <ul style={{ margin: "8px 0 0 26px", color: "var(--muted)", fontSize: 14 }}>
                  {s.h3s.map((h, j) => <li key={j}>H3: {h}</li>)}
                </ul>
              </div>
            ))}

            <h3 className="cathead">Questions to answer <span className="pts">40-word answers each</span></h3>
            {brief.questions.map((q, i) => (
              <div className="promptitem" key={i}><span className="n">?</span><span>{q}</span></div>
            ))}

            <h3 className="cathead">Entities & keywords to include</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {brief.entities.map((e, i) => (
                <span key={i} className="tooltag" style={{ marginBottom: 0 }}>{e}</span>
              ))}
            </div>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
