/** User-facing auth copy. Never show the backend vendor name. */

export function sanitizeAuthError(raw) {
  const t = String(raw || '').trim()
  const lower = t.toLowerCase()
  if (!t) return 'Could not finish sign-in. Try again.'
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'That sign-in is not turned on yet.'
  }
  if (lower.includes('invalid login') || lower.includes('invalid email or password') || lower.includes('invalid credentials')) {
    return 'Wrong email or password.'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'That email already has an account. Sign in instead.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Check your email from Clips, then sign in.'
  }
  if (lower.includes('token has expired') || lower.includes('otp') || lower.includes('invalid token')) {
    return 'That code is wrong or expired. Send a new one.'
  }
  if (lower.includes('signups not allowed')) {
    return 'New accounts are paused right now.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many tries. Wait a minute.'
  }
  if (lower.includes('supabase') || lower.includes('gotrue')) {
    return 'Could not finish sign-in. Try again.'
  }
  return t.replace(/supabase/gi, 'Clips').replace(/gotrue/gi, 'Clips').slice(0, 180)
}

export function normalizePhone(raw) {
  const cleaned = String(raw || '').trim()
  if (!cleaned) return ''
  const plus = cleaned.startsWith('+')
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length < 10) return ''
  if (plus) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export const CLIPS_RESET_EMAIL_SUBJECT = 'Reset your Clips password'
export const CLIPS_RESET_EMAIL_BODY = `Reset your Clips password:

{{ .ConfirmationURL }}

If you did not ask for this, ignore this email.
— Clips`

export const CLIPS_CONFIRM_EMAIL_SUBJECT = 'Confirm your Clips account'
export const CLIPS_CONFIRM_EMAIL_BODY = `Confirm your Clips account:

{{ .ConfirmationURL }}

— Clips`

export const CLIPS_SMS_TEMPLATE = 'Your Clips code is {{ .Code }}'
