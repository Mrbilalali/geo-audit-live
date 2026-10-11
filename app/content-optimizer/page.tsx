"use client";

import { useState } from "react";

type Status = "pass" | "warn" | "fail";
interface Rule {
  id: string; cat: string; name: string; weight: number;
  status: Status; evidence: string; fix: string;
}

const UNCERTAIN = /\b(maybe|perhaps|might|could|possibly|probably|likely|seems?|appears?|arguably)\b/gi;
const OPINION = /\b(i think|in my opinion|i believe|in my view|personally speaking)\b/gi;
const FLUFF = /(in today'?s fast-paced|in conclusion|it is important to note|delve|tapestry|landscape|game-?changer|cutting-?edge|revolutionize|unlock the power|nestled|in a nutshell|needless to say)/gi;
const VAGUE = /\b(things|stuff|various|several|a lot of|lots of|many different)\b/gi;
const CITE = /(according to|source:|studies? by|research by|data from|reported by)/gi;
const BOOL_Q = /^(is|are|does|do|can|will|should|has|have|was|were|did)\b/i;
const LIST_Q = /^(what are|which|list|name|what types|what kinds)\b/i;

function stripHtml(s: string): string {
  return s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function sentencesOf(t: string): string[] {
  return t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3);
}
function wordsOf(t: string): string[] { return t.split(/\s+/).filter(Boolean); }
function parasOf(t: string): string[] { return t.split(/\n{2,}|\n/).map((p) => p.trim()).filter((p) => p.length > 10); }
function countRe(re: RegExp, t: string): number { const m = t.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")); return m ? m.length : 0; }

function analyze(raw: string, keyword: string): Rule[] {
  const text = stripHtml(raw);
  const words = wordsOf(text), sents = sentencesOf(text), paras = parasOf(text);
  const W = words.length || 1;
  const kw = keyword.trim().toLowerCase();
  const R: Rule[] = [];
  const add = (r: Rule) => R.push(r);

  /* ---------- STRUCTURE ---------- */
  const first = paras[0] || "";
  const firstW = wordsOf(first).length;
  const fluffy = /^(welcome|hello|hi there|in today'?s|discover|imagine)/i.test(first);
  add({ id: "opening", cat: "Structure", name: "Opens with a direct answer", weight: 10,
    status: !fluffy && firstW > 0 && firstW <= 60 ? "pass" : firstW === 0 ? "fail" : "warn",
    evidence: `Opening paragraph: ${firstW} words${fluffy ? " (starts with filler)" : ""} — "${first.slice(0, 130)}${first.length > 130 ? "…" : ""}"`,
    fix: "Open with a 2–3 sentence direct answer (≤60 words) to the page's one main question. No greetings, no throat-clearing." });
  const third = Math.max(1, Math.floor(paras.length / 3));
  const snippet = paras.slice(0, third).find((p) => { const w = wordsOf(p).length; return w >= 35 && w <= 55; });
  add({ id: "snippet", cat: "Structure", name: "40-word featured-snippet block", weight: 8,
    status: snippet ? "pass" : "warn",
    evidence: snippet ? `Found ${wordsOf(snippet).length}-word definition-style paragraph near the top.` : "No 35–55 word self-contained paragraph in the opening third.",
    fix: "Add one 40-ish word paragraph that defines or answers the topic standalone — Google lifts these verbatim into featured snippets and AI answers." });
  add({ id: "length", cat: "Structure", name: "Content depth", weight: 7,
    status: W >= 1200 ? "pass" : W >= 600 ? "warn" : "fail",
    evidence: `${W} words total.`,
    fix: "Topical authority needs depth: expand thin pages toward 1,200+ words with steps, examples and sub-questions answered." });
  const avgPara = paras.length ? W / paras.length : 0;
  add({ id: "paralen", cat: "Structure", name: "Digestible paragraphs", weight: 5,
    status: avgPara <= 90 ? "pass" : avgPara <= 140 ? "warn" : "fail",
    evidence: `${paras.length} paragraphs, averaging ${avgPara.toFixed(0)} words.`,
    fix: "Break long paragraphs — one idea per paragraph, under ~90 words. AI cites precise passages, not walls of text." });

  /* ---------- QUESTIONS ---------- */
  const questions = sents.filter((s) => s.trim().endsWith("?"));
  const boolQs = questions.filter((q) => BOOL_Q.test(q.trim()));
  let boolOk = 0;
  boolQs.forEach((q) => {
    const idx = sents.indexOf(q);
    const nxt = (sents[idx + 1] || "").trim();
    if (/^(yes|no)\b/i.test(nxt)) boolOk++;
  });
  add({ id: "boolqa", cat: "Questions", name: "Boolean questions answered directly", weight: 7,
    status: boolQs.length === 0 ? "warn" : boolOk / boolQs.length >= 0.5 ? "pass" : "fail",
    evidence: `${boolQs.length} yes/no question(s) found; ${boolOk} answered with a direct Yes/No first.`,
    fix: "After every yes/no question, start the answer with 'Yes' or 'No' — then explain. AI extracts these pairs verbatim." });
  const listQs = questions.filter((q) => LIST_Q.test(q.trim()));
  const hasList = /(^|\n)\s*([-*•]|\d+[.)])\s+\S/m.test(text) || /<li/i.test(raw);
  add({ id: "listqa", cat: "Questions", name: "List questions get real lists", weight: 7,
    status: listQs.length === 0 ? "warn" : hasList ? "pass" : "fail",
    evidence: `${listQs.length} list-type question(s) found; ${hasList ? "list formatting detected nearby." : "no list formatting detected."}`,
    fix: "'What are the…' questions must be followed by an actual bulleted or numbered list — AI quotes list items directly." });
  add({ id: "qcover", cat: "Questions", name: "Question coverage", weight: 6,
    status: questions.length >= 3 ? "pass" : questions.length >= 1 ? "warn" : "fail",
    evidence: `${questions.length} question(s) in the text.`,
    fix: "Weave at least 3 real user questions into the content (as subheadings ideally). Each is a citation opportunity." });

  /* ---------- LANGUAGE PRECISION ---------- */
  const unc = countRe(UNCERTAIN, text);
  add({ id: "uncertain", cat: "Language precision", name: "No uncertain language", weight: 7,
    status: unc === 0 ? "pass" : unc <= 2 ? "warn" : "fail",
    evidence: `${unc} uncertain word(s) found (maybe, perhaps, might, could, possibly…).`,
    fix: "AI cites confident sources. Replace hedging with verified facts — or cut the sentence." });
  const op = countRe(OPINION, text);
  add({ id: "opinion", cat: "Language precision", name: "No opinion phrases", weight: 6,
    status: op === 0 ? "pass" : "fail",
    evidence: `${op} opinion phrase(s) found ("I think", "in my opinion"…).`,
    fix: "Remove opinion framing — state facts. Opinions are never cited as facts." });
  const fl = countRe(FLUFF, text);
  add({ id: "fluff", cat: "Language precision", name: "No fluff / AI clichés", weight: 6,
    status: fl === 0 ? "pass" : fl <= 2 ? "warn" : "fail",
    evidence: `${fl} fluff phrase(s) found (delve, tapestry, game-changer, "in today's fast-paced world"…).`,
    fix: "Delete every cliché. Each one dilutes factual density — the metric AI engines actually score." });
  const vg = countRe(VAGUE, text);
  add({ id: "vague", cat: "Language precision", name: "Specific, not vague", weight: 6,
    status: vg <= 3 ? "pass" : vg <= 8 ? "warn" : "fail",
    evidence: `${vg} vague term(s) (things, stuff, various, several…).`,
    fix: "Replace vagueness with specifics: exact numbers, names and quantities." });

  /* ---------- ENTITIES & FACTS ---------- */
  const entRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const entCount = new Map<string, number>();
  let em: RegExpExecArray | null;
  while ((em = entRe.exec(text))) { const k = em[1]; entCount.set(k, (entCount.get(k) || 0) + 1); }
  const topEnt = [...entCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stuffing = topEnt.length > 0 && topEnt[0][1] / W > 0.04;
  add({ id: "entities", cat: "Entities & facts", name: "Entity focus, no stuffing", weight: 8,
    status: topEnt.length >= 3 && !stuffing ? "pass" : stuffing ? "fail" : "warn",
    evidence: topEnt.length ? `Top entities: ${topEnt.map(([k, c]) => `${k} (×${c})`).join(", ")}` : "Few multi-word entities detected.",
    fix: stuffing ? `Entity stuffing: "${topEnt[0][0]}" repeats unnaturally. Use pronouns and synonyms after the first mention.` : "Name real entities (products, places, people, concepts) consistently — AI connects facts through entities, not keywords." });
  const factSents = sents.filter((s) => /\d|%|\$|according to|study|research|data shows|report/i.test(s)).length;
  const factRatio = sents.length ? factSents / sents.length : 0;
  add({ id: "factual", cat: "Entities & facts", name: "Factual sentence density", weight: 7,
    status: factRatio >= 0.25 ? "pass" : factRatio >= 0.12 ? "warn" : "fail",
    evidence: `${factSents}/${sents.length} sentences carry numbers, stats or research references (${(factRatio * 100).toFixed(0)}%).`,
    fix: "Raise factual density above 25%: every claim should carry a number, a study, or a named source." });
  const nums = (text.match(/(\d+(\.\d+)?\s?(%|percent|x\b|times)?|\$\s?\d[\d,]*)/gi) || []).length;
  add({ id: "numbers", cat: "Entities & facts", name: "Quotable numbers", weight: 5,
    status: nums >= 4 ? "pass" : nums >= 2 ? "warn" : "fail",
    evidence: `${nums} concrete number(s)/stat(s) detected.`,
    fix: "Add specific statistics — AI answers quote numbers far more than adjectives." });
  const cites = countRe(CITE, text);
  add({ id: "cites", cat: "Entities & facts", name: "Authoritative citations", weight: 5,
    status: cites >= 1 ? "pass" : "warn",
    evidence: `${cites} citation signal(s) ("according to", "study by"…).`,
    fix: "Cite at least one authoritative source per major claim — uncited claims don't survive AI fact-checking." });

  /* ---------- MECHANICS ---------- */
  const avgSent = sents.length ? W / sents.length : 0;
  add({ id: "sentlen", cat: "Mechanics", name: "Quotable sentence length", weight: 5,
    status: avgSent <= 22 ? "pass" : avgSent <= 30 ? "warn" : "fail",
    evidence: `Average ${avgSent.toFixed(1)} words/sentence.`,
    fix: "Keep the average under 22 words — short sentences get quoted verbatim." });
  const dbl = (text.match(/  +/g) || []).length;
  const dup = (text.match(/\b(\w+)\s+\1\b/gi) || []).length;
  const nospace = (text.match(/[a-z][.!?][A-Z]/g) || []).length;
  const mechIssues = dbl + dup + nospace;
  add({ id: "grammar", cat: "Mechanics", name: "Clean mechanics", weight: 5,
    status: mechIssues === 0 ? "pass" : mechIssues <= 3 ? "warn" : "fail",
    evidence: `${dbl} double-space(s), ${dup} repeated word(s), ${nospace} missing space(s) after punctuation.`,
    fix: "Fix mechanical errors — sloppy text signals low quality to every engine." });
  const listLines = text.split("\n").filter((l) => /^\s*([-*•]|\d+[.)])\s+\S/.test(l));
  let listConsistent: Status = "warn", listEv = "No lists detected — consider adding one for scannable steps or items.";
  if (listLines.length) {
    const withPeriod = listLines.filter((l) => /[.!?]\s*$/.test(l.trim())).length;
    listConsistent = withPeriod === 0 || withPeriod === listLines.length ? "pass" : "fail";
    listEv = `${listLines.length} list items; ${withPeriod === 0 ? "none" : withPeriod === listLines.length ? "all" : withPeriod + " of " + listLines.length} end with punctuation.`;
  }
  add({ id: "listcons", cat: "Mechanics", name: "Consistent list formatting", weight: 5,
    status: listConsistent, evidence: listEv,
    fix: "Make every list item follow the same pattern: same starter style, same punctuation, same grammatical form." });
  const links = (raw.match(/<a\s[^>]*>/gi) || []).length + (text.match(/https?:\/\//g) || []).length;
  add({ id: "links", cat: "Mechanics", name: "Restrained linking", weight: 5,
    status: links === 0 || links / (W / 100) <= 1 ? "pass" : "warn",
    evidence: `${links} link(s) in ~${W} words.`,
    fix: "Keep it under ~1 link per 100 words. Every outbound link leaks authority — link only where it earns trust." });
  const last = paras[paras.length - 1] || "";
  const hasClose = /(conclusion|in summary|to sum up|get started|try it|contact us|learn more|sign up|book a)/i.test(last);
  add({ id: "closing", cat: "Mechanics", name: "Strong closing", weight: 5,
    status: hasClose ? "pass" : "warn",
    evidence: hasClose ? "Closing paragraph summarizes or calls to action." : "No clear conclusion or CTA detected at the end.",
    fix: "End with a tight summary or a single clear next step — AI often quotes conclusions." });

  if (kw) {
    const inFirst = text.slice(0, 800).toLowerCase().includes(kw);
    R.unshift({ id: "kwfocus", cat: "Structure", name: "Target keyword up top", weight: 8,
      status: inFirst ? "pass" : "fail",
      evidence: inFirst ? `Target "${keyword.trim()}" appears within the first ~800 characters.` : `Target "${keyword.trim()}" missing from the opening.`,
      fix: "Put the exact target keyword in the first 100 words — engines match queries to early terms first." });
  }
  return R;
}

const CATS = ["Structure", "Questions", "Language precision", "Entities & facts", "Mechanics"];

export default function OptimizerPro() {
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [text, setText] = useState("");
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [filter, setFilter] = useState<"all" | "issues" | "passed">("all");

  function run() {
    if (stripHtml(text).split(/\s+/).filter(Boolean).length < 100) { alert("Paste at least ~100 words of article text."); return; }
    setRules(analyze(text, keyword)); setFilter("all");
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  }

  const total = rules ? rules.reduce((s, r) => s + r.weight, 0) : 1;
  const earned = rules ? rules.reduce((s, r) => s + r.weight * (r.status === "pass" ? 1 : r.status === "warn" ? 0.5 : 0), 0) : 0;
  const score = Math.round((earned / total) * 100);
  const color = score >= 80 ? "#3ecf8e" : score >= 55 ? "#d4af37" : score >= 30 ? "#f5a623" : "#f0524d";
  const shown = rules ? rules.filter((r) => filter === "all" || (filter === "issues" ? r.status !== "pass" : r.status === "pass")) : [];
  const issueCount = rules ? rules.filter((r) => r.status !== "pass").length : 0;

  return (
    <div className="wrap">
      <div className="pagehead">
        <div className="badge">Flagship engine · 20 semantic rules</div>
        <h1>Content <span className="g">Optimizer Pro</span></h1>
        <p>Paste your article — get a 0–100 optimization score against the semantic rules AI engines actually reward: direct answers, question handling, entity focus, factual density, zero fluff.</p>
      </div>

      <div className="card">
        <div className="formgrid">
          <div className="field"><label>Article title (optional)</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How much does teeth cleaning cost?" /></div>
          <div className="field"><label>Target keyword (optional)</label><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="teeth cleaning cost" /></div>
        </div>
        <div className="field"><label>Article text or HTML *</label><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full article here…" style={{ minHeight: 240 }} /></div>
        <div className="center no-print"><button className="btn" onClick={run}>Score my article →</button></div>
      </div>

      {rules && (
        <div className="card">
          <div className="center" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, letterSpacing: 2, color: "var(--muted)" }}>OPTIMIZATION SCORE{title ? ` — ${title.slice(0, 60)}` : ""}</div>
            <div style={{ fontSize: 64, fontWeight: 800, color }}>{score}<span style={{ fontSize: 22, color: "var(--muted)" }}>/100</span></div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>{issueCount} of {rules.length} rules need attention</div>
          </div>
          <div className="tabs no-print" style={{ justifyContent: "center" }}>
            <button className={`tab${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>All ({rules.length})</button>
            <button className={`tab${filter === "issues" ? " on" : ""}`} onClick={() => setFilter("issues")}>Issues ({issueCount})</button>
            <button className={`tab${filter === "passed" ? " on" : ""}`} onClick={() => setFilter("passed")}>Passed ({rules.length - issueCount})</button>
          </div>
          {CATS.map((cat) => {
            const list = shown.filter((r) => r.cat === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <h2 className="cathead">{cat}</h2>
                {list.map((r) => (
                  <div className="check" key={r.id}>
                    <div className="hd"><span className={`dot ${r.status}`} />
                      <h3>{r.name} <span style={{ color: "var(--muted)", fontSize: 13 }}>· {r.weight} pts</span></h3>
                      <span className={`st ${r.status}`}>{r.status === "pass" ? "Pass" : r.status === "warn" ? "Warning" : "Failed"}</span></div>
                    <div className="ev">{r.evidence}</div>
                    {r.status !== "pass" && <div className="fix"><b>Fix:</b> {r.fix}</div>}
                  </div>
                ))}
              </div>
            );
          })}
          <div className="center no-print" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => window.print()}>Download / print report</button>
          </div>
        </div>
      )}

      <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
    </div>
  );
}
