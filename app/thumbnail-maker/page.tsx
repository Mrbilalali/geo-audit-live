"use client";

import Gate from "../../components/Gate";
import { useEffect, useRef, useState } from "react";

const TEMPLATES = [
  { name: "Ocean", from: "#0c4a6e", to: "#082f49", accent: "#38bdf8" },
  { name: "Sunset", from: "#7c2d12", to: "#431407", accent: "#fb923c" },
  { name: "Forest", from: "#14532d", to: "#052e16", accent: "#4ade80" },
  { name: "Royal", from: "#4c1d95", to: "#1e1b4b", accent: "#a78bfa" },
  { name: "Crimson", from: "#7f1d1d", to: "#1c0a0a", accent: "#f87171" },
  { name: "Slate", from: "#1e293b", to: "#020617", accent: "#94a3b8" },
];

const SIZES = [
  { name: "Blog / OG (1200×630)", w: 1200, h: 630 },
  { name: "YouTube (1280×720)", w: 1280, h: 720 },
  { name: "Square (1080×1080)", w: 1080, h: 1080 },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export default function ThumbnailMaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState("How AI Chatbots 10x Your Leads");
  const [subtitle, setSubtitle] = useState("The complete 2026 guide");
  const [brand, setBrand] = useState("GEO Toolkit");
  const [tpl, setTpl] = useState(0);
  const [size, setSize] = useState(0);

  const T = TEMPLATES[tpl];
  const S = SIZES[size];

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = S;

    // background
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, T.from);
    g.addColorStop(1, T.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // decorative circles
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = T.accent;
    ctx.beginPath(); ctx.arc(w * 0.88, h * 0.15, h * 0.42, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.06, h * 0.95, h * 0.3, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

    // brand bar
    const pad = w * 0.07;
    ctx.fillStyle = T.accent;
    ctx.fillRect(pad, h * 0.1, w * 0.09, h * 0.018);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(h * 0.042)}px Segoe UI, system-ui, sans-serif`;
    ctx.fillText(brand.toUpperCase().slice(0, 28), pad, h * 0.1 + h * 0.075);

    // title
    const titleSize = Math.round(h * (S.w === S.h ? 0.075 : 0.105));
    ctx.font = `800 ${titleSize}px Segoe UI, system-ui, sans-serif`;
    ctx.fillStyle = "#ffffff";
    const lines = wrapText(ctx, title || "Your Title Here", w - pad * 2);
    const lh = titleSize * 1.18;
    let y = h * 0.42;
    for (const ln of lines) { ctx.fillText(ln, pad, y); y += lh; }

    // subtitle pill
    if (subtitle.trim()) {
      const subSize = Math.round(h * 0.04);
      ctx.font = `600 ${subSize}px Segoe UI, system-ui, sans-serif`;
      const tw = ctx.measureText(subtitle).width;
      const px = pad, py = y + h * 0.02, ph = subSize * 2;
      ctx.fillStyle = "rgba(255,255,255,.14)";
      ctx.beginPath();
      ctx.roundRect(px, py, tw + subSize * 1.6, ph, ph / 2);
      ctx.fill();
      ctx.fillStyle = T.accent;
      ctx.fillText(subtitle, px + subSize * 0.8, py + subSize * 1.42);
    }

    // bottom accent line
    ctx.fillStyle = T.accent;
    ctx.fillRect(0, h - h * 0.02, w, h * 0.02);
  });

  function download() {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "thumbnail.png";
    a.click();
  }

  return (
    <Gate tool="thumbnail-maker" name="Thumbnail Maker">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">🤖 AI Studio</div>
          <h1>Thumbnail <span className="g">Maker</span></h1>
          <p>Design click-worthy thumbnails for blogs & YouTube in seconds — rendered live, downloaded as PNG.</p>
        </div>

        <div className="dashcols">
          <div className="card no-print" style={{ marginTop: 0 }}>
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Main headline" />
            </div>
            <div className="field">
              <label>Subtitle</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Supporting line" />
            </div>
            <div className="field">
              <label>Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Your brand" />
            </div>
            <div className="field">
              <label>Template</label>
              <div className="tabs">
                {TEMPLATES.map((t, i) => (
                  <button key={t.name} className={"tab" + (tpl === i ? " on" : "")} onClick={() => setTpl(i)}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: t.accent, marginRight: 6, verticalAlign: -1 }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Size</label>
              <div className="tabs">
                {SIZES.map((s, i) => (
                  <button key={s.name} className={"tab" + (size === i ? " on" : "")} onClick={() => setSize(i)}>{s.name}</button>
                ))}
              </div>
            </div>
            <button className="btn" onClick={download}>⬇ Download PNG</button>
          </div>

          <div className="card" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>Live preview</h2>
            <canvas ref={canvasRef} width={S.w} height={S.h} style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>
              Tip: use it as your WordPress featured image or YouTube thumbnail.
            </p>
          </div>
        </div>

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
