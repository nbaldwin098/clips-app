# calabi MVP status

Honest snapshot of what ships for a usable MVP.

## Money (done)
- [x] Own Stripe Checkout (platform collects)
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
