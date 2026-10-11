"use client";

import Gate from "../../components/Gate";
import { recordUse } from "../../lib/access";

import { useState } from "react";

interface Finding {
  name: string; weight: number; status: "pass" | "warn" | "fail";
  evidence: string; fix: string;
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analyze(raw: string, question: string): Finding[] {
  const text = stripHtml(raw);
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
  const first60 = words.slice(0, 60).join(" ");
  const first150 = words.slice(0, 150).join(" ").toLowerCase();
  const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !["what", "when", "where", "which", "does", "your", "with", "from"].includes(w));
  const qHits = qWords.filter((w) => first150.includes(w)).length;

  const questionMarks = (text.match(/\?/g) || []).length;
  const numbers = (text.match(/(\d+(\.\d+)?\s?(%|percent|x|times)?|\$\s?\d[\d,]*)/gi) || []).length;
  const avgSent = sentences.length ? words.length / sentences.length : 0;
  const startsFluffy = /^(welcome|hello|hi there|in today'?s|discover)/i.test(text);

  const F: Finding[] = [];
  F.push({
    name: "Opens with a direct answer", weight: 25,
    status: !startsFluffy && words.slice(0, 60).length <= 60 && wc >= 60 ? "pass" : wc < 60 ? "fail" : "warn",
    evidence: `Opening 60 words: "${first60.slice(0, 140)}${first60.length > 140 ? "…" : ""}"${startsFluffy ? " (starts with filler — bad)" : ""}`,
    fix: "Rewrite the opening as a 2–3 sentence direct answer to the page's one main question. AI engines quote pages that answer up top; buried answers never get cited.",
  });
  F.push({
    name: "Target question addressed early", weight: 15,
    status: !question.trim() ? "warn" : qHits >= Math.min(3, qWords.length) ? "pass" : qHits > 0 ? "warn" : "fail",
    evidence: question.trim()
      ? `Target: "${question.trim()}" — ${qHits}/${qWords.length} key terms appear in the first 150 words.`
      : "No target question entered — could not verify topical focus.",
    fix: "State the page's one question explicitly, then make sure its key terms appear in the first 150 words.",
  });
  F.push({
    name: "Sufficient depth", weight: 15,
    status: wc >= 400 ? "pass" : wc >= 150 ? "warn" : "fail",
    evidence: `${wc} words of visible text.`,
    fix: "Expand thin pages to 400+ words of genuinely useful content: steps, examples, and detail below the direct answer.",
  });
  F.push({
    name: "Question coverage (FAQ-like)", weight: 15,
    status: questionMarks >= 4 ? "pass" : questionMarks >= 2 ? "warn" : "fail",
    evidence: `${questionMarks} question mark${questionMarks === 1 ? "" : "s"} found in the text.`,
    fix: "Add a short FAQ section (4–8 real customer questions with 2–4 sentence answers). Each one maps to a question people ask AI assistants.",
  });
  F.push({
    name: "Quotable numbers & stats", weight: 15,
    status: numbers >= 4 ? "pass" : numbers >= 2 ? "warn" : "fail",
    evidence: `${numbers} concrete number${numbers === 1 ? "" : "s"}/stat${numbers === 1 ? "" : "s"} detected (prices, percentages, counts).`,
    fix: "Add 3–5 real numbers about the topic (speed, results, prices, volumes). AI answers love citing specific statistics.",
  });
  F.push({
    name: "Short, quotable sentences", weight: 15,
    status: avgSent > 0 && avgSent <= 22 ? "pass" : avgSent <= 30 ? "warn" : "fail",
    evidence: `Average sentence length: ${avgSent ? avgSent.toFixed(1) : "—"} words across ${sentences.length} sentences.`,
    fix: "Break long sentences up. Definitions and answers under ~22 words get quoted verbatim far more often.",
  });
  return F;
}

export default function ContentChecker() {
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [findings, setFindings] = useState<Finding[] | null>(null);

  function run() {
    if (stripHtml(text).split(/\s+/).filter(Boolean).length < 30) {
      alert("Please paste at least ~30 words of page text.");
      return;
    }
    setFindings(analyze(text, question));
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  const score = findings
    ? Math.round((findings.reduce((s, f) => s + f.weight * (f.status === "pass" ? 1 : f.status === "warn" ? 0.5 : 0), 0) / findings.reduce((s, f) => s + f.weight, 0)) * 100)
    : 0;
  const color = score >= 80 ? "#3ecf8e" : score >= 55 ? "#38bdf8" : score >= 30 ? "#f5a623" : "#f0524d";

  return (
    <Gate tool="content-checker" name="Content GEO Checker">
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Content analysis</div>
        <h1>Content <span className="g">GEO Checker</span></h1>
        <p>Paste any page&apos;s text (or raw HTML). Get a real answer-first analysis — the way AI engines read your page — with a score and concrete fixes.</p>
      </div>

      <div className="card">
        <div className="field">
          <label>The one question this page answers (optional but recommended)</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How much does teeth cleaning cost in Lahore?" />
        </div>
        <div className="field">
          <label>Page text or HTML *</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the page content here…" style={{ minHeight: 200 }} />
        </div>
        <div className="center no-print">
          <button className="btn" onClick={run}>Analyze my content →</button>
        </div>
      </div>

      {findings && (
        <div className="card">
          <div className="center" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, letterSpacing: 2, color: "var(--muted)" }}>CONTENT GEO SCORE</div>
            <div style={{ fontSize: 60, fontWeight: 800, color }} className="g">{score}<span style={{ fontSize: 22, color: "var(--muted)" }}>/100</span></div>
          </div>
          {findings.map((f, i) => (
            <div className="check" key={i}>
              <div className="hd">
                <span className={`dot ${f.status}`} />
                <h3>{f.name} <span style={{ color: "var(--muted)", fontSize: 13 }}>· {f.weight} pts</span></h3>
                <span className={`st ${f.status}`}>{f.status === "pass" ? "Pass" : f.status === "warn" ? "Warning" : "Failed"}</span>
              </div>
              <div className="ev">{f.evidence}</div>
              {f.status !== "pass" && <div className="fix"><b>Fix:</b> {f.fix}</div>}
            </div>
          ))}
          <div className="center no-print" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => window.print()}>Download / print report</button>
          </div>
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
    </Gate>
  );
}
