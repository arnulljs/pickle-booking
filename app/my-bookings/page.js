"use client";
import { useState } from "react";

export default function Mine() {
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [list, setList] = useState(null);
  async function find() {
    const r = await fetch(`/api/bookings?phone=${encodeURIComponent(phone)}&ref=${encodeURIComponent(ref.trim().toUpperCase())}`);
    setList(await r.json());
  }
  return (
    <div className="wrap">
      <h2>My bookings</h2>
      <div className="card">
        <p><input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /></p>
        <p><input placeholder="Ref BK-XXXX (optional)" value={ref} onChange={(e) => setRef(e.target.value)} /></p>
        <button onClick={find} disabled={!phone.trim()}>Find</button>
      </div>
      {list?.bookings?.map((b) => (
        <div className="card" key={b.id}>
          <b>{b.id}</b> · {b.court_id} · {b.date} · {b.start}:00–{b.end}:00 · ₱{b.amount} · {b.status}
          <div className="muted">{b.pay_method} {b.pay_ref}</div>
        </div>
      ))}
      {list && list.bookings?.length === 0 && <p className="muted">No bookings found.</p>}
    </div>
  );
}
