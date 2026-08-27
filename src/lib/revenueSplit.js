/**
 * Creator revenue split for subscriptions and tip checkout.
 * 80/20 is the product default — more creator-friendly than Twitch 50/50,
 * more sustainable than Kick-style 95/5 loss leaders.
 * No ad revenue share — ads are not offered.
 */

export const CREATOR_REV_SHARE = 0.8
export const PLATFORM_REV_SHARE = 0.2

export function splitRevenue(amount, creatorRate = CREATOR_REV_SHARE) {
  const n = Math.round(Number(amount) * 100) / 100
  if (!Number.isFinite(n) || n <= 0) {
    return { gross: 0, creator: 0, platform: 0, creatorRate, platformRate: 1 - creatorRate }
  }
  const creator = Math.round(n * creatorRate * 100) / 100
  const platform = Math.round((n - creator) * 100) / 100
  return {
    gross: n,
    creator,
    platform,
    creatorRate,
    platformRate: Math.round((1 - creatorRate) * 1000) / 1000,
  }
}

export const REV_SPLIT_COPY = {
  title: '80 / 20 creator split',
  body: 'Creators keep 80% of memberships and tips. calabi keeps 20% to run the platform — more competitive than Twitch’s 50/50, and more sustainable than a 95/5 loss-leader model. There is no ad revenue share.',
}
