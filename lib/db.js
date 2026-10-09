import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let _db = null;

export const OPEN = 17; // 5PM
export const CLOSE = 26; // 2AM next day (24+2)
export const RATE = 400;

export function getDb() {
  if (_db) return _db;
  const dir = process.cwd();
  const file = path.join(dir, "data.db");
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS courts (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, court_id TEXT, date TEXT,
      start INTEGER, end INTEGER, name TEXT, phone TEXT,
      amount INTEGER, pay_method TEXT, pay_ref TEXT, proof TEXT,
      status TEXT DEFAULT 'pending', created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, court_id TEXT,
      date TEXT, start INTEGER, end INTEGER, label TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  `);
  const n = _db.prepare("SELECT COUNT(*) c FROM courts").get().c;
  if (n === 0) {
    _db.prepare("INSERT INTO courts VALUES (?,?)").run("c1", "Court 1");
    _db.prepare("INSERT INTO courts VALUES (?,?)").run("c2", "Court 2");
  }
  const defaults = {
    price_per_hr: String(RATE),
    open: String(OPEN),
    close: String(CLOSE),
    gcash_no: "0917-000-0000",
    gcash_name: "Your Venue",
    bank_acct: "0000-0000-0000",
    bank_name: "Your Venue",
  };
  for (const [k, v] of Object.entries(defaults)) {
    _db.prepare("INSERT OR IGNORE INTO settings VALUES (?,?)").run(k, v);
  }
  // uploads dir for proof screenshots
  const up = path.join(dir, "public", "uploads");
  if (!fs.existsSync(up)) fs.mkdirSync(up, { recursive: true });
  return _db;
}

export function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM settings").all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function fmtHour(h) {
  const hh = ((h % 24) + 24) % 24;
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${ap}`;
}

export function slotLabel(s, e) {
  return `${fmtHour(s)}–${fmtHour(e)}`;
}

export function expireHolds() {
  const db = getDb();
  const cutoff = Date.now() - 60 * 60 * 1000;
  db.prepare("UPDATE bookings SET status='expired' WHERE status='pending' AND created_at < ?").run(cutoff);
}

export function cellStatus(db, court_id, date, hour) {
  const b = db
    .prepare(
      `SELECT status FROM bookings WHERE court_id=? AND date=? AND start<=? AND end>? AND status IN ('pending','approved') LIMIT 1`
    )
    .get(court_id, date, hour, hour);
  if (b) return b.status === "approved" ? "reserved" : "pending";
  const bl = db
    .prepare(`SELECT 1 FROM blocks WHERE court_id=? AND date=? AND start<=? AND end>? LIMIT 1`)
    .get(court_id, date, hour, hour);
  if (bl) return "blocked";
  return "open";
}

export function isRangeOpen(db, court_id, date, start, end) {
  for (let h = start; h < end; h++) {
    if (cellStatus(db, court_id, date, hourClamp(h)) !== "open") return false;
  }
  return true;
}

// hours past midnight (24+) are stored as-is; cellStatus compares raw ints so keep raw
function hourClamp(h) {
  return h;
}

export function makeId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "BK-" + s;
}

export function calcTotal(start, end, rate) {
  return Math.max(0, end - start) * Number(rate || RATE);
}
