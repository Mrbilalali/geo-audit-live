"use client";

import Gate from "../../components/Gate";
import { useEffect, useRef, useState } from "react";
import {
  Client, ClientStatus, STATUS_META,
  loadClients, saveClients, emptyClient, followUpsDue,
} from "../../lib/crm";

const STATUSES: ClientStatus[] = ["lead", "prospect", "client", "lost"];

export default function Crm() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<Client>(emptyClient());
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | ClientStatus>("all");
  const [query, setQuery] = useState("");
  const [sites, setSites] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setClients(loadClients());
    try {
      const raw = localStorage.getItem("gtk_sites");
      setSites(raw ? JSON.parse(raw) : []);
    } catch { /* noop */ }
  }, []);

  function persist(next: Client[]) {
    setClients(next); saveClients(next);
  }

  function submit() {
    if (!form.name.trim()) return;
    if (editing) {
      persist(clients.map((c) => (c.id === editing ? { ...form, name: form.name.trim() } : c)));
    } else {
      persist([...clients, { ...form, name: form.name.trim() }]);
    }
    setForm(emptyClient()); setEditing(null); setShowForm(false);
  }

  function startEdit(c: Client) {
    setForm({ ...c }); setEditing(c.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!window.confirm("Delete this client?")) return;
    persist(clients.filter((c) => c.id !== id));
  }

  function setStatus(id: string, status: ClientStatus) {
    persist(clients.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  function markContacted(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    persist(clients.map((c) => (c.id === id ? { ...c, lastContact: today, nextFollowUp: "" } : c)));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(clients, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `geo-toolkit-crm-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(file: File) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const arr = JSON.parse(String(rd.result));
        if (!Array.isArray(arr)) throw new Error("bad file");
        const cleaned = arr
          .filter((c) => c && typeof c.name === "string")
          .map((c) => ({ ...emptyClient(), ...c, id: typeof c.id === "string" ? c.id : emptyClient().id }));
        const ids = new Set(clients.map((c) => c.id));
        persist([...clients, ...cleaned.filter((c) => !ids.has(c.id))]);
      } catch { alert("Could not read that file."); }
    };
    rd.readAsText(file);
  }

  const due = followUpsDue(clients);
  const counts = STATUSES.map((s) => ({ s, n: clients.filter((c) => c.status === s).length }));
  const visible = clients.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return [c.name, c.company, c.email, c.website].some((v) => v.toLowerCase().includes(q));
    }
    return true;
  });

  const set = (k: keyof Client, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const fld = (label: string, body: React.ReactNode) => (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>{label}</label>
      {body}
    </div>
  );

  return (
    <Gate tool="crm" name="Client CRM">
      <div className="wrap" style={{ maxWidth: 1080 }}>
        <div className="pagehead">
          <div className="badge">👥 Clients</div>
          <h1>Client <span className="g">CRM</span></h1>
          <p>Every client in one place — pipeline, follow-ups, notes & their monitored sites.</p>
        </div>

        {due.length > 0 && (
          <div className="card" style={{ borderColor: "rgba(245,158,11,.5)" }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>⏰ Follow-ups due ({due.length})</h2>
            {due.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                <span><b>{c.name}</b>{c.company && <span style={{ color: "var(--muted)" }}> · {c.company}</span>}
                  <span style={{ color: "var(--amber)", marginLeft: 8, fontSize: 12.5 }}>due {c.nextFollowUp}</span></span>
                <button className="tab no-print" onClick={() => markContacted(c.id)}>✓ Done</button>
              </div>
            ))}
          </div>
        )}

        <div className="dashcols" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {counts.map(({ s, n }) => (
            <div className="statcard" key={s} onClick={() => setFilter(filter === s ? "all" : s)}
              style={{ cursor: "pointer", outline: filter === s ? `2px solid ${STATUS_META[s].color}` : "none" }}>
              <div className="n" style={{ color: STATUS_META[s].color }}>{n}</div>
              <div className="l">{STATUS_META[s].label}s</div>
            </div>
          ))}
        </div>

        <div className="card no-print">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={() => { setForm(emptyClient()); setEditing(null); setShowForm(!showForm); }}>
              {showForm ? "Close ✕" : "+ Add client"}
            </button>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 Search clients…"
              style={{ maxWidth: 260 }} aria-label="Search clients" />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn ghost" onClick={exportJson}>⬇ Export</button>
              <button className="btn ghost" onClick={() => fileRef.current?.click()}>⬆ Import</button>
              <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
            </div>
          </div>

          {showForm && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 4 }}>
                {fld("Name *", <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Client name" />)}
                {fld("Company", <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company" />)}
                {fld("Email", <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@…" type="email" />)}
                {fld("Phone", <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92…" />)}
                {fld("Website", <>
                  <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" list="crm-sites" />
                  <datalist id="crm-sites">{sites.map((s) => <option key={s} value={s} />)}</datalist>
                </>)}
                {fld("Status", (
                  <select value={form.status} onChange={(e) => set("status", e.target.value as ClientStatus)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                ))}
                {fld("Last contact", <input type="date" value={form.lastContact} onChange={(e) => set("lastContact", e.target.value)} />)}
                {fld("Next follow-up", <input type="date" value={form.nextFollowUp} onChange={(e) => set("nextFollowUp", e.target.value)} />)}
              </div>
              {fld("Notes", <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                placeholder="Context, goals, what was discussed…" style={{ minHeight: 70 }} />)}
              <button className="btn" onClick={submit} disabled={!form.name.trim()}>
                {editing ? "Save changes ✓" : "Add client →"}
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ overflowX: "auto" }}>
          {visible.length === 0 ? (
            <div className="center" style={{ padding: "24px 0" }}>
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>👥 No clients yet</h2>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Add your first client above — track them from lead to paying client.</p>
            </div>
          ) : (
            <table className="tracktable" style={{ minWidth: 760 }}>
              <thead><tr><th>Client</th><th>Contact</th><th>Status</th><th>Next follow-up</th><th></th></tr></thead>
              <tbody>
                {visible.map((c) => {
                  const m = STATUS_META[c.status];
                  const overdue = c.nextFollowUp && c.nextFollowUp <= new Date().toISOString().slice(0, 10) && c.status !== "lost";
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                        {c.company && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.company}</div>}
                        {c.website && <div style={{ fontSize: 12, color: "var(--accent)", wordBreak: "break-all" }}>{c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div style={{ color: "var(--muted)" }}>{c.phone}</div>}
                        {!c.email && !c.phone && <span style={{ color: "var(--muted)" }}>—</span>}
                      </td>
                      <td>
                        <select value={c.status} onChange={(e) => setStatus(c.id, e.target.value as ClientStatus)}
                          className="no-print" style={{ width: "auto", padding: "6px 8px", fontSize: 12.5, color: m.color, fontWeight: 700 }}>
                          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      </td>
                      <td style={{ fontSize: 13, color: overdue ? "var(--amber)" : "var(--muted)", fontWeight: overdue ? 700 : 400 }}>
                        {c.nextFollowUp || "—"}
                      </td>
                      <td className="no-print" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                        <button className="tab" onClick={() => startEdit(c)}>✎</button>
                        <button className="tab" onClick={() => markContacted(c.id)} title="Mark contacted today">✓</button>
                        <button className="tab" onClick={() => remove(c.id)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>
          💾 Clients are saved in this browser. Use Export regularly for backup — import the file on another device to carry them over.
        </p>

        <footer className="no-print">Built by <b>Mr Bilal Ali</b> · AI Automation Expert</footer>
      </div>
    </Gate>
  );
}
