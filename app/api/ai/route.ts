import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/ai { provider: "openai"|"deepseek", apiKey, messages, model?, max_tokens?, temperature? }
// Proxies the user's OWN AI key to the provider. The key is never stored or logged.
const MODELS: Record<string, { url: string; def: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", def: "gpt-4o-mini" },
  deepseek: { url: "https://api.deepseek.com/chat/completions", def: "deepseek-chat" },
};

export async function POST(req: NextRequest) {
  let body: {
    provider?: string; apiKey?: string; messages?: { role: string; content: string }[];
    model?: string; max_tokens?: number; temperature?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { provider, apiKey, messages, model, max_tokens, temperature } = body;
  const cfg = provider ? MODELS[provider] : undefined;
  if (!cfg || !apiKey || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "NO_KEY" }, { status: 400 });
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch(cfg.url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || cfg.def,
        messages: messages.slice(0, 20),
        max_tokens: Math.min(max_tokens || 4000, 16000),
        temperature: temperature ?? 0.7,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = d?.error?.message || `HTTP ${r.status}`;
      return Response.json({ error: "AI_ERROR", detail: String(msg).slice(0, 300) }, { status: 502 });
    }
    const text: string = d?.choices?.[0]?.message?.content || "";
    return Response.json({ text });
  } catch (e: unknown) {
    return Response.json(
      { error: "AI_ERROR", detail: e instanceof Error ? e.message : "Request failed" },
      { status: 502 }
    );
  } finally {
    clearTimeout(t);
  }
}
