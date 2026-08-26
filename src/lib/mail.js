/**
 * Product email / verification codes.
 * When VITE_MAIL_FUNCTION_URL is set, POSTs to that Edge Function.
 * Otherwise returns a local demo code so UI flows work without inventing a fake "sent" email.
 */
import { runtimeEnv } from './runtimeEnv'

export function mailFunctionConfigured() {
  return !!String(runtimeEnv('VITE_MAIL_FUNCTION_URL') || '').trim()
}

/**
 * @returns {Promise<{ ok: boolean, demo?: boolean, error?: string, message?: string }>}
 */
export async function sendVerificationCodeEmail({ to, code, purpose = 'verify' }) {
  const email = String(to || '').trim().toLowerCase()
  const pin = String(code || '').trim()
  if (!email || !pin) return { ok: false, error: 'Missing email or code.' }

  const url = String(runtimeEnv('VITE_MAIL_FUNCTION_URL') || '').trim()
  if (!url) {
    return {
      ok: true,
      demo: true,
      message: `Mail is not configured yet. Use this code to continue: ${pin}`,
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, code: pin, purpose }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: text || `Mail function returned ${res.status}` }
    }
    return { ok: true, demo: false, message: `Code sent to ${email}.` }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach mail function.' }
  }
}
