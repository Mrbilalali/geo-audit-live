export interface AuditRecord {
  url: string;
  score: number;
  tier: string;
  at: string;
}

const KEY = "geo-toolkit-audit-history";

export function saveAudit(r: AuditRecord): void {
  try {
    const cur = getHistory();
    cur.unshift(r);
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, 20)));
  } catch { /* storage unavailable */ }
}

export function getHistory(): AuditRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuditRecord[]) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
