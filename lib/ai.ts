import { getApiKey } from "./keys";

export type AiProvider = "openai" | "deepseek";

export function getAiCreds(prefer?: AiProvider): { provider: AiProvider; apiKey: string } | null {
  const openai = getApiKey("openai_key");
  const deepseek = getApiKey("deepseek_key");
  if (prefer === "openai" && openai) return { provider: "openai", apiKey: openai };
  if (prefer === "deepseek" && deepseek) return { provider: "deepseek", apiKey: deepseek };
  if (openai) return { provider: "openai", apiKey: openai };
  if (deepseek) return { provider: "deepseek", apiKey: deepseek };
  return null;
}

export interface AiMsg { role: "system" | "user" | "assistant"; content: string; }

export async function callAi(
  messages: AiMsg[],
  opts?: { provider?: AiProvider; max_tokens?: number; temperature?: number }
): Promise<string> {
  const creds = getAiCreds(opts?.provider);
  if (!creds) throw new Error("NO_KEY");
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: creds.provider,
      apiKey: creds.apiKey,
      messages,
      max_tokens: opts?.max_tokens,
      temperature: opts?.temperature,
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || d.error || "AI request failed");
  return d.text as string;
}

export function getWpCreds(): { site: string; user: string; appPassword: string } | null {
  const site = getApiKey("wp_url");
  const user = getApiKey("wp_user");
  const appPassword = getApiKey("wp_app_password");
  if (!site || !user || !appPassword) return null;
  return { site, user, appPassword };
}
