import CreatorLab from './studio/CreatorLab'

/**
 * Calabi Studio — CapCut-grade edit, OBS-grade live mixer, and socials posting on-site.
 */
export default function CalabiStudioPage({ onNavigate, onOpenAuth, initialMode = 'edit' }) {
  return <CreatorLab onNavigate={onNavigate} onOpenAuth={onOpenAuth} initialMode={initialMode} />
}
