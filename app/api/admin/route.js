import { getDb, expireHolds, getSettings, isRangeOpen, makeId, calcTotal } from "@/lib/db";
import { adminPassword, isAdminRequest, ADMIN_COOKIE } from "@/lib/auth";

export async function POST(req) {
  const db = getDb();
  const b = await req.json();
  // login
  if (b.action === "login") {
    if (b.password === adminPassword())
      return Response.json({ ok: true }, { headers: { "Set-Cookie": `${ADMIN_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax` } });
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  if (!isAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  expireHolds();
  const { action } = b;
  if (action === "approve" || action === "decline") {
    if (!isRangeOpenCheckForApprove(db, b, action)) { /* allow decline even if overlapping */ }
    db.prepare("UPDATE bookings SET status=? WHERE id=?").run(action === "approve" ? "approved" : "declined", b.id);
    return Response.json({ ok: true });
  }
  if (action === "block") {
    db.prepare("INSERT INTO blocks (court_id,date,start,end,label) VALUES (?,?,?,?,?)")
      .run(b.court_id, b.date, Number(b.start), Number(b.end), b.label || "Blocked");
    return Response.json({ ok: true });
  }
  if (action === "unblock") {
    db.prepare("DELETE FROM blocks WHERE id=?").run(b.id);
    return Response.json({ ok: true });
  }
  if (action === "manual") {
    const st = getSettings();
    const amount = b.amountOverride !== "" && b.amountOverride != null ? Number(b.amountOverride) : calcTotal(Number(b.start), Number(b.end), st.price_per_hr);
    if (!isRangeOpen(db, b.court_id, b.date, Number(b.start), Number(b.end)))
      return Response.json({ error: "Overlaps existing booking" }, { status: 409 });
    const id = makeId();
    db.prepare(`INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, b.court_id, b.date, Number(b.start), Number(b.end), b.name, b.phone,
      amount, b.pay_method || "cash", b.note || "", null, "approved", Date.now()
    );
    return Response.json({ ok: true, id });
  }
  if (action === "settings") {
    for (const [k, v] of Object.entries(b.settings || {}))
      db.prepare("INSERT OR REPLACE INTO settings VALUES (?,?)").run(k, String(v));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}

function isRangeOpenCheckForApprove(db, b, action) {
  if (action !== "approve") return true;
  const row = db.prepare("SELECT * FROM bookings WHERE id=?").get(b.id);
  if (!row) return false;
  // ensure no *other* approved booking overlaps
  const clash = db.prepare(
    `SELECT 1 FROM bookings WHERE id!=? AND court_id=? AND date=? AND status='approved' AND NOT (end<=? OR start>=?) LIMIT 1`
  ).get(b.id, row.court_id, row.date, row.start, row.end);
  return !clash;
}

export async function GET(req) {
  if (!isAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  expireHolds();
  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const pending = db.prepare(`SELECT * FROM bookings WHERE status='pending' ORDER BY created_at`).all();
  const upcoming = db.prepare(`SELECT * FROM bookings WHERE status='approved' AND date>=? ORDER BY date,start LIMIT 50`).all(today);
  const all = db.prepare(`SELECT * FROM bookings ORDER BY date DESC,start DESC LIMIT 100`).all();
  const blocks = db.prepare(`SELECT * FROM blocks WHERE date>=? ORDER BY date,start LIMIT 50`).all(today);
  return Response.json({ pending, upcoming, all, blocks, settings: getSettings() });
}
