// ponytail: single-password cookie gate; upgrade to real sessions if multi-admin matters
export const ADMIN_COOKIE = "pb_admin";
export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}
export function isAdminRequest(req) {
  const c = req.headers.get("cookie") || "";
  return c.includes(`${ADMIN_COOKIE}=1`);
}
