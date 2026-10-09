import { getDb, getSettings, cellStatus, expireHolds } from "@/lib/db";

export async function GET(req) {
  const db = getDb();
  expireHolds();
  const { searchParams } = new URL(req.url);
  let date = searchParams.get("date");
  if (!date) date = new Date().toISOString().slice(0, 10);
  const s = getSettings();
  const open = Number(s.open),
    close = Number(s.close);
  const courts = db.prepare("SELECT * FROM courts ORDER BY id").all();
  const hours = [];
  for (let h = open; h < close; h++) hours.push(h);
  const cells = {};
  for (const c of courts) {
    cells[c.id] = {};
    for (const h of hours) cells[c.id][h] = cellStatus(db, c.id, date, h);
  }
  return Response.json({ date, open, close, rate: Number(s.price_per_hr), courts, hours, cells, settings: s });
}
