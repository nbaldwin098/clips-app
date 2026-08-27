# Infrastructure blockers — what exists vs what you must buy/configure

This is the honest map for items that **cannot** be finished with UI copy alone.
Code scaffolds gates and empty states; production still needs the services below.

---

## Free scaffolds in this repo

| Area | What shipped (code-only) | Still needs |
|------|--------------------------|-------------|
| **i18n** | `src/lib/i18n.js` catalogs + Account language picker | Full translations / RTL |
| **Client transcode** | `src/lib/videoTranscode.js` behind `VITE_CLIENT_TRANSCODE` | Prefer server queue long-term |
| **Web Push** | `public/sw-push.js`, `src/lib/webPush.js`, Notifications UI | VAPID keys + `push-subscribe` deploy |
| **Stripe Connect** | Edge `create-connect-account` + Revenue button | Stripe Connect enable + secret |
| **Social OAuth** | `oauth-start` / `oauth-callback` + Studio redirect | Per-network apps + secrets |
| **RTMP/HLS** | `docker/mediamtx/` + `docs/mediamtx.md` | A VPS/public IP + env URLs |

---

## 1. RTMP / HLS live ingest

**Today:** Lobby + free OBS/browser window share (`src/lib/liveIngest.js`). Custom RTMP when `VITE_LIVE_RTMP_URL` is set. Self-host recipe: **`docs/mediamtx.md`** + `docker/mediamtx/docker-compose.yml`.

**Missing for production:** A machine with public IP (or Mux / Cloudflare Stream / IVS).

**To ship:**
1. `cd docker/mediamtx && docker compose up -d` on a VPS (or buy managed ingest).
2. Set `VITE_LIVE_RTMP_URL=rtmp://YOUR_HOST:1935/live`
3. Set `VITE_LIVE_HLS_BASE=https://YOUR_HOST/live` (TLS via reverse proxy)
4. Set `VITE_LIVE_INGEST_CONNECTED=true` only after a second device can play HLS.

Window share remains the free fallback without any of the above.

---

## 2. Stripe Connect (creator auto-payouts)

**Today:** Tips/memberships/Coins via Checkout Session; creator payouts are **manual**. Revenue calls Edge Function `create-connect-account` when Supabase is configured.

**To ship:**
1. Stripe Dashboard → Connect → enable Express.
2. `supabase functions deploy create-connect-account`
3. Secrets: `STRIPE_SECRET_KEY`, `APP_PUBLIC_URL` / `SITE_URL`
4. Optional column `profiles.stripe_connect_account_id`
5. After tip settle, Transfer to connected account (minus platform cut).

Until then, keep manual payouts. Do not pretend Connect is live without secrets.

---

## 3. Real social OAuth publish

**Today:** Handles + show-on-profile. Publish refuses without client IDs. Edge stubs: `oauth-start`, `oauth-callback`. Studio Socials redirects when `VITE_OAUTH_*_CLIENT_ID` + `VITE_OAUTH_START_URL` are set.

**To ship:** Register each network app, set client IDs (client) + secrets (Edge), set:
```
VITE_OAUTH_START_URL=https://…/functions/v1/oauth-start
OAUTH_REDIRECT_BASE=https://…/functions/v1/oauth-callback
APP_PUBLIC_URL=https://calabi.us
```
Then implement real upload APIs (YouTube resumable, TikTok Content Posting, etc.).

---

## 4. Push / email delivery

**Today:** In-app notifications. Mail helper posts to `VITE_MAIL_FUNCTION_URL` or returns a **demo code**. Web Push UI + `sw-push.js` when `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set. Optional `push-subscribe` Edge Function.

**Env:**
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…
# Server: VAPID_PRIVATE_KEY
VITE_PUSH_SUBSCRIBE_URL=https://…/functions/v1/push-subscribe
VITE_MAIL_FUNCTION_URL=https://…/functions/v1/send-mail
```

Generate VAPID (free): `npx web-push generate-vapid-keys`

---

## 5. ffmpeg.wasm client transcoder

**Today:** Default upload keeps the **original file**. Optional compress via `prepareVideoForUploadMaybeTranscode` when `VITE_CLIENT_TRANSCODE=1` — always falls back to original; never forces WebM.

**Recommendation:** Prefer **server** transcode after upload. Do not enable client wasm on phones by default.

---

## 6. Native apps

**Today:** `ios/` WKWebView shell loading calabi.us.

**Missing:** Apple Developer + App Store listing ($99/yr).

---

## 7. Full i18n

**Today:** `src/lib/i18n.js` with EN catalog + sparse es/fr/pt/de; Account language picker; `i18nReady() === true` for the framework (translations still partial).

**Missing:** Complete catalogs, RTL, date/number formats, translated legal/Help.

---

## Priority order (practical)

1. Stripe Connect secrets + deploy `create-connect-account`  
2. MediaMTX VPS or managed RTMP/HLS  
3. Mail function (no demo codes in prod)  
4. Social OAuth apps  
5. VAPID + push-subscribe  
6. Server transcode (not wasm-first)  
7. Native store shells  
8. Full translations  

Related: `docs/RENDER_ENV.md`, `docs/OWN_CHECKOUT.md`, `docs/DEPLOY_CHECKLIST.md`, `docs/mediamtx.md`, BUG-010/016/064/081/082/083/086/087.
