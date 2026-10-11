"use client";

import Gate from "../../components/Gate";
import ApiRequired from "../../components/ApiRequired";
import { useState } from "react";
import { callAi, getAiCreds, getWpCreds } from "../../lib/ai";
import { mdToHtml, mdToWpHtml } from "../../lib/md";

const PLANNER = `You are the GEO Toolkit website agent. The user gives ONE instruction about their website. Reply with ONLY valid JSON, no markdown fences, no explanation:
{"steps":[{"tool":"audit_site|generate_article|publish_wordpress","url":"...","topic":"...","words":1200,"title":"...","status":"draft|publish","use_last_article":true}]}

TOOLS:
- audit_site {"url"} — live AI-visibility audit of a website
- generate_article {"topic","words":800|1200|2000} — writes a GEO-optimized article (answer-first, FAQs, entities)
- publish_wordpress {"title","status","use_last_article":true} — publishes the article from the previous generate_article step to the user's WordPress (use_last_article ONLY directly after a generate_article step)

RULES:
- If the user only asks to write, do NOT add publish_wordpress.
- "publish it / post it" → add publish_wordpress with status "draft" unless they say "publish live".
- "audit X" → audit_site. Combine naturally: "audit X and write about Y" → two steps.
- Max 4 steps. Keep params minimal.`;

const WRITER = `You are an expert SEO/GEO writer. Write a complete article in Markdown. Rules: direct answer in first 40 words; ## H2 / ### H3 headings; short paragraphs; FAQ section with 40-word answers; name real entities; no analogies, no fluff, no uncertain words ("might","perhaps"); end with Key takeaways bullets.`;

interface Step {
  tool: string;
  params: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  note: string;
}

const EXAMPLES = [
  "Audit example.com and tell me the score",
  "Write a 1200-word article about AI chatbots for dental clinics",
  "Write an article about local SEO for plumbers and save it as draft to my WordPress",
];

export default function AiCommand() {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState("");
  const [noKey, setNoKey] = useState(false);
  const [article, setArticle] = useState("");

  function setStep(i: number, patch: Partial<Step>) {
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  }

  async function run() {
    const p = prompt.trim();
    if (!p || running) return;
    if (!getAiCreds()) { setNoKey(true); return; }
    setNoKey(false);
    setRunning(true); setError(""); setSteps([]); setArticle("");
    let lastArticle = "";

    try {
      // 1. plan
      const planRaw = await callAi(
        [
          { role: "system", content: PLANNER },
          { role: "user", content: p },
        ],
        { max_tokens: 800, temperature: 0.2 }
      );
      let plan: { steps: { tool: string; [k: string]: unknown }[] };
      try {
        const clean = planRaw.replace(/```json|```/g, "").trim();
        plan = JSON.parse(clean);
      } catch {
        throw new Error("The AI didn't return a valid plan. Try rephrasing your request.");
      }
      const list: Step[] = (plan.steps || []).slice(0, 4).map((s) => ({
        tool: s.tool, params: s, status: "pending" as const, note: "",
      }));
      if (list.length === 0) throw new Error("No actionable steps found. Try: 'audit example.com' or 'write an article about X'.");
      setSteps(list);

      // 2. execute
      for (let i = 0; i < list.length; i++) {
        setStep(i, { status: "running" });
        const st = list[i];
        try {
          if (st.tool === "audit_site") {
            const url = String(st.params.url || "").trim();
            if (!url) throw new Error("No URL given.");
            const r = await fetch(`/api/audit?url=${encodeURIComponent(url)}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Audit failed");
            const fails = d.checks.filter((c: { status: string }) => c.status === "fail").length;
            setStep(i, { status: "done", note: `${d.url} → ${d.score}/100 (${d.tier}). ${fails} failed checks. Full report in Live Audit.` });
          } else if (st.tool === "generate_article") {
            const topic = String(st.params.topic || p);
            const words = Number(st.params.words) || 1200;
            const text = await callAi(
              [
                { role: "system", content: WRITER },
                { role: "user", content: `Write about ${words} words on: "${topic}". Markdown with ## headings.` },
              ],
              { max_tokens: 6000, temperature: 0.7 }
            );
            if (!text) throw new Error("Empty article.");
            lastArticle = text;
            setArticle(text);
            setStep(i, { status: "done", note: `Article written (${text.split(/\s+/).length} words). Preview below.` });
          } else if (st.tool === "publish_wordpress") {
            const creds = getWpCreds();
            if (!creds) throw new Error("WordPress not connected — add it in Settings first.");
            const content = st.params.use_last_article && lastArticle
              ? mdToWpHtml(lastArticle)
              : String(st.params.content || "");
            if (!content) throw new Error("Nothing to publish — generate an article first.");
            const title = String(st.params.title || "Untitled");
            const r = await fetch("/api/wp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...creds, action: "publish", title, content, status: st.params.status === "publish" ? "publish" : "draft" }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.detail || d.error || "Publish failed");
            setStep(i, { status: "done", note: `${d.status === "publish" ? "Published live" : "Draft saved"} → ${d.link}` });
          } else {
            throw new Error(`Unknown tool: ${st.tool}`);
          }
        } catch (e: unknown) {
          setStep(i, { status: "error", note: e instanceof Error ? e.message : "Step failed." });
          break;
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setRunning(false);
    }
  }

  const stepLabel = (t: string) =>
    t === "audit_site" ? "🔍 Audit site" : t === "generate_article" ? "✍️ Write article" : t === "publish_wordpress" ? "🚀 Publish to WordPress" : t;

  return (
    <Gate tool="ai-command" name="AI Command Center">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>AI Command <span className="g">Center</span></h1>
          <p>One prompt → the agent audits, writes and publishes for your website. You stay right here.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>What should I do for your website?</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Audit mrbilalali.com, then write a 1200-word article about AI chatbots for dentists and save it as draft to my WordPress"'
              style={{ minHeight: 96 }} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="tab" onClick={() => setPrompt(ex)}>{ex}</button>
            ))}
          </div>
          <button className="btn" onClick={run} disabled={running || prompt.trim().length < 4}>
            {running ? <><span className="spin" />Working…</> : "🧠 Run command →"}
          </button>
          {error && <p className="err">{error}</p>}
        </div>

        {noKey && (
          <ApiRequired apiName="OpenAI API Key or DeepSeek API Key">
            The command center runs on your OpenAI or DeepSeek key. Publishing steps also need your WordPress
            credentials. Add both in Settings — they stay in your browser.
          </ApiRequired>
        )}

        {steps.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>⚙️ Execution plan</h2>
            {steps.map((s, i) => (
              <div className="check" key={i}>
                <div className="hd">
                  <span className={"dot " + (s.status === "done" ? "pass" : s.status === "error" ? "fail" : s.status === "running" ? "warn" : "")}
                    style={s.status === "pending" ? { background: "var(--muted)", boxShadow: "none" } : undefined} />
                  <h3>{i + 1}. {stepLabel(s.tool)}</h3>
                  <span className="st" style={{ color: s.status === "done" ? "var(--green)" : s.status === "error" ? "var(--red)" : "var(--muted)" }}>
                    {s.status === "running" ? "working…" : s.status}
                  </span>
                </div>
                {s.note && <p className="fix">{s.note}</p>}
              </div>
            ))}
          </div>
        )}

        {article && (
          <div className="card">
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>📝 Generated article</h2>
            <div className="outbox" style={{ maxHeight: 480 }}>
              <div style={{ padding: 22, fontSize: 14.5 }} dangerouslySetInnerHTML={{ __html: mdToHtml(article) }} />
            </div>
            <button className="btn ghost no-print" style={{ marginTop: 12 }} onClick={() => navigator.clipboard.writeText(article)}>
              Copy article
            </button>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
