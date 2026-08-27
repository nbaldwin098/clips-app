# Runbook — Stripe webhook / checkout return

## Symptoms
- User paid but Coins / tip / premium did not unlock.
- Double credit after refresh.

## Immediate checks
1. Confirm `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on the Node service.
2. Stripe Dashboard → Developers → Webhooks: endpoint reachable, recent deliveries 2xx.
3. Client return URL must include `paid=1` or `session_id` (see `membershipReturnPaid` in `src/lib/tips.js`).
4. `claimStripeReturn` is idempotent via `sessionStorage` claim keys — refresh should return `alreadyClaimed`.

## Coin packs
- Pending checkout stored in session before redirect.
- On return, `creditCoins` runs once; Orders tab lists ledger after `pullWallet`.

## If webhook never fires
- User return path still claims from pending session payload.
- Reconcile manually in Admin payouts / wallet_ledger if needed; do not invent grants without Stripe evidence.
