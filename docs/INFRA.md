# Infrastructure blockers — what exists vs what you must buy/configure

This is the honest map for items that **cannot** be finished with UI copy alone.
Code may scaffold gates and empty states; production needs the services below.

---

## 1. RTMP / HLS live ingest

**Today:** Lobby listing + free OBS/browser window share (`src/lib/liveIngest.js`). Custom RTMP fields appear only when `VITE_LIVE_RTMP_URL` / `NEXT_PUBLIC_LIVE_RTMP_URL` is set. `VITE_LIVE_INGEST_CONNECTED=true` only when a real media path exists.

**Missing:** An ingest + packaging stack (e.g. nginx-rtmp, MediaMTX, Mux, Cloudflare Stream, AWS IVS) that accepts RTMP from OBS and serves HLS/LL-HLS to viewers.

**To ship:**
1. Provision ingest host + HLS CDN.
2. Set `NEXT_PUBLIC_LIVE_RTMP_URL=rtmp://…/live` (and auth if required).
3. Set `VITE_LIVE_INGEST_CONNECTED=true` only after a test stream plays for a second device.
4. Wire player to the HLS URL per stream key (not invented locally).

**Not a code-only task.** Window share remains the free fallback.

---

## 2. Stripe Connect (creator auto-payouts)

**Today:** Tips/memberships/Coins via Checkout Session; creator payouts are **manual** (Admin marks sent). Revenue settings show a disabled “Connect Stripe” card.

**Missing:** Stripe Connect Express (or Custom) onboarding, webhook `account.updated`, transfer/payout jobs, KYC handling.

**To ship:**
1. Stripe Dashboard → Connect → enable Express.
2. Edge Function: `create-connect-account` + `create-account-link`.
3. Secrets: `STRIPE_SECRET_KEY`, Connect webhook secret.
4. Store `stripe_account_id` on `profiles` / earnings row.
5. After tip/membership settle, create Transfer to connected account (minus 20% platform cut).

Until then, keep manual payouts. Do not pretend Connect is live.

---

## 3. Real social OAuth publish

**Today:** Handles + show-on-profile work. Publish refuses without client IDs (`src/lib/socialConnects.js`). Env keys: `VITE_OAUTH_YOUTUBE_CLIENT_ID`, `…_TIKTOK_…`, `…_INSTAGRAM_…`, `…_X_…`, `…_FACEBOOK_…`.

**Missing:** OAuth apps per network, redirect URIs, refresh-token storage (server), upload APIs (YouTube resumable, TikTok Content Posting, etc.).

**To ship:** Register each app, set client IDs (+ secrets server-side), implement callback Edge Function, then enable publish queue.

---

## 4. Push / email delivery

**Today:** In-app notifications. Mail helper posts to `VITE_MAIL_FUNCTION_URL` or returns a **demo code** when unset (`src/lib/mail.js`). No Web Push.

**Missing:** Transactional email provider (Resend/Postmark/SES) behind the mail Edge Function; for push: VAPID keys + service worker + permission UX.

**Env (planned):**
```
VITE_MAIL_FUNCTION_URL=https://…/functions/v1/send-mail
# Server-only inside that function: RESEND_API_KEY / etc.
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=…
# VAPID_PRIVATE_KEY=… (server)
```

---

## 5. ffmpeg.wasm client transcoder

**Today:** Cloud uploads keep the **original file** (no browser re-encode) — critical for iOS playability.

**Missing:** Large wasm bundle + worker UX for optional compress/transcode before upload.

**Recommendation:** Prefer **server** transcode (queue after upload) over shipping ffmpeg.wasm to every phone. If client wasm is required, feature-flag it and never force WebM on iOS.

---

## 6. Native apps

**Today:** `ios/` is a WKWebView shell loading calabi.us — not a second product codebase.

**Missing:** Apple Developer + App Store listing; Android WebView or Capacitor/React Native if desired.

**Recommendation:** Keep fixing the website first; ship iOS shell when ready to pay Apple fees.

---

## 7. Full i18n

**Today:** `src/lib/i18n.js` is an identity `t()` stub (`i18nReady() === false`).

**Missing:** Locale catalogs, locale picker, RTL, date/number formats, translated legal/Help.

**To ship:** Choose next-intl or similar, extract strings, hire/translate, then flip `i18nReady`.

---

## Priority order (practical)

1. Stripe Connect (money leaves the platform cleanly)  
2. RTMP/HLS (real multi-viewer live)  
3. Mail function (verification without demo codes in prod)  
4. Social OAuth (growth)  
5. Push  
6. Server transcode (not wasm-first)  
7. Native store shells  
8. Full i18n  

Related: `docs/RENDER_ENV.md`, `docs/OWN_CHECKOUT.md`, `docs/DEPLOY_CHECKLIST.md`, BUG-010/016/064/081/082/083/086/087.
