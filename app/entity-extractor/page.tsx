"use client";

import Gate from "../../components/Gate";
import { useState } from "react";

interface Ent { text: string; type: string; count: number; }

const ORG_HINT = /\b(Inc|LLC|Ltd|Corp|Corporation|GmbH|Labs|Studio|Agency|Group|Co\.|Company|AI|Technologies|Tech|Media|Ventures|Partners)\.?$/i;
const LOCATIONS = new Set(
  ("United States,USA,UK,United Kingdom,Canada,Australia,Germany,France,India,Pakistan,UAE,Dubai," +
   "New York,London,Los Angeles,Chicago,Houston,San Francisco,Berlin,Paris,Tokyo,Sydney,Toronto," +
   "Mumbai,Delhi,Lahore,Karachi,Islamabad,California,Texas,Florida,Europe,Asia,Africa,America," +
   "Silicon Valley,Manhattan,Brooklyn,Hollywood,Amsterdam,Singapore,Hong Kong,Boston,Seattle,Austin,Miami,Denver")
    .split(",").map((s) => s.toLowerCase())
);

function extract(text: string): Ent[] {
  const seqRe = /\b([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|of|the|and|for|de|la))+|[A-Z]{2,}(?:\s+[A-Z]{2,})*|[A-Z][a-z]+)\b/g;
  const counts = new Map<string, number>();
  const seenSingle = new Map<string, number>();
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    let m: RegExpExecArray | null;
    const re = new RegExp(seqRe);
    let first = true;
    while ((m = re.exec(s))) {
      const raw = m[1].replace(/\s+/g, " ").trim();
      if (raw.length < 2) { first = false; continue; }
      if (/^(The|A|An|And|But|Or|For|Nor|So|Yet|It|Its|This|That|These|Those|He|She|They|We|You|I)$/.test(raw)) { first = false; continue; }
      const words = raw.split(" ").length;
      if (words === 1 && first) {
        seenSingle.set(raw, (seenSingle.get(raw) || 0) + 1);
      } else {
        counts.set(raw, (counts.get(raw) || 0) + 1);
      }
      first = false;
    }
  }
  // single capitalized words seen 2+ times (anywhere) count as entities
  for (const [w, c] of seenSingle) if (c >= 2) counts.set(w, (counts.get(w) || 0) + c);

  const out: Ent[] = [];
  for (const [text_, count] of counts) {
    if (count < 1) continue;
    const low = text_.toLowerCase();
    let type = "Name";
    if (ORG_HINT.test(text_)) type = "Organization";
    else if (LOCATIONS.has(low)) type = "Location";
    else if (/^[A-Z]{2,}$/.test(text_.replace(/\s/g, ""))) type = "Acronym";
    out.push({ text: text_, type, count });
  }
  return out.sort((a, b) => b.count - a.count || b.text.length - a.text.length);
}

export default function EntityExtractor() {
  const [text, setText] = useState("");
  const [ents, setEnts] = useState<Ent[] | null>(null);

  function run() {
    if (text.trim().length < 20) return;
    setEnts(extract(text));
  }

  const typeColor = (t: string) =>
    t === "Organization" ? "#38bdf8" : t === "Location" ? "#3ecf8e" : t === "Acronym" ? "#f5a623" : "#c9d6ea";

  return (
    <Gate tool="entity-extractor" name="Entity Extractor">
      <div className="wrap">
        <div className="pagehead">
          <div className="badge">NLP pack</div>
          <h1>Entity <span className="g">Extractor</span></h1>
          <p>Paste any text — get every person, organization, location and acronym it mentions, with frequencies.</p>
        </div>

        <div className="card no-print">
          <div className="field">
            <label>Text to analyze</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an article, press release, or page copy here…" style={{ minHeight: 170 }} />
          </div>
          <button className="btn" onClick={run} disabled={text.trim().length < 20}>Extract entities →</button>
        </div>

        {ents && (
          <div className="card">
            <h2 style={{ fontSize: 19, marginBottom: 4 }}>{ents.length} unique entities found</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}>
              Tip: the most-mentioned entities are your topical anchors — mirror them in headings and schema.
            </p>
            {ents.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No clear entities detected. Try longer text with proper nouns.</p>
            ) : (
              <table className="tracktable">
                <thead><tr><th>Entity</th><th>Type</th><th className="c">Mentions</th></tr></thead>
                <tbody>
                  {ents.slice(0, 80).map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{e.text}</td>
                      <td><span style={{ color: typeColor(e.type), fontWeight: 700, fontSize: 13 }}>{e.type}</span></td>
                      <td className="c">{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ents.length > 0 && (
              <button className="btn ghost no-print" style={{ marginTop: 16 }} onClick={() => navigator.clipboard.writeText(ents.map((e) => e.text).join("\n"))}>
                Copy entity list
              </button>
            )}
          </div>
        )}

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
