import { getDb, makeId, calcTotal, isRangeOpen, getSettings, expireHolds } from "@/lib/db";
import path from "path";
import fs from "fs";

export async function POST(req) {
  const db = getDb();
  expireHolds();
  const b = await req.json();
  const { court_id, date, start, end, name, phone, pay_method, pay_ref, proofDataUrl, manual } = b;
  if (!court_id || !date || start == null || end == null || !name || !phone || !pay_method)
    return Response.json({ error: "Missing fields" }, { status: 400 });
  const s = Number(start),
    e = Number(end);
  if (!(e > s) || e - s > 9) return Response.json({ error: "Bad range" }, { status: 400 });
  if (!isRangeOpen(db, court_id, date, s, e))
    return Response.json({ error: "Slot just taken. Pick another." }, { status: 409 });
  const st = getSettings();
  const amount = manual?.amountOverride != null ? Number(manual.amountOverride) : calcTotal(s, e, st.price_per_hr);

  let proof = null;
  if (proofDataUrl && proofDataUrl.startsWith("data:image")) {
    const base64 = proofDataUrl.split(",")[1];
    const id = makeId().replace("BK-", "P");
    proof = `/uploads/${Date.now()}-${id}.png`;
    fs.writeFileSync(path.join(process.cwd(), "public", proof), Buffer.from(base64, "base64"));
  }
  const id = makeId();
  const status = manual ? "approved" : "pending";
  db.prepare(
    `INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, court_id, date, s, e, name.trim(), phone.trim(), amount,
    pay_method, (pay_ref || "").trim(), proof, status, Date.now()
  );
  return Response.json({ id, amount, status });
}

export async function GET(req) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").trim();
  const ref = (searchParams.get("ref") || "").trim().toUpperCase();
  if (!phone) return Response.json({ error: "Phone required" }, { status: 400 });
  let rows;
  if (ref) rows = db.prepare(`SELECT * FROM bookings WHERE phone=? AND id=? ORDER BY date`).all(phone, ref);
  else rows = db.prepare(`SELECT * FROM bookings WHERE phone=? ORDER BY date DESC LIMIT 20`).all(phone);
  return Response.json({ bookings: rows });
}
