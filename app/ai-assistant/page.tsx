"use client";

import Gate from "../../components/Gate";
import ApiRequired from "../../components/ApiRequired";
import { useEffect, useRef, useState } from "react";
import { callAi, getAiCreds, AiMsg } from "../../lib/ai";

const ASSISTANT_SYSTEM = `You are the GEO Toolkit AI assistant — a friendly, expert SEO/GEO helper built into the toolkit (think of yourself like Muse: warm, direct, genuinely useful).

YOUR TOOLKIT (25 tools) — recommend the right one by name:
ANALYZE: Live Audit (15 live AI-visibility checks of any URL), Keyword Suggest (real Google autocomplete ideas), Traffic Overview (needs user's DataForSEO key), Entity Extractor, N-gram Analyzer, Heading Analyzer, Readability.
CREATE: Optimizer Pro (20-rule semantic scoring), Content Checker, Brief Builder, SERP Preview.
TECHNICAL: Schema Kit (generators), Schema Validator, Sitemap Tools, Bulk Meta (10 URLs), robots.txt Validator, Prompt Kit.
SEARCH DATA: GSC Analyzer (upload Search Console CSV → CTR opportunities), Backlink Analyzer (CSV → referring domains/anchors).
AI STUDIO: AI Command Center (one prompt → audits/writes/publishes), AI Writer (GEO articles), AI Images (DALL-E 3), WP Publisher (publish to WordPress), Thumbnail Maker, AI Assistant (you!).

KEY FACTS:
- Free plan: Live Audit 3/month, Content Checker 3/month, SERP Preview / Readability / Keyword Suggest unlimited. Everything else is Pro.
- Pro: $9/mo launch (reg $29) or $100 lifetime for first 100 (reg $5,000). License key from Gumroad unlocks Pro on the Pricing page.
- API keys (OpenAI/DeepSeek for AI tools, DataForSEO for traffic, WordPress app password for publishing) are added by the user in Settings and stay in their browser.
- GEO = Generative Engine Optimization: getting cited by ChatGPT, Perplexity, Google AI. Core rules: answer-first (direct answer in first 40 words), short paragraphs, real entities, FAQs, schema markup, allow AI bots in robots.txt, keep an llms.txt.

STYLE: concise, warm, practical. Answer directly, then point to the exact tool. Use short paragraphs and occasional bullets. Never invent features that don't exist above. If asked to DO something (write, audit, publish), explain you can't click buttons but the AI Command Center can execute multi-step tasks — tell them what prompt to paste there.`;

const SUGGESTIONS = [
  "How do I get cited by ChatGPT?",
  "Which tool checks my schema?",
  "My CTR is low — what should I do?",
  "Explain GEO in simple words",
];

interface Msg { role: "user" | "assistant"; text: string; }

export default function AiAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Hey! I'm your GEO Toolkit assistant. Ask me anything about SEO, AI search visibility, or which tool to use — or tell me what you're trying to rank for and I'll map out the moves. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    if (!getAiCreds()) { setNoKey(true); return; }
    setNoKey(false);
    const next = [...msgs, { role: "user" as const, text: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const history: AiMsg[] = [
        { role: "system", content: ASSISTANT_SYSTEM },
        ...next.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.text })),
      ];
      const reply = await callAi(history, { max_tokens: 1200, temperature: 0.7 });
      setMsgs([...next, { role: "assistant", text: reply || "Hmm, I got an empty reply — try again." }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed.";
      if (msg === "NO_KEY") setNoKey(true);
      else setMsgs([...next, { role: "assistant", text: `Something went wrong: ${msg}. Try again in a moment.` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Gate tool="ai-assistant" name="AI Assistant">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>AI <span className="g">Assistant</span></h1>
          <p>Your Muse-style SEO copilot — knows every tool in this toolkit. Powered by your AI key.</p>
        </div>

        {noKey && (
          <ApiRequired apiName="OpenAI API Key or DeepSeek API Key">
            The assistant runs on your OpenAI or DeepSeek key. Add it in Settings — it stays in your browser.
          </ApiRequired>
        )}

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 480, overflowY: "auto", marginBottom: 16 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? "var(--accent-dim)" : "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                borderTopRightRadius: m.role === "user" ? 4 : 14,
                borderTopLeftRadius: m.role === "assistant" ? 4 : 14,
                padding: "11px 15px",
                fontSize: 14.5,
                whiteSpace: "pre-wrap",
              }}>
                {m.role === "assistant" && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 800, marginBottom: 4, letterSpacing: 1 }}>ASSISTANT</div>}
                {m.text}
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: "flex-start", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "11px 18px", fontSize: 14.5, color: "var(--muted)" }}>
                <span className="spin" /> thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }} className="no-print">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="tab" onClick={() => send(s)} disabled={busy}>{s}</button>
            ))}
          </div>

          <div className="urlrow no-print" style={{ marginTop: 0 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask anything about SEO or GEO…" aria-label="Message" />
            <button className="btn" onClick={() => send()} disabled={busy || input.trim().length < 2}>Send →</button>
          </div>
        </div>

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
