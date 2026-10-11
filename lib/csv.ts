// Minimal robust CSV parser (handles quoted fields, commas inside quotes).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      row.push(cur); cur = "";
    } else if (c === "\n") {
      row.push(cur); cur = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else if (c === "\r") {
      /* skip */
    } else cur += c;
  }
  row.push(cur);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const num = (s: string): number => {
  const v = parseFloat(s.replace(/[% ,]/g, ""));
  return isNaN(v) ? 0 : v;
};

export interface GscRow {
  label: string;
  clicks: number;
  impressions: number;
  ctr: number; // percent 0-100
  position: number;
  section: string;
}

// Parses Google Search Console performance CSV exports
// (handles "Top queries" and "Top pages" sections in one file).
export function parseGsc(rows: string[][]): GscRow[] {
  const out: GscRow[] = [];
  let section = "";
  let cols: string[] = [];
  for (const r of rows) {
    const cells = r.map((c) => c.trim());
    const low = cells.map((c) => c.toLowerCase());
    if (cells.length === 1 && cells[0] !== "") {
      section = cells[0];
      cols = [];
      continue;
    }
    if (low.includes("clicks") && low.includes("impressions")) {
      cols = low;
      continue;
    }
    if (cols.length > 0 && cells.length >= 3) {
      const li = cols.findIndex((c) => c.includes("click"));
      const ii = cols.findIndex((c) => c.includes("impression"));
      const ci = cols.findIndex((c) => c.includes("ctr"));
      const pi = cols.findIndex((c) => c.includes("position"));
      const qi = cols.findIndex((c) => c.includes("quer") || c.includes("keyword"));
      const gi = cols.findIndex((c) => c.includes("page") || c.includes("url") || c.includes("link"));
      const labelIdx = qi >= 0 ? qi : gi >= 0 ? gi : 0;
      const label = cells[labelIdx] || "";
      if (!label || /^query|page$/i.test(label)) continue;
      out.push({
        label,
        clicks: num(cells[li] || "0"),
        impressions: num(cells[ii] || "0"),
        ctr: num(cells[ci] || "0"),
        position: num(cells[pi] || "0"),
        section,
      });
    }
  }
  return out;
}
