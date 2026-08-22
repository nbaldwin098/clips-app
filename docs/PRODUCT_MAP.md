# Clips — complete product map (deploy checklist)

## Public pages (no login)

| View id | Screen | Primary actions |
|---------|--------|-----------------|
| home | HomeFeed | Legal library, Import, Studio |
| shorts | ShortsFeed | Grid, Import |
| live | LiveView | Empty + Stream settings |
| explore | ExplorePage | Search, origin chips |
| history / liked / watch-later / library | LibraryPage | Tabs |
| help | HelpPage | FAQ |
| about | AboutPage | Principles |
| legal-* | Legal pages | Footer |
| (unknown) | NotFoundPage | Home / Explore |

## Auth-gated

| View / modal | Gate |
|--------------|------|
| Import / Upload modals | Sign in |
| dashboard / wallet | AuthRequired |
| settings | Profile / security / stream / monetization |

## Stripe

- `VITE_STRIPE_PUBLISHABLE_KEY` on Render (pk_test or pk_live)
- Secret key server-only later
- Never commit sk_ keys

## Render

- Static Site
- Build: `npm install && npm run build`
- Publish: `dist`
