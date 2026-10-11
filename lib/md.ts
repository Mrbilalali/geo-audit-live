// Tiny markdown → HTML renderer (headings, bold, lists, paragraphs).
export function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*]+)\*/g, "<i>$1</i>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = md.split("\n");
  let html = "";
  let inList: "ul" | "ol" | null = null;
  const closeList = () => {
    if (inList) { html += `</${inList}>`; inList = null; }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (/^#{1,4}\s/.test(line)) {
      closeList();
      const lvl = line.match(/^#+/)![0].length;
      html += `<h${Math.min(lvl + 1, 4)}>${inline(line.replace(/^#+\s*/, ""))}</h${Math.min(lvl + 1, 4)}>`;
    } else if (/^---+$/.test(line)) {
      closeList();
      html += "<hr/>";
    } else if (/^[-*]\s+/.test(line)) {
      if (inList !== "ul") { closeList(); html += "<ul>"; inList = "ul"; }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`;
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (inList !== "ol") { closeList(); html += "<ol>"; inList = "ol"; }
      html += `<li>${inline(line.replace(/^\d+[.)]\s+/, ""))}</li>`;
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

// Markdown → plain-ish HTML paragraphs for WordPress (keeps headings/bold/lists).
export function mdToWpHtml(md: string): string {
  return mdToHtml(md);
}
