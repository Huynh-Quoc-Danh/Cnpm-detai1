# Hạ Long SmartGuide – API

Base URL: `/api` (dev: Vite proxies `/api` and `/uploads` to `http://localhost:3001`; prod: `npm run build && npm start` serves web + API + uploads on port 3001, ready for one ngrok tunnel: `ngrok http 3001`).

- All bodies are JSON (`Content-Type: application/json`, limit 40 MB).
- Errors: HTTP status + `{ "error": "<Vietnamese message>" }`.
- Optional header `X-Visitor-Id: <id>` (anonymous id from `localStorage.hl_visitor_id`) – used for listen logs / orders.
- Ticket auth: `Authorization: Bearer <ticketToken>` (32 hex). Admin auth: `Authorization: Bearer <adminToken>` (64 hex, 12 h).
- Times are ISO-8601 UTC strings. Dashboard buckets use Vietnam local time (Asia/Ho_Chi_Minh, UTC+7).
- Money: integer VND.

## Architecture (3 layers)

```
server/index.js          Express app, static dist/ + SPA fallback, /uploads, simulator start
server/routes/index.js   URL -> controller
server/controllers/*     HTTP in/out (publicController, adminController)
server/services/*        Business logic (siteService, ticketService, orderService, statsService,
                         visitorService, adminAuthService, settingsService, uploadService)
server/repositories/*    SQL (MySQL/MariaDB via mysql2, async) – sites/exhibits, packages, orders,
                         tickets/claim_codes, visitors/listens, admins/sessions/settings
server/db.js             MySQL pool + schema (config in .env); server/seed.js seeding; server/reset.js;
                         server/migrate-sqlite.js (one-off copy from the old SQLite file)
```

Scripts: `npm run dev` (server --watch + vite), `npm run dev:web`, `npm run dev:server`, `npm run build`, `npm start`, `npm run db:reset` (drops all tables and reseeds), `npm run db:migrate` (copies server/data/halong.db into MySQL, replacing its rows).

**Database:** MySQL / MariaDB (e.g. XAMPP). Connection via `.env` (see `.env.example`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (default `halong`, created automatically with all tables on first start).

### Seeding

- `server/seed/sites/{id}.json` – one file per site (schema below). Loaded on first DB creation and by `npm run db:reset`. On every start, seed files whose `id` was never imported are added automatically (sites deleted by an admin are not resurrected). To pick up **edited** seed content run `npm run db:reset`.
- Missing / invalid files are skipped with a warning.
- `durationSec` values `<= 0` or missing are estimated from the text (`server/utils/text.js`, rate 1.0): Vietnamese 165 words/min, English 150 words/min, Korean 300 Hangul syllables/min, Japanese 340 chars/min, Chinese 250 chars/min. For ko/ja/zh "units" = characters excluding whitespace and punctuation.
- Packages, claim codes, default admin `admin` / `admin123`, settings, and **~90 days of demo orders + listens (`demo = 1`)** are generated so dashboards are not empty. Live visitors are **simulated** (`source: "sim"`, ids `sim-*`) while `settings.simulateVisitors` is true (default) – admin UIs must label these "mô phỏng".

## Languages

`vi | en | ko | ja | zh` (order everywhere: vi, en, ko, ja, zh; Vietnamese is the default; any other value → `vi`).
vi/en texts live in the flat `*Vi` / `*En` fields; ko/ja/zh texts live in `translations`. Narration, `durationSec` and `audioUrl` carry all five keys
(the server always fills every key: `""` / `0` / `null` when missing).
**Fallback** for a missing ko/ja/zh value (text, duration and audio alike): `lang → en → vi`. Frontend helpers: `src/i18n/index.ts` (`siteName`, `siteText`, `exhibitName`, …).

## Site JSON schema

```jsonc
{
  "id": 2, "slug": "hon-trong-mai", "name": "Fighting Cocks Islet", "nameVi": "Hòn Trống Mái (Hòn Gà Chọi)",
  "provinceEn": "...", "provinceVi": "...", "yearEn": "...", "yearVi": "...",
  "categoryEn": "Iconic", "categoryVi": "Biểu tượng", "categoryKey": "Iconic",   // Iconic | Unique Rock | Island | Natural
  "image": "/image/HonTrongMai.jpg", "fallbackImage": "https://...",
  "lat": 20.89075, "lng": 107.0258, "rangeMeters": 300, "rating": 4.9, "reviewsCount": 3150,
  "shortDescVi": "...", "shortDescEn": "...", "historyVi": "...", "historyEn": "...",
  "geologyVi": "...", "geologyEn": "...", "highlightsVi": ["..."], "highlightsEn": ["..."],
  "narration": { "vi": "<full 3–4 min script>", "en": "...", "ko": "...", "ja": "...", "zh": "..." },   // "" in public responses
  "durationSec": { "vi": 225, "en": 196, "ko": 210, "ja": 215, "zh": 205 },   // FULL length (0 = no script)
  "audioUrl": { "vi": null, "en": null, "ko": null, "ja": null, "zh": null }, // optional mp3 (admin upload)
  "translations": {                                              // optional; languages with no text are omitted
    "ko": { "name": "닭바위 (혼쫑마이)", "province": "...", "year": "...", "category": "상징", "shortDesc": "...",
            "history": "...", "geology": "...", "highlights": ["..."] },
    "ja": { "...": "same fields" }, "zh": { "...": "same fields" } },
  "coordSource": "...", "isActive": true,
  "exhibits": [{
    "id": "s2-e1", "siteId": 2, "nameVi": "...", "nameEn": "...", "zoneVi": "...", "zoneEn": "...",
    "image": "/image/...", "shortDescVi": "...", "shortDescEn": "...",
    "narration": { "vi": "<45–90 s>", "en": "...", "ko": "...", "ja": "...", "zh": "..." },   // "" in public responses
    "durationSec": { "vi": 46, "en": 44, "ko": 50, "ja": 48, "zh": 47 }, "audioUrl": { "vi": null, "en": null, "ko": null, "ja": null, "zh": null },
    "translations": { "ko": { "name": "...", "zone": "...", "shortDesc": "..." }, "ja": { "...": "..." }, "zh": { "...": "..." } },
    "lat": 20.89, "lng": 107.02, "sortOrder": 1
  }]
}
```

---

## Public endpoints

### GET /api/health
`{ "ok": true, "sites": 7, "time": "2026-10-19T16:15:19.776Z" }`

### GET /api/config
```json
{ "appName": "Hạ Long SmartGuide", "previewSeconds": 30, "publicBaseUrl": null,
  "bank": { "bankId": "VCB", "accountNo": "1023456789", "accountName": "HA LONG SMARTGUIDE" }, "currency": "VND" }
```
`publicBaseUrl` (e.g. the ngrok URL) is set in admin settings; use it for QR codes when present.

### GET /api/network
`{ "lanUrls": ["http://192.168.2.14:5173"] }` – one URL per non-internal IPv4 interface (LAN ranges first, virtual adapters last). The port is the one the browser used (Host header; Vite proxy keeps it). Override with `?port=5173`.

### GET /api/sites
Array of active sites (schema above) with `narration` (site and every exhibit) replaced by `{ "vi": "", "en": "", "ko": "", "ja": "", "zh": "" }` and `audioUrl` by all-`null`. `durationSec` and `translations` are included.

### GET /api/sites/:id
Same shape for one active site. 404 `{ "error": "Không tìm thấy địa điểm" }`.

### GET /api/sites/:id/narration?lang=vi|en|ko|ja|zh[&exhibitId=s2-e1]
Header `Authorization: Bearer <ticketToken>` optional. Logs a listen row (siteId, exhibitId, lang, X-Visitor-Id, locked).
```json
{ "locked": true,
  "text": "Xin chào quý khách! ... (leading sentences ≈ previewSec of speech)",
  "durationSec": 225, "previewSec": 30, "audioUrl": null,
  "lang": "ko", "requestedLang": "ko" }
```
- `lang` = language of `text` / `durationSec` / `audioUrl`. When the requested ko/ja/zh script is missing the server falls back `lang → en → vi` and `lang` says which one was used – **use it for the TTS voice** (`requestedLang` echoes the query).
- Entitled (valid, non-revoked, unexpired ticket with `scope: "all"` or `siteIds` containing the site) → `locked: false`, `text` = full script.
- Otherwise → `locked: true`, `text` = preview. If the full script is not longer than `previewSec`, it is returned in full with `locked: false`.
- `durationSec` is always the FULL duration (for the seek bar). Preview length uses the same speaking rate as `durationSec` (units / durationSec – words for vi/en, characters for ko/ja/zh), so the preview ends ≈ `previewSec` on the timeline. Sentences are split on `. ! ? …` and, for ko/ja/zh, also `。！？．；` (no space needed; `.` only before a space so decimals survive); ja/zh preview sentences are joined without spaces.
- `audioUrl` (uploaded mp3) is returned in both cases; when `locked` the client must stop / clamp at `previewSec`.

### GET /api/packages
```json
[{ "id": 1, "code": "SITE_SINGLE", "nameVi": "Vé lẻ 1 điểm", "nameEn": "Single site pass",
   "descVi": "...", "descEn": "...", "price": 29000, "scope": "site", "durationHours": 24, "maxPeople": 1,
   "isActive": true, "badgeVi": null, "badgeEn": null, "sortOrder": 1 },
 { "id": 2, "code": "ALL_DAY", "price": 99000, "scope": "all", "durationHours": 24, "badgeVi": "Phổ biến nhất", "badgeEn": "Most popular", "...": "..." },
 { "id": 3, "code": "FAMILY", "price": 199000, "scope": "all", "durationHours": 48, "maxPeople": 4, "badgeVi": "Tiết kiệm", "...": "..." }]
```

### POST /api/orders
Body `{ "packageId": 1, "siteId": 2, "visitorId": "…", "lang": "vi" /* vi|en|ko|ja|zh */, "method": "vietqr", "customerName": "Nguyễn Văn A", "customerPhone": "0901234567" }`
(`siteId` required for `scope: "site"` packages, optional otherwise – stored as "purchased at"). `method`: `vietqr | momo | card`. → **201**
```json
{ "id": "HLCK6PHDHK", "packageId": 1, "packageName": "Vé lẻ 1 điểm", "siteId": 2, "amount": 29000,
  "method": "vietqr", "status": "pending", "visitorId": "…", "lang": "vi",
  "customerName": "Nguyễn Văn A", "customerPhone": null,
  "createdAt": "2026-10-19T16:15:51.275Z", "paidAt": null, "expiresAt": "2026-10-19T16:30:51.275Z",
  "transferNote": "HLSG HLCK6PHDHK", "checkoutUrl": "/pay/HLCK6PHDHK" }
```
Errors 400: unknown/inactive package, invalid method, missing siteId for site package.
VietQR image for the bank transfer can be built client-side: `https://img.vietqr.io/image/<bankId>-<accountNo>-compact2.png?amount=<amount>&addInfo=<transferNote>&accountName=<accountName>` (or render an EMV string locally with the `qrcode` package).

### GET /api/orders/:id
Order (poll every 2–3 s on the payment page). Pending orders past `expiresAt` become `"expired"`. When `status: "paid"` the order includes `"ticket": Ticket`.

### POST /api/orders/:id/pay
Body `{ "method": "momo" }` (optional). Demo payment gateway: marks paid, issues the ticket. Idempotent (paying a paid order returns it unchanged). 409 if expired/cancelled/refunded.
```json
{ "...order", "status": "paid", "paidAt": "2026-10-19T16:15:52.583Z",
  "ticket": { "token": "a39bedce6e9bcd7f0d091fd3ddc7033f", "orderId": "HLCK6PHDHK", "code": null,
              "scope": "site", "siteIds": [2], "issuedAt": "...", "expiresAt": "2026-10-20T16:15:52.584Z",
              "packageName": "Vé lẻ 1 điểm" } }
```

### POST /api/tickets/redeem
Body `{ "code": "HALONG", "visitorId": "…" }` (case-insensitive). Seed codes: `HALONG` (all sites, 24 h, 1000 uses), `VIP2026` (all, 72 h, 100), `DEMO` (all, 2 h, 10000).
- 200 `{ "ok": true, "ticket": { "token": "…", "orderId": null, "code": "HALONG", "scope": "all", "siteIds": [], ... , "packageName": "Mã HALONG – Toàn bộ điểm" }, "message": "Kích hoạt thành công! ..." }`
- 400 `{ "ok": false, "message": "Mã không hợp lệ hoặc đã bị vô hiệu hoá" | "Mã đã hết lượt sử dụng" }`

### GET /api/tickets/verify
Header `Authorization: Bearer <ticketToken>` → `{ "valid": true, "ticket": Ticket }` or `{ "valid": false }` (expired, revoked by refund/cancel, unknown).

### POST /api/visitors/heartbeat
Body `{ "visitorId": "…", "siteId": 2 | null, "lat": 20.89, "lng": 107.02, "accuracy": 12, "source": "gps|qr|view", "lang": "vi", "device": "mobile|desktop", "userAgent": "…" }`
→ `{ "ok": true, "siteId": 2, "activeAtSite": 4 }` (`activeAtSite` only when the visitor is at a site).
Live = heartbeat within the last 60 s. Effective site: given `siteId` → else server-side geofence from lat/lng (inside `rangeMeters`) → else the site QR scanned (`source: "qr"`) within the last 30 min. Send every 15 s.

---

## Admin endpoints (all except login require `Authorization: Bearer <adminToken>`; 401 otherwise)

### POST /api/admin/login
`{ "username": "admin", "password": "admin123" }` → `{ "token": "<64 hex>", "admin": { "id": 1, "username": "admin", "displayName": "Quản trị viên", "role": "admin", "lastLoginAt": "..." }, "expiresAt": "..." }` · 401 `{ "error": "Sai tên đăng nhập hoặc mật khẩu" }`

### POST /api/admin/logout → `{ "ok": true }`
### GET /api/admin/me → `{ "admin": AdminUser }`
### POST /api/admin/password
`{ "oldPassword": "admin123", "newPassword": "≥6 chars" }` → `{ "ok": true }` (other sessions are logged out) · 400 wrong old password.

### GET /api/admin/stats/overview
Windows: **today** = since local midnight; **week** = last 7 local days incl. today; **month** = last 30 days incl. today. Tickets = paid orders (by `paidAt`); revenue = sum of their amounts (refunded excluded).
```json
{ "generatedAt": "...", "timezone": "Asia/Ho_Chi_Minh",
  "liveTotal": 18, "liveReal": 0, "liveSimulated": 18,
  "livePerSite": [{ "siteId": 1, "nameVi": "Toàn cảnh Vịnh Hạ Long", "count": 5, "real": 0, "simulated": 5 }],
  "tickets": { "today": 23, "week": 200, "month": 823, "total": 2135 },
  "revenue": { "today": 1327000, "week": 13830000, "month": 60297000, "total": 157855000 },
  "listens": { "today": 220, "week": 2334, "month": 9405 },
  "conversionRate": 17.8,
  "trend": { "tickets": { "today": -42.5, "week": 1, "month": 13.7 },
             "revenue": { "today": -54.6, "week": -8.4, "month": 11.3 },
             "previous": { "tickets": { "today": 40, "week": 198, "month": 724 }, "revenue": { "...": 0 } } },
  "topSites": [{ "siteId": 1, "nameVi": "...", "listens": 1933, "tickets": 178, "revenue": 12312000 }],
  "recentOrders": [Order /* 10 newest, with "demo": true|false */],
  "includesDemoData": true }
```
`conversionRate` = paid orders (30 d) / distinct listening visitors (30 d) × 100. `trend` = % change vs the previous equal period (yesterday, previous 7 d, previous 30 d). `topSites` sorted by listens (30 d).

### GET /api/admin/stats/sales?range=day|week|month
- `day`: 24 hourly buckets of today (labels `"00h"`…`"23h"`, keys `"00"`…).
- `week`: last 7 days (labels `"T2 13/10"`, keys `"2026-10-13"`).
- `month`: last 30 days (labels `"20/09"`).
```json
{ "range": "week", "from": "...", "to": "...", "timezone": "Asia/Ho_Chi_Minh",
  "buckets": [{ "key": "2026-10-19", "label": "T2 19/10", "tickets": 23, "revenue": 1327000, "listens": 220 }],
  "totals": { "tickets": 200, "revenue": 13830000, "listens": 2334 },
  "byPackage": [{ "packageId": 2, "name": "Vé ngày – Toàn vịnh", "tickets": 70, "revenue": 6930000 }],
  "byMethod": [{ "method": "vietqr", "tickets": 115, "revenue": 7635000 }] }
```
400 for any other range.

### GET /api/admin/live
```json
{ "visitors": [{ "visitorId": "sim-zes0qssp", "siteId": 4, "siteName": "Hòn Chó Đá", "lat": 20.910081, "lng": 107.015157,
                 "source": "sim", "device": "mobile", "lang": "en", "lastSeen": "...", "firstSeen": "...", "simulated": true }],
  "perSite": [{ "siteId": 1, "nameVi": "...", "name": "...", "lat": 20.886, "lng": 107.049, "count": 5, "real": 0, "simulated": 5 }],
  "liveTotal": 18, "liveReal": 0, "liveSimulated": 18, "windowSec": 60, "simulateVisitors": true }
```
Simulator: 8–25 visitors, re-evaluated every 10 s (crowd size random-walks, ~8 % move to another site each tick, positions jittered inside the geofence).

### Sites & exhibits (full objects incl. narration)
- `GET /api/admin/sites` → HeritageSite[] (incl. inactive, with exhibits + narration)
- `POST /api/admin/sites` body = site fields (+ optional `exhibits` array; `id` optional → next id) → 201 HeritageSite. Required: `nameVi`, `lat`, `lng`. Defaults filled; `slug` from `name`; `durationSec` estimated when missing/0.
- `GET /api/admin/sites/:id` → HeritageSite
- `PUT /api/admin/sites/:id` body = partial site (merged onto the existing one; `translations`, when sent, replaces the whole object). If `exhibits` is present, it **replaces** the exhibit list (items with an existing `id` are updated, others created, missing ones deleted). For every language (vi/en/ko/ja/zh): when its narration text changes and its `durationSec` is not changed, the duration is re-estimated with that language's rate. → HeritageSite
- `DELETE /api/admin/sites/:id` → `{ "ok": true }` (also deletes its exhibits)
- `POST /api/admin/sites/:id/exhibits` body = exhibit fields (`nameVi` required) → 201 Exhibit (`id` = `s{siteId}-e{n}`, `sortOrder` = last + 1 unless given)
- `PUT /api/admin/exhibits/:id` body = partial exhibit → Exhibit
- `DELETE /api/admin/exhibits/:id` → `{ "ok": true }`

### Packages
- `GET /api/admin/packages` → TicketPackage[] (incl. inactive)
- `POST /api/admin/packages` `{ "code": "TEST", "nameVi": "...", "nameEn": "...", "descVi": "", "descEn": "", "price": 5000, "scope": "all", "durationHours": 24, "maxPeople": 1, "isActive": true, "badgeVi": null, "badgeEn": null, "sortOrder": 4 }` → 201 (code upper-cased; 409 duplicate)
- `PUT /api/admin/packages/:id` partial → TicketPackage · `DELETE /api/admin/packages/:id` → `{ "ok": true }` (existing orders keep `packageName`)

### Orders
- `GET /api/admin/orders?status=&from=&to=&q=&page=&pageSize=` → `{ "items": Order[], "total": 2136, "page": 1, "pageSize": 20 }`
  `status` ∈ pending|paid|expired|refunded|cancelled; `from`/`to` = `YYYY-MM-DD` VN local dates (inclusive) or ISO; `q` matches id, transfer note, customer name/phone, package name; `pageSize` ≤ 200; newest first. Items carry `"demo": true` for generated history.
- `PATCH /api/admin/orders/:id` `{ "status": "paid" | "refunded" | "cancelled" }` → Order. `paid` issues (or re-activates) the ticket; `refunded` (only from paid) / `cancelled` revoke it.
- `GET /api/admin/orders.csv?status=&from=&to=&q=` → `text/csv` (UTF-8 BOM, Excel-friendly, Vietnamese headers, attachment `don-hang-YYYY-MM-DD.csv`). Needs the Bearer header → fetch as Blob (`adminApi.exportOrdersCsv`).

### Claim codes
- `GET /api/admin/codes` → `[{ "code": "HALONG", "scope": "all", "siteIds": [], "durationHours": 24, "maxUses": 1000, "usedCount": 1, "isActive": true, "note": "...", "createdAt": "..." }]`
- `POST /api/admin/codes` `{ "code": "LOP12", "scope": "site", "siteIds": [2], "durationHours": 5, "maxUses": 50, "isActive": true, "note": "" }` → 201 (code `[A-Z0-9_-]{3,32}`, upper-cased; 409 duplicate; scope "site" needs siteIds)
- `PUT /api/admin/codes/:code` partial → ClaimCode · `DELETE /api/admin/codes/:code` → `{ "ok": true }`

### Settings
- `GET /api/admin/settings` → `{ "publicBaseUrl": null, "previewSeconds": 30, "bank": { "bankId": "VCB", "accountNo": "1023456789", "accountName": "HA LONG SMARTGUIDE" }, "simulateVisitors": true }`
- `PUT /api/admin/settings` partial → settings. `publicBaseUrl` is normalised (`abc.ngrok-free.app/` → `https://abc.ngrok-free.app`; `null`/"" clears). `previewSeconds` 5–300. Turning `simulateVisitors` off removes simulated visitors immediately.

### Upload
`POST /api/admin/upload` `{ "filename": "hang.jpg", "dataBase64": "<base64 or data: URL>", "kind": "image" | "audio" }` → 201 `{ "url": "/uploads/1792426596514-ab12cd-hang.jpg", "size": 12345 }`
Images: jpg/jpeg/png/webp/gif ≤ 10 MB. Audio: mp3/m4a/aac/wav/ogg/oga/webm ≤ 30 MB. Use the URL in `image` or `audioUrl.vi|en|ko|ja|zh`.

---

## Frontend client (`src/services/api.ts`)
`api.*` and `adminApi.*` wrap every endpoint above, throw `ApiError { status, message }` (status 0 = network error) and send `X-Visitor-Id`. `adminApi.login()` stores the token in `localStorage.hl_admin_token`; a 401 on an admin call clears it.
