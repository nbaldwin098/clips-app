import CreatorLab from './studio/CreatorLab'

/**
 * Calabi Studio — CapCut-grade edit, OBS-grade live mixer, and socials posting on-site.
 */
export default function CalabiStudioPage({ onNavigate, initialMode = 'edit' }) {
  return <CreatorLab onNavigate={onNavigate} initialMode={initialMode} />
}
