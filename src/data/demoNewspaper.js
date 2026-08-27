/** Seed newspaper stories — paragraphs + photos for News tab density. */
export const SEED_NEWSPAPER = [
  {
    id: 'seed_paper_01',
    handle: 'calabi',
    displayName: 'calabi desk',
    publishedAt: '2026-08-26T14:00:00.000Z',
    body: `Creators opened the week with longer livestreams and tighter clip edits, packing Recommended with fresh cuts from overnight sessions.

Across the catalog, photo posts carried more of the scroll — still frames from sets, street walks, and product tables that hold attention without asking for sound.

Studio tools kept the loop simple: upload, price if you want, publish. Fans followed free and only paid when a livestream membership or tip felt worth it.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80', alt: 'Concert lights over a crowd' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80', alt: 'Camera on a studio desk' },
    ],
  },
  {
    id: 'seed_paper_02',
    handle: 'fieldnotes',
    displayName: 'Field Notes',
    publishedAt: '2026-08-25T18:30:00.000Z',
    body: `A coastal creator streamed from the pier at dawn, letting chat watch the light change while clips from the same hour landed in Shorts by noon.

Elsewhere, kitchen demos and beat-making lobbies filled Live shelves with lobby cards — thumbnails first, video only when ingest is actually connected.

Shop listings stayed quiet in some regions, but creator merch mockups in Studio showed how physical and virtual goods can sit beside tips without turning the feed into an ad wall.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80', alt: 'Beach at sunrise' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900&q=80', alt: 'Cooking at a stove' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&q=80', alt: 'Music studio gear' },
    ],
  },
  {
    id: 'seed_paper_03',
    handle: 'signal',
    displayName: 'Signal',
    publishedAt: '2026-08-24T11:15:00.000Z',
    body: `Appeals and trust tools moved into clearer language this build: strikes, holds, and status labels creators can read without hunting through support threads.

Messages stayed cloud-backed for signed-in accounts, with New message entry points from the profile menu so DMs are not buried under settings.

On the money side, Wallet and Rewards stayed separate — packs and orders in one place, reward ledger in another — while checkout still settles on Stripe before anything unlocks.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80', alt: 'Checkout counter' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=80', alt: 'Laptop with code' },
    ],
  },
  {
    id: 'seed_paper_04',
    handle: 'lensroom',
    displayName: 'Lens Room',
    publishedAt: '2026-08-23T09:00:00.000Z',
    body: `Pics got a canvas treatment: pan the mosaic, zoom toward the cursor, then lock into a single photo when you click or zoom far enough.

High-resolution frames keep overflow pan inside focus view, and Escape drops you back to the macro grid without dumping your camera position.

Photographers testing the tab filled shelves with travel stills, stage lights, and desk setups — enough density to stress-scroll the newspaper columns beside them.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=900&q=80', alt: 'Photographer with camera' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80', alt: 'Mountain landscape' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80', alt: 'Stage performance' },
    ],
  },
  {
    id: 'seed_paper_05',
    handle: 'orbit',
    displayName: 'Orbit Desk',
    publishedAt: '2026-08-22T16:45:00.000Z',
    body: `Admin finance stayed owner-only: Stripe ledger rows, payout marks, and seller approvals without exposing platform fee math on creator dashboards.

Light theme work aimed at those dashboards first — white cards, navy rails, KPI strips — so Studio and Admin feel like tools instead of another dark feed.

Tonight’s pass is density and clarity: Live previews, News columns, Shop tabs, and dashboards that still run on the same auth and catalog you already have.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80', alt: 'Analytics dashboard on screen' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80', alt: 'Charts on a laptop' },
    ],
  },
  {
    id: 'seed_paper_06',
    handle: 'trailcast',
    displayName: 'Trailcast',
    publishedAt: '2026-08-21T13:20:00.000Z',
    body: `Weekend IRL streams leaned on scenery: forest paths, market stalls, and city walks with lobby cards that look live even when ingest is offline.

Viewers treated those cards like a window display — tap to inspect, no fake player spinning on empty HLS.

When a real camera share connects, the same shelf upgrades from Lobby to Live without changing the layout language.`,
    media: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80', alt: 'Forest path' },
      { type: 'image', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80', alt: 'Concert crowd' },
    ],
  },
]
