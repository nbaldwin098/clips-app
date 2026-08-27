# Escrow timeout policy (one-pager)

## Donation request tips (live)

- Viewer Cash/Coins for a **request tip** are **held** until the creator marks fulfilled and **Admin releases**.
- **Policy target:** if still `held` after **14 days**, Admin should **refund** the donor (no creator credit).
- If `fulfilled_pending_admin` longer than **7 days**, Admin should release or refund with a short note in the ticket.
- There is no automatic cron yet — apply this in Admin → Payouts / Live escrow desk.

## Marketplace orders

- After seller marks **delivered**, funds release on a **7-day** timer; buyer **dispute window is 7 days** from delivery (`marketplaceSync`).
- Disputes pause release until Admin decides (refund buyer / pay seller / split).

## Chargebacks

Stripe disputes override local escrow. Freeze related payouts, follow `docs/RUNBOOK_STRIPE_WEBHOOK.md` + `docs/SUPPORT_MACROS.md`.
