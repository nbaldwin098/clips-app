import { lsGet, lsSet } from './storage'

const KEY = 'calabi_theme'

/** Site is dark by default. Light is an opt-in preference. */
export function getTheme() {
  try {
    const t = lsGet(KEY, 'dark')
    return t === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark'
  try { lsSet(KEY, next) } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
  }
  return next
}

export function toggleTheme() {
  return applyTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function initTheme() {
  return applyTheme(getTheme())
}
