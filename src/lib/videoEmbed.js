/**
 * Embed URL Extractor & Stream Parser
 * Converts various platform URLs (YouTube, TikTok, Instagram, Twitch, Kick, direct mp4/webm/m3u8)
 * into directly playable web embeds or streams.
 */

export function parseEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  try {
    const u = new URL(trimmed)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    const path = u.pathname
    const searchParams = u.searchParams

    // 1. YouTube & YouTube Shorts
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
          src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`,
          platform: 'youtube',
        }
      }
    }

    // 2. TikTok
    if (host.includes('tiktok.com')) {
      const videoIdMatch = path.match(/\/video\/(\d+)/)
      if (videoIdMatch && videoIdMatch[1]) {
        return {
          type: 'iframe',
          src: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`,
          platform: 'tiktok',
        }
      }
    }

    // 3. Twitch Clips & Streams
    if (host.includes('twitch.tv')) {
      if (host.includes('clips.twitch.tv') || path.includes('/clip/')) {
        const clipId = host.includes('clips.twitch.tv')
          ? path.replace(/^\//, '').split('?')[0]
          : path.split('/clip/')[1]?.split('?')[0]
        if (clipId) {
          const parent = typeof window !== 'undefined' ? window.location.hostname : 'calabi.us'
          return {
            type: 'iframe',
            src: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}&autoplay=true`,
            platform: 'twitch',
          }
        }
      }
    }

    // 4. Direct video files & Blob URLs
    if (
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:') ||
      /\.(mp4|webm|mov|m4v|ogv)($|\?)/i.test(path) ||
      /\.(mp4|webm|mov|m4v|ogv)($|\?)/i.test(trimmed)
    ) {
      return {
        type: 'video',
        src: trimmed,
        platform: 'direct',
      }
    }
  } catch {
    // If not a valid standard URL, check if blob or data
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return {
        type: 'video',
        src: trimmed,
        platform: 'direct',
      }
    }
  }

  return null
}
