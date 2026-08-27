# Escrow timeout policy (donation requests)

Until Stripe Connect auto-release ships:

1. Donation-request escrow is held until **admin release** or creator reject.
2. Target review window: **72 hours** after request (best-effort; not a guaranteed SLA).
3. Disputes: Admin → Payouts / Live escrow tools — record reason code on release.
4. Never auto-credit a creator without an escrow row or Stripe evidence.

Chargebacks: follow Admin playbook — freeze withdraw, pull ledger, contact buyer email from Stripe.
