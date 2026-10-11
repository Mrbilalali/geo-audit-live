// Client CRM — browser-local storage (per device). Export/import JSON for backup/transfer.
export type ClientStatus = "lead" | "prospect" | "client" | "lost";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  status: ClientStatus;
  notes: string;
  lastContact: string; // ISO date or ""
  nextFollowUp: string; // ISO date or ""
  createdAt: string; // ISO
}

const LS = "gtk_crm_clients";

export const STATUS_META: Record<ClientStatus, { label: string; color: string }> = {
  lead: { label: "Lead", color: "#f59e0b" },
  prospect: { label: "Prospect", color: "#38bdf8" },
  client: { label: "Client", color: "#3ecf8e" },
  lost: { label: "Lost", color: "#64748b" },
};

export function uid(): string {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(LS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveClients(c: Client[]): void {
  try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* noop */ }
}

export function emptyClient(): Client {
  return {
    id: uid(), name: "", company: "", email: "", phone: "", website: "",
    status: "lead", notes: "", lastContact: "", nextFollowUp: "",
    createdAt: new Date().toISOString(),
  };
}

export function followUpsDue(clients: Client[]): Client[] {
  const today = new Date().toISOString().slice(0, 10);
  return clients
    .filter((c) => c.nextFollowUp && c.nextFollowUp <= today && c.status !== "lost")
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));
}
