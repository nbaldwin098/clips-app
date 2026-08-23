import React, { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Tv,
  Share2,
  Heart,
  Radio,
  Eye,
  Gift,
  Check,
  Flame,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

export default function VideoPlayerBox({
  channel,
  onFollowToggle,
  isFollowed,
  onOpenSubscribeModal,
}) {
  const { accent, accentKey, theaterMode, setTheaterMode } = useTheme()

  const videoRef = useRef(null)
  const containerRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [quality, setQuality] = useState('1080p60')
  const [showSettings, setShowSettings] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(1420)
  const [copiedLink, setCopiedLink] = useState(false)

  const controlsTimeoutRef = useRef(null)

  const formatViewers = (n) => {
    if (!n) return '0'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  // Hide controls after inactivity
  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3200)
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    setIsMuted(next)
    videoRef.current.muted = next
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (videoRef.current) {
      videoRef.current.volume = val
      videoRef.current.muted = val === 0
      setIsMuted(val === 0)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Auto-play when channel changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        // Autoplay policy fallback: mute and play
        if (videoRef.current) {
          videoRef.current.muted = true
          setIsMuted(true)
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
        }
      })
    }
  }, [channel?.id])

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }

  return (
    <div className="w-full flex flex-col">
      {/* Aspect Ratio Video Container (16:9 standard Twitch/Kick Player) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={cn(
          'relative w-full bg-black overflow-hidden group select-none shadow-2xl transition-all',
          theaterMode ? 'h-[70vh] max-h-[820px]' : 'aspect-video max-h-[680px] rounded-none sm:rounded-xl border border-[#272732]'
        )}
      >
        {/* Actual Video Tag */}
        <video
          ref={videoRef}
          src={channel?.videoUrl}
          poster={channel?.videoPoster}
          loop
          playsInline
          autoPlay
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Live Top Overlay Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
          <div className="flex items-center gap-2">
            {channel?.isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eb0400] text-white font-extrabold text-xs uppercase tracking-wider live-badge-glow pointer-events-auto">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-zinc-800/80 backdrop-blur text-zinc-300 font-bold text-xs uppercase tracking-wider pointer-events-auto">
                OFFLINE VOD
              </span>
            )}

            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur text-white text-xs font-semibold pointer-events-auto">
              <Eye className="h-3.5 w-3.5 text-zinc-300" />
              {formatViewers(channel?.viewers)} viewers
            </span>

            {channel?.uptime && (
              <span className="hidden sm:inline-flex px-2 py-1 rounded bg-black/50 backdrop-blur text-zinc-300 text-xs font-medium pointer-events-auto">
                {channel.uptime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <span
              className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: accent.primary,
                border: `1px solid ${accent.badgeBorder}`,
              }}
            >
              {quality}
            </span>
          </div>
        </div>

        {/* Big Center Play Button when Paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-10"
          >
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-black transition-transform hover:scale-110 shadow-2xl"
              style={{ backgroundColor: accent.primary }}
            >
              <Play className="h-8 w-8 fill-current ml-1" />
            </div>
          </div>
        )}

        {/* Bottom Control Bar */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 pt-10 flex items-center justify-between text-white transition-opacity duration-300 z-20',
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Left Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5 text-red-400" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1.5 accent-[var(--color-accent-primary)] bg-zinc-600 rounded-lg cursor-pointer"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-[#eb0400]" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theater Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheaterMode(!theaterMode)}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10',
                theaterMode ? 'text-[var(--color-accent-primary)]' : 'text-zinc-200'
              )}
              title={theaterMode ? 'Default View (Alt+T)' : 'Theater Mode (Alt+T)'}
            >
              <Tv className="h-4.5 w-4.5" />
            </button>

            {/* Quality Settings Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-200 transition-colors"
                title="Settings"
              >
                <Settings className="h-4.5 w-4.5" />
              </button>

              {showSettings && (
                <div className="absolute bottom-12 right-0 w-44 rounded-xl border border-[#303040] bg-[#12121b] shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 font-bold text-zinc-400 uppercase tracking-wider text-[10px] border-b border-[#252535] mb-1">
                    Stream Quality
                  </div>
                  {['1080p60', '720p60', '480p30', 'Auto'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setQuality(q)
                        setShowSettings(false)
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-left text-zinc-200 hover:bg-[#1f1f2e] hover:text-white"
                    >
                      <span>{q}</span>
                      {quality === q && <Check className="h-3.5 w-3.5" style={{ color: accent.primary }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stream Info & Interactive Metadata Bar */}
      <div className="p-4 sm:p-5 bg-[#121218] rounded-b-xl border-x border-b border-[#23232c] space-y-4">
        
        {/* Title + Action Buttons Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Creator Profile Details */}
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={channel?.avatar}
                alt={channel?.displayName}
                className="h-12 w-12 rounded-full object-cover border-2"
                style={{ borderColor: accent.primary }}
              />
              {channel?.isLive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded text-[9px] font-black bg-[#eb0400] text-white uppercase tracking-tighter">
                  LIVE
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white truncate">
                  {channel?.displayName}
                </h1>
                {channel?.verified && (
                  <span
                    className="flex items-center justify-center h-4 w-4 rounded-full text-black"
                    style={{ backgroundColor: accent.primary }}
                    title="Verified Partner"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  {channel?.game}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-200 font-medium mt-0.5 line-clamp-2">
                {channel?.title}
              </p>

              {/* Stream Tags */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {channel?.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1a1a24] text-zinc-300 border border-[#272736] hover:border-zinc-500 cursor-pointer transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons (Follow, Subscribe, Like, Share) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Follow Button */}
            <button
              type="button"
              onClick={onFollowToggle}
              className={cn(
                'flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95',
                isFollowed
                  ? 'bg-[#1f1f28] border border-[#2e2e3b] text-zinc-300 hover:bg-[#282834]'
                  : 'text-black hover:brightness-110'
              )}
              style={
                !isFollowed
                  ? {
                      backgroundColor: accent.primary,
                      color: accentKey === 'green' ? '#000000' : '#ffffff',
                    }
                  : {}
              }
            >
              <Heart className={cn('h-3.5 w-3.5', isFollowed && 'fill-current text-red-400')} />
              <span>{isFollowed ? 'Following' : 'Follow'}</span>
            </button>

            {/* Subscribe / Sub Tier Button */}
            <button
              type="button"
              onClick={onOpenSubscribeModal}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold bg-gradient-to-r from-[#9146FF] to-[#6018c5] text-white hover:brightness-110 transition-all shadow-md active:scale-95"
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Subscribe</span>
            </button>

            {/* Like React Button */}
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors',
                liked
                  ? 'bg-red-500/10 border-red-500/40 text-red-400'
                  : 'bg-[#181822] border-[#272734] text-zinc-300 hover:bg-[#20202e]'
              )}
            >
              <Flame className={cn('h-3.5 w-3.5', liked && 'fill-current')} />
              <span>{likeCount}</span>
            </button>

            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#181822] border border-[#272734] text-xs font-semibold text-zinc-300 hover:bg-[#20202e] transition-colors"
              title="Share Stream URL"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Creator Bio & Stats Subsection */}
        <div className="pt-3 border-t border-[#23232c] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
          <p className="max-w-xl text-zinc-300">
            {channel?.bio}
          </p>
          <div className="flex items-center gap-4 shrink-0 font-medium">
            <span><strong>{(channel?.followers / 1000000).toFixed(1)}M</strong> Followers</span>
            <span>Category: <strong className="text-zinc-200">{channel?.category}</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
