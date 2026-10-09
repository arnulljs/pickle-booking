"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function Inner() {
  const q = useSearchParams();
  const date = q.get("date"), court = q.get("court"), start = Number(q.get("start")), end = Number(q.get("end"));
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [method, setMethod] = useState("gcash");
  const [payRef, setPayRef] = useState("");
  const [proof, setProof] = useState(null);
  const [info, setInfo] = useState(null);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/availability?date=${date}`).then((r) => r.json()).then(setInfo);
  }, [date]);

  const total = info ? (end - start) * info.rate : 0;

  function fileToDataUrl(f) {
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    });
  }

  async function submit() {
    setErr("");
    let proofDataUrl = null;
    if (proof) proofDataUrl = await fileToDataUrl(proof);
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ court_id: court, date, start, end, name, phone, pay_method: method, pay_ref: payRef, proofDataUrl }),
    });
    const j = await res.json();
    if (!res.ok) setErr(j.error || "Failed");
    else setDone(j);
  }

  if (!date || !court || !(end > start)) return <div className="wrap"><p>Bad slot. <a href="/">← Back</a></p></div>;
  if (done) return (
    <div className="wrap">
      <div className="card"><h3>Request received ✅</h3>
        <p>Ref: <b>{done.id}</b> · ₱{done.amount} · {done.status}</p>
        <p className="muted">Slot held 1 hour pending payment verify. Screenshot this ref. Admin confirms shortly.</p>
        <a className="btn" href="/">Book another</a>
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <div className="steps"><span className={step === 1 ? "on" : ""}>1 Slot</span><span className={step === 2 ? "on" : ""}>2 Details</span><span className={step === 3 ? "on" : ""}>3 Pay</span></div>
      {step === 1 && (
        <div className="card">
          <h3>Your slot</h3>
          <p>{info?.courts?.find((c) => c.id === court)?.name} · {date} · {start}:00–{end}:00 ({end - start}hr)</p>
          <p><b>Estimated total: ₱{total}</b></p>
          <button onClick={() => setStep(2)}>Your details →</button>
        </div>
      )}
      {step === 2 && (
        <div className="card">
          <h3>Your details</h3>
          <p><input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></p>
          <p><input placeholder="Phone (e.g. 0917…)" value={phone} onChange={(e) => setPhone(e.target.value)} /></p>
          <label><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: "auto" }} /> I agree bookings are non-refundable; rain reschedule subject to approval.</label>
          <div className="bar"><button className="ghost" onClick={() => setStep(1)}>← Back</button>
            <button disabled={!name.trim() || phone.trim().length < 7 || !agree} onClick={() => setStep(3)}>Payment →</button></div>
        </div>
      )}
      {step === 3 && (
        <div className="card">
          <h3>Pay · ₱{total}</h3>
          <p className="muted">{name} · {phone} · {date}</p>
          <div className="tabs">
            {[["gcash", "GCash"], ["card", "Card"], ["bank", "Bank"]].map(([id, l]) => (
              <button key={id} className={method === id ? "on ghost" : "ghost"} onClick={() => setMethod(id)}>{l}</button>
            ))}
          </div>
          <div className="card">
            {method === "gcash" && <p>Send to <b>{info?.settings?.gcash_no}</b> ({info?.settings?.gcash_name})</p>}
            {method === "bank" && <p>Transfer to <b>{info?.settings?.bank_acct}</b> ({info?.settings?.bank_name})</p>}
            {method === "card" && <p className="muted">Card via PayMongo — stub. If unconfigured, choose GCash/bank or pay on-site. Gateway plugs into <code>lib/payments.js</code>.</p>}
            <p className="muted">⏱ Slot held 1 hour after submit.</p>
            <p><input placeholder="Reference no. (optional)" value={payRef} onChange={(e) => setPayRef(e.target.value)} /></p>
            <p><input type="file" accept="image/*" onChange={(e) => setProof(e.target.files[0])} /></p>
          </div>
          {err && <p style={{ color: "red" }}>{err}</p>}
          <div className="bar"><button className="ghost" onClick={() => setStep(2)}>← Back</button>
            <button onClick={submit}>Submit booking</button></div>
        </div>
      )}
    </div>
  );
}

export default function Book() {
  return <Suspense><Inner /></Suspense>;
}
