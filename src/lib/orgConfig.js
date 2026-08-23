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
  productName: 'Clips',
  domain: 'calabi.us',
  supportEmail: env('VITE_SUPPORT_EMAIL', 'support@calabi.us'),
  copyrightEmail: env('VITE_COPYRIGHT_EMAIL', 'copyright@calabi.us'),
  privacyEmail: env('VITE_PRIVACY_EMAIL', 'privacy@calabi.us'),
  /** Owner handle — only this account is platform admin */
  ownerHandle: 'cs1',
  /** Creator applications open window (ISO dates, inclusive) */
  applicationsOpenFrom: env('VITE_APPS_OPEN_FROM', '2026-08-01'),
  applicationsOpenUntil: env('VITE_APPS_OPEN_UNTIL', '2026-09-30'),
  applicationsOpenMessage:
    'Creator applications are open for a limited time. After this window, apply + approve continues as normal.',
}

export function applicationsAreOpen(now = new Date()) {
  const from = new Date(ORG.applicationsOpenFrom)
  const until = new Date(ORG.applicationsOpenUntil)
  until.setHours(23, 59, 59, 999)
  return now >= from && now <= until
}

export function applicationsWindowLabel() {
  return `${ORG.applicationsOpenFrom} → ${ORG.applicationsOpenUntil}`
}

/** Weekly ops checklist for admin */
export const OPS_CHECKLIST = [
  'Approve or reject pending creator applications',
  'Review open support tickets',
  'Check reports / DMCA inbox (' + 'copyright' + ' email)',
  'Confirm Render deploy is green',
  'Spot-check feed for stolen or abusive content',
  'Verify Supabase Storage free-tier usage',
]

export const CONTENT_RULES_SHORT = [
  'Only post media you own or have rights to (or clearly licensed CC0/CC-BY with credit).',
  'No illegal content, scams, or non-consensual intimate imagery.',
  'No impersonation of other people or brands.',
  'Spam, bots, and fake engagement are not allowed.',
  'Live and chat: follow community guidelines; mods may timeout/ban.',
  'Copyright complaints: use the designated copyright email; we follow notice-and-takedown.',
]
