/**
 * Parse URLs into iframe embeds or direct HTML5 video sources.
 */
export function parseEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return { type: 'video', src: trimmed, platform: 'direct' }
  }

  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    const path = u.pathname
    const searchParams = u.searchParams

    // Supabase / R2 / any storage object URL → direct video
    if (
      host.includes('supabase.co') ||
      host.includes('supabase.in') ||
      path.includes('/storage/v1/object/') ||
      host.includes('r2.cloudflarestorage.com') ||
      host.includes('cloudflare')
    ) {
      return { type: 'video', src: trimmed, platform: 'storage' }
    }

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = null
      if (path.includes('/shorts/')) {
        videoId = path.split('/shorts/')[1]?.split('/')[0]?.split('?')[0]
      } else if (path.includes('/watch')) {
        videoId = searchParams.get('v')
      } else if (host.includes('youtu.be')) {
        videoId = path.replace(/^\//, '').split('?')[0]
      } else if (path.includes('/embed/')) {
        videoId = path.split('/embed/')[1]?.split('?')[0]
      }
      if (videoId) {
        return {
          type: 'iframe',
          src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`,
          platform: 'youtube',
        }
      }
    }

    if (host.includes('tiktok.com')) {
      const videoIdMatch = path.match(/\/video\/(\d+)/) || path.match(/\/v\/(\d+)/)
      if (videoIdMatch?.[1]) {
        return {
          type: 'iframe',
          src: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?lang=en-US`,
          platform: 'tiktok',
        }
      }
    }

    if (host.includes('instagram.com') || host.includes('instagr.am')) {
      const reelMatch = path.match(/\/(reel|reels|p)\/([a-zA-Z0-9_-]+)/)
      if (reelMatch?.[2]) {
        return {
          type: 'iframe',
          src: `https://www.instagram.com/reel/${reelMatch[2]}/embed`,
          platform: 'instagram',
        }
      }
    }

    if (host.includes('twitch.tv')) {
      if (host.includes('clips.twitch.tv') || path.includes('/clip/')) {
        const clipId = host.includes('clips.twitch.tv')
          ? path.replace(/^\//, '').split('?')[0]
          : path.split('/clip/')[1]?.split('?')[0]
        if (clipId) {
          const parent = typeof window !== 'undefined' ? window.location.hostname || 'calabi.us' : 'calabi.us'
          return {
            type: 'iframe',
            src: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}&autoplay=true`,
            platform: 'twitch',
          }
        }
      }
    }

    if (host.includes('kick.com') && path.includes('/clip/')) {
      const clipId = path.split('/clip/')[1]?.split('?')[0]
      if (clipId) {
        return {
          type: 'iframe',
          src: `https://player.kick.com/clip/${clipId}?autoplay=true`,
          platform: 'kick',
        }
      }
    }

    if (/\.(mp4|webm|mov|m4v|ogv|m3u8)($|\?)/i.test(path) || /\.(mp4|webm|mov|m4v|ogv|m3u8)($|\?)/i.test(trimmed)) {
      return { type: 'video', src: trimmed, platform: 'direct' }
    }

    // Unknown https link — still try as video (many CDNs omit extensions)
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return { type: 'video', src: trimmed, platform: 'direct' }
    }
  } catch {
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return { type: 'video', src: trimmed, platform: 'direct' }
    }
  }

  return null
}
