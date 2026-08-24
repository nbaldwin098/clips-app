import { storeMediaBlob, getMediaBlobUrl } from './videoStorage'
import { uploadImageToSupabase } from './mediaUpload'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export function isHttpUrl(url) {
  const u = String(url || '')
  return u.startsWith('https://') || u.startsWith('http://')
}

/** Never put data: URLs in localStorage — they blow the quota and look like a failed save. */
export function isSiteProfileAsset(url) {
  return String(url || '') === '/media/black.png'
}

export function persistableMediaUrl(url) {
  const u = String(url || '')
  if (isHttpUrl(u) || isSiteProfileAsset(u)) return u
  return ''
}

export function avatarStoreId(userId) {
  return `profile_avatar_${userId}`
}

export function bannerStoreId(userId) {
  return `profile_banner_${userId}`
}

function dataUrlToFile(dataUrl, name) {
  const [head, body] = String(dataUrl).split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg'
  const bin = atob(body || '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], name, { type: mime })
}

export function fileFromDraft(draft, name) {
  if (!draft) return null
  if (draft instanceof File) return draft
  if (typeof draft === 'string' && draft.startsWith('data:image/')) return dataUrlToFile(draft, name)
  return null
}

export async function persistProfilePicture(user, { avatarDraft, bannerDraft }) {
  if (!user?.id) return { avatarUrl: user?.avatarUrl || '', bannerUrl: user?.bannerUrl || '' }
  let avatarUrl = persistableMediaUrl(user.avatarUrl)
  let bannerUrl = persistableMediaUrl(user.bannerUrl)

  const avatarFile = fileFromDraft(avatarDraft, 'avatar.jpg')
  if (avatarFile) {
    await storeMediaBlob(avatarStoreId(user.id), avatarFile)
    if (user.provider === 'supabase') {
      const up = await uploadImageToSupabase(avatarFile, user.id)
      if (up.ok && up.publicUrl) avatarUrl = up.publicUrl
    }
    if (!avatarUrl) avatarUrl = URL.createObjectURL(avatarFile)
  }

  const bannerFile = fileFromDraft(bannerDraft, 'banner.jpg')
  if (bannerFile) {
    await storeMediaBlob(bannerStoreId(user.id), bannerFile)
    if (user.provider === 'supabase') {
      const up = await uploadImageToSupabase(bannerFile, user.id)
      if (up.ok && up.publicUrl) bannerUrl = up.publicUrl
    }
    if (!bannerUrl) bannerUrl = URL.createObjectURL(bannerFile)
  }

  if (user.provider === 'supabase' && isSupabaseConfigured() && (avatarUrl || user.bio != null || user.displayName)) {
    try {
      const sb = await getSupabase()
      if (sb) {
        await sb.from('profiles').update({
          display_name: user.displayName || null,
          handle: user.handle || null,
          bio: user.bio || '',
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
      }
    } catch {}
  }

  return { avatarUrl, bannerUrl }
}

export async function restoreProfilePictures(userId, current = {}) {
  const out = { ...current }
  if (!userId) return out
  if (!isHttpUrl(out.avatarUrl) && !isSiteProfileAsset(out.avatarUrl)) {
    const local = await getMediaBlobUrl(avatarStoreId(userId))
    if (local) out.avatarUrl = local
  }
  if (!isHttpUrl(out.bannerUrl) && !isSiteProfileAsset(out.bannerUrl)) {
    const local = await getMediaBlobUrl(bannerStoreId(userId))
    if (local) out.bannerUrl = local
  }
  return out
}
