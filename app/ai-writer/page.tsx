"use client";

import Gate from "../../components/Gate";
import ApiRequired from "../../components/ApiRequired";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { callAi, getAiCreds, getWpCreds } from "../../lib/ai";
import { mdToHtml, mdToWpHtml } from "../../lib/md";

const WRITER_SYSTEM = `You are an expert SEO and GEO (Generative Engine Optimization) content writer. Write a complete, publication-ready article in Markdown.

STRICT RULES:
- Start with a direct answer to the topic in the first 40 words (answer-first for AI citations).
- Use ## H2 and ### H3 headings. Short paragraphs (2-3 sentences max).
- Include a FAQ section with ## FAQs and 4-6 questions, each answered in ~40 words.
- Name real entities (tools, companies, concepts) where relevant. Be specific, not vague.
- NEVER use: analogies, metaphors, "delve", "tapestry", "landscape" (as metaphor), uncertain words like "might", "perhaps", "could be".
- Factual, confident tone. No fluff intros ("In today's fast-paced world…").
- End with a short "Key takeaways" bullet list.`;

export default function AiWriter() {
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState("Blog post");
  const [words, setWords] = useState(1200);
  const [provider, setProvider] = useState<"auto" | "openai" | "deepseek">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [article, setArticle] = useState("");
  const [noKey, setNoKey] = useState(false);
  const [pubMsg, setPubMsg] = useState("");
  const router = useRouter();

  async function generate(): Promise<string> {
    const t = topic.trim();
    const text = await callAi(
      [
        { role: "system", content: WRITER_SYSTEM },
        { role: "user", content: `Write a ${kind.toLowerCase()} of about ${words} words on: "${t}". Use Markdown with ## headings.` },
      ],
      { provider: provider === "auto" ? undefined : provider, max_tokens: 6000, temperature: 0.7 }
    );
    if (!text) throw new Error("Empty response from AI.");
    setArticle(text);
    return text;
  }

  async function run() {
    const t = topic.trim();
    if (!t || loading) return;
    if (!getAiCreds()) { setNoKey(true); return; }
    setNoKey(false);
    setLoading(true); setError(""); setPubMsg(""); setArticle("");
    try {
      await generate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed.";
      setError(msg === "NO_KEY" ? "NO_KEY" : msg);
      if (msg === "NO_KEY") setNoKey(true);
    } finally {
      setLoading(false);
    }
  }

  async function writeAndPublish() {
    const t = topic.trim();
    if (!t || loading) return;
    if (!getAiCreds()) { setNoKey(true); return; }
    const wp = getWpCreds();
    if (!wp) {
      setError("Connect your WordPress site in Settings first (WP Publisher needs it).");
      return;
    }
    setNoKey(false);
    setLoading(true); setError(""); setPubMsg(""); setArticle("");
    try {
      const text = await generate();
      setPubMsg("Publishing to WordPress…");
      const r = await fetch("/api/wp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...wp, action: "publish", title: t.replace(/\.$/, ""), content: mdToWpHtml(text), status: "draft" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || d.error || "Publish failed");
      setPubMsg(`✓ Draft published to WordPress! `);
      setPubLink(d.link);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed.";
      setError(msg === "NO_KEY" ? "NO_KEY" : msg);
      if (msg === "NO_KEY") setNoKey(true);
    } finally {
      setLoading(false);
    }
  }

  const [pubLink, setPubLink] = useState("");

  function sendToPublisher() {
    if (!article) return;
    const title = topic.trim().replace(/\.$/, "");
    try {
      localStorage.setItem("geo-wp-draft", JSON.stringify({ title, content: article, at: Date.now() }));
    } catch { /* noop */ }
    router.push("/wp-publisher");
  }

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([article], { type: "text/markdown" }));
    a.download = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + ".md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Gate tool="ai-writer" name="AI Article Writer">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>AI Article <span className="g">Writer</span></h1>
          <p>Topic in → GEO-optimized, citation-ready article out. Uses your OpenAI or DeepSeek key from Settings.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. AI chatbots for dental clinics" onKeyDown={(e) => e.key === "Enter" && run()} />
          </div>
          <div className="formgrid">
            <div className="field">
              <label>Content type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option>Blog post</option><option>Guide</option><option>Landing page</option>
              </select>
            </div>
            <div className="field">
              <label>Length</label>
              <select value={words} onChange={(e) => setWords(Number(e.target.value))}>
                <option value={800}>~800 words</option>
                <option value={1200}>~1,200 words</option>
                <option value={2000}>~2,000 words</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>AI provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value as "auto" | "openai" | "deepseek")}>
              <option value="auto">Auto (OpenAI → DeepSeek)</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={run} disabled={loading || topic.trim().length < 3}>
              {loading ? <><span className="spin" />Writing…</> : "✍️ Write article →"}
            </button>
            <button className="btn ghost" onClick={writeAndPublish} disabled={loading || topic.trim().length < 3}>
              ✍️🚀 Write & publish as draft
            </button>
          </div>
          {pubMsg && <p style={{ marginTop: 12, color: "var(--green)", fontWeight: 700 }}>{pubMsg}{pubLink && <a href={pubLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>View draft →</a>}</p>}
          {error && error !== "NO_KEY" && <p className="err">{error}</p>}
        </div>

        {noKey && (
          <ApiRequired apiName="OpenAI API Key or DeepSeek API Key">
            The writer uses your own OpenAI or DeepSeek API key (BYO model — we never pay for your calls).
            Paste it in Settings; it stays in your browser.
          </ApiRequired>
        )}

        {article && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 19 }}>📝 Draft ready <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 400 }}>· {article.split(/\s+/).length} words</span></h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="no-print">
                <button className="btn ghost" onClick={() => navigator.clipboard.writeText(article)}>Copy</button>
                <button className="btn ghost" onClick={download}>Download .md</button>
                <button className="btn" onClick={sendToPublisher}>→ Publish to WordPress</button>
              </div>
            </div>
            <div className="outbox" style={{ maxHeight: "none" }}>
              <div style={{ padding: 22, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: mdToHtml(article) }} />
            </div>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
