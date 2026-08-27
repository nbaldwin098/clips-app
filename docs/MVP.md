# calabi MVP status

Honest snapshot of what ships for a usable MVP.

## Money (done)
- [x] Own Stripe Checkout (platform collects)
<<<<<<< HEAD
- [x] 4% Platform fee on every card charge
- [x] Creator Earnings dashboard + Admin Payouts
- [x] Admin Finance ledger (see PR #167 if not merged yet)

## Free infra (this branch)
- [x] Full es/fr/pt/de UI translations (`i18n.js`)
- [x] VAPID public key in `.env.example` + push subscribe auth
- [x] MediaMTX + free Cloudflare Tunnel recipe
- [x] Social OAuth code path + free developer-app checklist (`docs/FREE_INFRA.md`)

## You still paste (free, your logins)
1. Render: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VITE_PUSH_SUBSCRIBE_URL`
2. Supabase secret: `VAPID_PRIVATE_KEY`
3. `npx supabase functions deploy push-subscribe`
4. Optional: OAuth client IDs / MediaMTX on a home PC
=======
- [x] 4% Platform fee on every card charge (label + ? — no % shown)
- [x] Creator Earnings dashboard (methods + withdraw request)
- [x] Admin Payouts queue (mark paid / reject)
- [x] Admin Finance master ledger (fees + investigate every txn)
- [x] Webhook settles list/fee/creator share (no Express Transfers)

## Deploy you must run
```bat
npx supabase functions deploy admin-finance
npx supabase functions deploy admin-withdraw
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy create-checkout-session
```

## Still not full product (post-MVP)
- [ ] Real RTMP/HLS ingest (needs VPS / MediaMTX)
- [ ] Social OAuth publish (needs app keys)
- [ ] Web Push live (needs VAPID)
- [ ] Full i18n translations
- [ ] Embedded Stripe Elements (card UI still Stripe Checkout page)

## Master fee account
There is no separate Stripe “fee account” — fees stay in the **platform Stripe balance**.
Track them in **Admin → Finance → Platform fees**.
>>>>>>> origin/main
