/**
 * Platform organization config — edit these; wire UI to this file.
 * Prefer env overrides when set on Render.
 */

function env(key, fallback) {
  try {
    const v = import.meta.env?.[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  } catch {
    return fallback
  }
}

/** Public contact — set real inboxes before serious creator launch */
export const ORG = {
  productName: 'calabi',
  domain: 'calabi.us',
  siteUrl: env('VITE_PUBLIC_SITE_URL', 'https://calabi.us'),
  supportEmail: env('VITE_SUPPORT_EMAIL', 'support@calabi.us'),
  copyrightEmail: env('VITE_COPYRIGHT_EMAIL', 'copyright@calabi.us'),
  privacyEmail: env('VITE_PRIVACY_EMAIL', 'privacy@calabi.us'),
  legalEmail: env('VITE_LEGAL_EMAIL', 'legal@calabi.us'),
  dmcaEmail: env('VITE_DMCA_EMAIL', 'dmca@calabi.us'),
  /** Owner dashboard — SQL Editor is here, not on calabi.us */
  supabaseSqlEditor: env(
    'VITE_SUPABASE_SQL_EDITOR',
    'https://supabase.com/dashboard/project/nohiyjcxpvfrvrvdfxjc/sql/new',
  ),
  /** Owner handle — only this account is platform admin */
  ownerHandle: 'cs1',
}

/** Public site origin for reset/OAuth links. Never send people to localhost. */
export function publicOrigin() {
  const configured = String(ORG.siteUrl || 'https://calabi.us').replace(/\/$/, '')
  try {
    if (typeof window !== 'undefined') {
      const o = String(window.location.origin || '')
      if (o && !/localhost|127\.0\.0\.1/i.test(o)) return o.replace(/\/$/, '')
    }
  } catch {}
  return configured
}

export function applicationsAreOpen() {
  return false
}

export function applicationsWindowLabel() {
  return 'closed — anyone with an account can post'
}

/** Weekly ops checklist for admin */
export const OPS_CHECKLIST = [
  'Anyone with an account can post — there is no creator application',
  'Review open support tickets',
  'Check reports / DMCA inbox (' + 'copyright' + ' email)',
  'Confirm Render deploy is green',
  'Spot-check feed for stolen or abusive content',
  'Verify Supabase Storage free-tier usage',
  'Review the live promo banner (Admin → Promos) — unpublish if the campaign ended',
]

export const CONTENT_RULES_SHORT = [
  'Only post media you own or have rights to (or clearly licensed CC0/CC-BY with credit).',
  'No illegal content, scams, or non-consensual intimate imagery.',
  'No impersonation of other people or brands.',
  'Spam, bots, and fake engagement are not allowed.',
  'Live and chat: follow community guidelines; mods may timeout/ban.',
  'Copyright complaints: use the designated copyright email; we follow notice-and-takedown.',
]
