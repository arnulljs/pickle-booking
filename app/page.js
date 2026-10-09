"use client";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

function fmt(h) {
  const hh = ((h % 24) + 24) % 24;
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:00 ${ap}`;
}
function todayStr(off = 0) {
  const d = new Date();
  d.setDate(d.getDate() + off);
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [court, setCourt] = useState("c1");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  useEffect(() => {
    fetch(`/api/availability?date=${date}`).then((r) => r.json()).then((j) => {
      setData(j);
      setStart(null); setEnd(null);
      if (j.courts?.length) setCourt(j.courts[0].id);
    });
  }, [date]);

  function tap(c, h) {
    if (c !== court) { setCourt(c); setStart(h); setEnd(h + 1); return; }
    if (start == null || (start != null && end != null && h !== end && h !== start - 1 && !(h === start && end === start + 1))) {
      // fresh pick unless extending contiguously
      if (start == null) { setStart(h); setEnd(h + 1); return; }
    }
    if (start == null) { setStart(h); setEnd(h + 1); }
    else if (h === start && end === start + 1) { setStart(null); setEnd(null); }
    else if (h >= end) setEnd(h + 1);
    else if (h === start - 1) setStart(h);
    else { setStart(h); setEnd(h + 1); }
  }

  const total = data && start != null ? (end - start) * data.rate : 0;

  return (
    <div className="wrap">
      <h2>Book a court</h2>
      <p className="muted">Tap a start slot, then tap an end slot on the same court. ₱{data?.rate ?? 400}/hr · 5PM–2AM.</p>
      <div className="bar">
        <button className="ghost" onClick={() => setDate(todayStr(-1))}>‹ Prev</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 170 }} />
        <button className="ghost" onClick={() => setDate(todayStr(1))}>Next ›</button>
        <button className="ghost" onClick={() => { setStart(null); setEnd(null); }}>Reset</button>
      </div>
      {!data ? <p>Loading…</p> : (
        <table className="grid">
          <thead><tr><th>Time</th>{data.courts.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
          <tbody>
            {data.hours.map((h) => (
              <tr key={h}>
                <td className="timecol">{fmt(h)}</td>
                {data.courts.map((c) => {
                  const st = data.cells[c.id][h];
                  const sel = c.id === court && start != null && h >= start && h < end;
                  const label = st === "open" ? "Open" : st === "pending" ? "Pending" : st === "blocked" ? "Closed" : "Taken";
                  return (
                    <td key={c.id}>
                      <button
                        className={`slot ${st !== "open" ? st : ""} ${sel ? "sel" : ""}`}
                        disabled={st !== "open"}
                        onClick={() => tap(c.id, h)}
                      >{label}<small>{fmt(h)}–{fmt(h + 1)}</small></button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="legend">
        <span><i className="dot" style={{ background: "#e8f5e9", border: "1px solid #ccc" }} />Open</span>
        <span><i className="dot" style={{ background: "#fff8e1" }} />Pending</span>
        <span><i className="dot" style={{ background: "#ffebee" }} />Taken/Closed</span>
      </div>
      <div className="card">
        <b>Selection:</b> {start == null ? "— tap a green slot" : `${data?.courts.find((c) => c.id === court)?.name} · ${date} · ${fmt(start)}–${fmt(end)} · ${end - start}hr · ₱${total}`}
        <div style={{ marginTop: 10 }}>
          <a className="btn" style={{ opacity: start == null ? .4 : 1, pointerEvents: start == null ? "none" : "auto" }}
            href={start != null ? `/book?date=${date}&court=${court}&start=${start}&end=${end}` : "#"}>Continue →</a>
        </div>
      </div>
    </div>
  );
}
