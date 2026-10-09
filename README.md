# PickleBook — barebones pickleball booking

Next.js + SQLite. 2 courts, 5PM–2AM, 1hr slots, ₱400/hr.

## Run
```bash
cp .env.example .env.local  # set ADMIN_PASSWORD
npm install
npm run dev   # http://localhost:3000
```
Admin: `/admin` (default `admin123`). Customer lookup: `/my-bookings` via phone + `BK-XXXX`.

## Flow
`/` grid (tap start → tap end) → `/book` (1 slot, 2 details, 3 pay) → pending 1hr hold → admin approves.
Payments: GCash / Card / Bank. Manual screenshot-verify now; `lib/payments.js:createIntent()` is the stub for PayMongo — add `PAYMONGO_SECRET` and implement there.

## API
- `GET /api/availability?date=YYYY-MM-DD`
- `POST /api/bookings` / `GET /api/bookings?phone=&ref=`
- `POST /api/admin` `{action: login|approve|decline|block|unblock|manual|settings}` + `GET /api/admin`

Skipped: promo codes, reports, inventory. Add when needed.
