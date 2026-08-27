# Own Stripe Connect (legacy / OFF)

**Stripe Express is off.** Creators use **Studio → Earnings** and ops pays from **Admin → Payouts**.
See **`docs/OWN_PAYOUTS.md`**.

Buyers still use platform Checkout Sessions (`docs/OWN_CHECKOUT.md`).

The `create-connect-account` Edge Function may still exist in the repo for rollback only —
the client no longer calls it (`stripeConnect.js` returns disabled).
