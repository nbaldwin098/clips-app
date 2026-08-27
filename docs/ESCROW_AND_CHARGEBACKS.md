# Escrow timeout + chargebacks (ops one-pager)

## Donation request tips (live)

1. Held until **admin release** or refund — creator marks fulfilled first when applicable.
2. Target review: **72 hours** after request (best-effort, not an SLA).
3. If still `held` after **14 days**, Admin should **refund** the donor.
4. Never auto-credit a creator without an escrow row or Stripe evidence.

## Marketplace

- After **delivered**, funds release ~**7 days**; buyer dispute window **7 days** (`marketplaceSync`).
- Disputes pause release until Admin decides.

## Chargebacks

1. Freeze withdraw for the related creator.
2. Reverse unspent Coins when possible; pull ledger.
3. Contact buyer email from Stripe; document dispute id.
4. CS macros: `docs/SUPPORT_MACROS.md`. Stripe incidents: `docs/RUNBOOK_STRIPE_WEBHOOK.md`.

Also mirrored in Help FAQ and Admin → Setup copy blocks.
