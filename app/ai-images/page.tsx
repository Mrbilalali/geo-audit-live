"use client";

import Gate from "../../components/Gate";
import ApiRequired from "../../components/ApiRequired";
import { useState } from "react";
import { generateImage, getAiCreds } from "../../lib/ai";

const STYLES = ["Photorealistic", "Digital art", "Minimalist", "3D render", "Watercolor"];
const SIZES = [
  { label: "Square (1024×1024)", v: "1024x1024" },
  { label: "Wide (1792×1024)", v: "1792x1024" },
  { label: "Tall (1024×1792)", v: "1024x1792" },
];

export default function AiImages() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0]);
  const [size, setSize] = useState(SIZES[0].v);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [img, setImg] = useState("");
  const [noKey, setNoKey] = useState(false);

  async function run() {
    const p = prompt.trim();
    if (!p || loading) return;
    const creds = getAiCreds();
    if (!creds || creds.provider !== "openai") { setNoKey(true); return; }
    setNoKey(false);
    setLoading(true); setError(""); setImg("");
    try {
      const full = `${p}, ${style.toLowerCase()} style, high quality, no text overlay`;
      const { imageUrl } = await generateImage(full, size);
      if (!imageUrl) throw new Error("No image returned.");
      setImg(imageUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed.";
      if (msg === "NO_KEY") setNoKey(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Gate tool="ai-images" name="AI Image Generator">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>AI Image <span className="g">Generator</span></h1>
          <p>Describe it → DALL-E 3 creates it. Uses your OpenAI key from Settings.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Image prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ minHeight: 90 }}
              placeholder="e.g. a friendly robot helping a dentist in a bright modern clinic" />
          </div>
          <div className="formgrid">
            <div className="field">
              <label>Style</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <button className="btn" onClick={run} disabled={loading || prompt.trim().length < 4}>
            {loading ? <><span className="spin" />Generating… (takes ~30s)</> : "🎨 Generate image →"}
          </button>
          {error && <p className="err">{error}</p>}
        </div>

        {noKey && (
          <ApiRequired apiName="OpenAI API Key">
            Image generation uses DALL-E 3, which needs an OpenAI API key (DeepSeek cannot generate images).
            Add it in Settings — it stays in your browser.
          </ApiRequired>
        )}

        {img && (
          <div className="card center">
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your image</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={prompt} style={{ maxWidth: "100%", borderRadius: 14, border: "1px solid var(--line)" }} />
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>
              DALL-E links expire after ~1 hour — download now.
            </p>
            <a href={img} download="ai-image.png" target="_blank" rel="noreferrer" className="btn no-print" style={{ textDecoration: "none", display: "inline-block", marginTop: 10 }}>
              ⬇ Download PNG
            </a>
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
