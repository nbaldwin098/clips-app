/**
 * Embed URL Extractor & Stream Parser
 * Converts various platform URLs (YouTube, YouTube Shorts, TikTok, Instagram Reels, Twitch, Kick, direct mp4/webm/m3u8)
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
          src: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`,
          platform: 'youtube',
        }
      }
    }

    // 2. TikTok
    if (host.includes('tiktok.com')) {
      const videoIdMatch = path.match(/\/video\/(\d+)/) || path.match(/\/v\/(\d+)/)
      if (videoIdMatch && videoIdMatch[1]) {
        return {
          type: 'iframe',
          src: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?lang=en-US`,
          platform: 'tiktok',
        }
      }
    }

    // 3. Instagram Reels & Posts
    if (host.includes('instagram.com') || host.includes('instagr.am')) {
      const reelMatch = path.match(/\/(reel|reels|p)\/([a-zA-Z0-9_-]+)/)
      if (reelMatch && reelMatch[2]) {
        return {
          type: 'iframe',
          src: `https://www.instagram.com/reel/${reelMatch[2]}/embed`,
          platform: 'instagram',
        }
      }
    }

    // 4. Twitch Clips & Streams
    if (host.includes('twitch.tv')) {
      if (host.includes('clips.twitch.tv') || path.includes('/clip/')) {
        const clipId = host.includes('clips.twitch.tv')
          ? path.replace(/^\//, '').split('?')[0]
          : path.split('/clip/')[1]?.split('?')[0]
        if (clipId) {
          const parent = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'calabi.us'
          return {
            type: 'iframe',
            src: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}&autoplay=true`,
            platform: 'twitch',
          }
        }
      }
    }

    // 5. Kick Clips
    if (host.includes('kick.com')) {
      if (path.includes('/clip/')) {
        const clipId = path.split('/clip/')[1]?.split('?')[0]
        if (clipId) {
          return {
            type: 'iframe',
            src: `https://player.kick.com/clip/${clipId}?autoplay=true`,
            platform: 'kick',
          }
        }
      }
    }

    // 6. Direct video files & Blob URLs
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
