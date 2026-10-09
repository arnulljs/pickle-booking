"use client";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("pending");
  // manual/block form
  const [f, setF] = useState({ court_id: "c1", date: new Date().toISOString().slice(0, 10), start: 17, end: 18, name: "", phone: "", pay_method: "cash", note: "" });
  const [set_, setSet] = useState({});

  async function load() {
    const r = await fetch("/api/admin");
    if (r.ok) { const j = await r.json(); setAuthed(true); setD(j); setSet(j.settings || {}); }
  }
  useEffect(() => { load(); }, []);

  async function login() {
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: pw }) });
    if (r.ok) load(); else alert("Wrong password (default admin123, set ADMIN_PASSWORD)");
  }
  async function act(action, payload) {
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
    const j = await r.json();
    if (!r.ok) alert(j.error || "Failed");
    load();
  }
  if (!authed) return (
    <div className="wrap"><h2>Admin</h2><div className="card">
      <p><input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} /></p>
      <button onClick={login}>Sign in →</button>
      <p className="muted">Default: admin123 — set ADMIN_PASSWORD env.</p>
    </div></div>
  );
  const rows = d ? (tab === "pending" ? d.pending : tab === "upcoming" ? d.upcoming : d.all) : [];
  return (
    <div className="wrap">
      <h2>Admin</h2>
      <div className="bar">
        {[["pending", `Pending (${d?.pending.length ?? 0})`], ["upcoming", "Upcoming"], ["all", "All"], ["manage", "Block / Manual / Settings"]].map(([id, l]) => (
          <button key={id} className={tab === id ? "" : "ghost"} onClick={() => setTab(id)}>{l}</button>
        ))}
        <button className="ghost" onClick={load}>↻</button>
      </div>
      {tab !== "manage" && (rows || []).map((b) => (
        <div className="card" key={b.id}>
          <b>{b.id}</b> · {b.name} · {b.phone} · {b.court_id} · {b.date} · {b.start}:00–{b.end}:00 · ₱{b.amount} · {b.status}
          <div className="muted">{b.pay_method} {b.pay_ref} {b.proof && <a href={b.proof} target="_blank">proof</a>}</div>
          {b.status === "pending" && <div className="bar">
            <button onClick={() => act("approve", { id: b.id })}>Approve</button>
            <button className="ghost" onClick={() => act("decline", { id: b.id })}>Decline</button>
          </div>}
        </div>
      ))}
      {tab === "manage" && (
        <>
          <div className="card"><h3>Block time</h3>
            <div className="bar">
              <select value={f.court_id} onChange={(e) => setF({ ...f, court_id: e.target.value })}><option value="c1">Court 1</option><option value="c2">Court 2</option></select>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              <input type="number" value={f.start} min="0" max="30" onChange={(e) => setF({ ...f, start: e.target.value })} />
              <input type="number" value={f.end} min="0" max="30" onChange={(e) => setF({ ...f, end: e.target.value })} />
            </div>
            <button onClick={() => act("block", { court_id: f.court_id, date: f.date, start: f.start, end: f.end, label: "Blocked" })}>+ Block</button>
            {(d?.blocks || []).map((b) => <div key={b.id} className="muted">{b.court_id} {b.date} {b.start}–{b.end} {b.label} <button className="ghost" onClick={() => act("unblock", { id: b.id })}>x</button></div>)}
          </div>
          <div className="card"><h3>Manual booking (walk-in)</h3>
            <p><input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></p>
            <p><input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></p>
            <button onClick={() => act("manual", f)}>Save approved</button>
          </div>
          <div className="card"><h3>Settings (price / hours / payments)</h3>
            {["price_per_hr", "open", "close", "gcash_no", "gcash_name", "bank_acct", "bank_name"].map((k) => (
              <p key={k}><label className="muted">{k}</label><input value={set_[k] || ""} onChange={(e) => setSet({ ...set_, [k]: e.target.value })} /></p>
            ))}
            <button onClick={() => act("settings", { settings: set_ })}>Save</button>
          </div>
        </>
      )}
    </div>
  );
}
