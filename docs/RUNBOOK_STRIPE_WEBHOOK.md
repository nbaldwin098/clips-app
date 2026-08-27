# Runbook — Stripe webhook / checkout return

## Symptoms
- User paid but Coins / tip / premium did not unlock.
- Creator tip settled locally but no Connect Transfer.
- Double credit after refresh.

## Immediate checks
1. Confirm Edge secrets: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (+ `APP_PUBLIC_URL`).
2. Stripe Dashboard → Developers → Webhooks / Event destinations:
   URL `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   Events: `payment_intent.succeeded` + `v2.core.account.updated`. Recent deliveries 2xx.
   Secrets: `STRIPE_WEBHOOK_SECRET` (snapshot) + `STRIPE_WEBHOOK_SECRET_THIN` (Accounts v2).
3. Client return URL must include `paid=1` or `session_id` (see `membershipReturnPaid` in `src/lib/tips.js`).
4. `claimStripeReturn` is idempotent via claim keys — refresh should return `alreadyClaimed`.
5. Server settle is idempotent via `stripe_settlements.session_id`.

## Creator auto-payout (Connect)
- Webhook credits `creator_earnings` at **80%** for `live_tip` / `post_tip` / `premium` / `post_purchase`.
- If creator `stripe_connect_payouts_enabled`, creates a Transfer and moves USD into `connect_paid_usd`.
- Else amount stays in `available_usd` for manual payout.
- Full setup: **`docs/OWN_CONNECT.md`**.

## Coin packs
- Pending checkout stored in session before redirect.
- On return, `creditCoins` runs once; Orders tab lists ledger after `pullWallet`.
- No creator Transfer for coin packs.

## If webhook never fires
- User return path still claims UX from pending session payload.
- Reconcile in Admin / `stripe_settlements` if needed; do not invent grants without Stripe evidence.
