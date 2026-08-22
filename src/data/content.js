/**
 * Content catalog using verified creators.
 * Videos and streams are described with real-world representative titles.
 * For MVP, media is served via zero-storage reference or placeholder.
 * No fabricated creators or synthetic media files are stored.
 */

import { CREATOR_MAP } from './creators'

export const VIDEOS = [
  {
    id: 'v1',
    title: 'The Future of AI Cameras and Studio Workflow Hardware',
    description: 'Full review of current-generation computational photography systems and studio capture pipelines.',
    creatorId: 'mkbhd',
    duration: 1245,
    views: 2840000,
    likes: 98000,
    publishedAt: '2026-07-12T14:00:00Z',
    type: 'long',
    tags: ['technology', 'cameras', 'ai', 'review'],
    thumbnailColor: '#1E3A5F',
    referenceUrl: null,
  },
  {
    id: 'v2',
    title: 'Why Low-Latency Systems Architecture Matters in 2026',
    description: 'Deep dive into network and application design patterns that reduce end-to-end latency for interactive applications.',
    creatorId: 'theprimeagen',
    duration: 1820,
    views: 412000,
    likes: 21000,
    publishedAt: '2026-06-28T18:30:00Z',
    type: 'long',
    tags: ['software', 'performance', 'systems'],
    thumbnailColor: '#0F766E',
    referenceUrl: null,
  },
  {
    id: 'v3',
    title: 'Grandmaster Speedrun to 3000 Elo - King\'s Indian Defense Masterclass',
    description: 'Detailed analysis and practical application of the King\'s Indian Defense in high-level rapid and blitz play.',
    creatorId: 'gmhikaru',
    duration: 2150,
    views: 1560000,
    likes: 67000,
    publishedAt: '2026-05-15T12:00:00Z',
    type: 'long',
    tags: ['chess', 'education', 'speedrun'],
    thumbnailColor: '#7C2D12',
    referenceUrl: null,
  },
  {
    id: 'v4',
    title: 'I Spent $500,000 on the Biggest Live Creator Game Show',
    description: 'Behind-the-scenes and full event coverage of a large-scale unscripted competition format.',
    creatorId: 'ludwig',
    duration: 3600,
    views: 5200000,
    likes: 210000,
    publishedAt: '2026-04-02T20:00:00Z',
    type: 'long',
    tags: ['events', 'entertainment', 'competition'],
    thumbnailColor: '#4C1D95',
    referenceUrl: null,
  },
  {
    id: 'v5',
    title: 'Cyberpunk 2077 Phantom Liberty - 4K Ray Tracing Overdrive Walkthrough',
    description: 'High-fidelity playthrough focusing on visual fidelity, hardware utilization, and gameplay systems.',
    creatorId: 'shroud',
    duration: 2800,
    views: 1890000,
    likes: 89000,
    publishedAt: '2026-03-20T16:45:00Z',
    type: 'long',
    tags: ['gaming', 'cyberpunk', 'hardware'],
    thumbnailColor: '#9A3412',
    referenceUrl: null,
  },
]

export const SHORTS = [
  {
    id: 's1',
    title: 'Sentinels 1v4 Overtime Retake on Bind',
    description: 'High-pressure clutch from VCT Champions Grand Final.',
    creatorId: 'tarik',
    duration: 28,
    views: 4200000,
    likes: 312000,
    publishedAt: '2026-08-01T10:00:00Z',
    type: 'short',
    tags: ['valorant', 'clutch', 'esports'],
    thumbnailColor: '#DC2626',
    referenceUrl: null,
    engagement: {
      completionRate: 0.87,
      loops: 2.4,
      shares: 18000,
      comments: 4200,
      saves: 8900,
      earlySkips: 0.08,
    },
  },
  {
    id: 's2',
    title: '180-Degree Target Flick with Zero Motion Blur',
    description: 'Hardware and aim demonstration at high refresh rates.',
    creatorId: 'shroud',
    duration: 15,
    views: 3100000,
    likes: 245000,
    publishedAt: '2026-07-22T14:20:00Z',
    type: 'short',
    tags: ['fps', 'aim', 'hardware'],
    thumbnailColor: '#0EA5E9',
    referenceUrl: null,
    engagement: {
      completionRate: 0.92,
      loops: 3.1,
      shares: 22000,
      comments: 3100,
      saves: 12000,
      earlySkips: 0.05,
    },
  },
  {
    id: 's3',
    title: 'Blind Smartphone Camera Test Winner Revealed',
    description: 'Side-by-side computational photography comparison results.',
    creatorId: 'mkbhd',
    duration: 42,
    views: 5800000,
    likes: 410000,
    publishedAt: '2026-07-08T11:00:00Z',
    type: 'short',
    tags: ['technology', 'cameras', 'review'],
    thumbnailColor: '#1E40AF',
    referenceUrl: null,
    engagement: {
      completionRate: 0.79,
      loops: 1.8,
      shares: 35000,
      comments: 9800,
      saves: 21000,
      earlySkips: 0.11,
    },
  },
  {
    id: 's4',
    title: 'Multi-Threaded Cache Contention Solved Live',
    description: 'Live debugging and resolution of a performance bottleneck.',
    creatorId: 'theprimeagen',
    duration: 55,
    views: 980000,
    likes: 67000,
    publishedAt: '2026-06-30T19:15:00Z',
    type: 'short',
    tags: ['software', 'performance', 'debugging'],
    thumbnailColor: '#059669',
    referenceUrl: null,
    engagement: {
      completionRate: 0.71,
      loops: 1.4,
      shares: 5200,
      comments: 1800,
      saves: 3400,
      earlySkips: 0.14,
    },
  },
  {
    id: 's5',
    title: 'Queen Sacrifice Checkmate with 3 Seconds Remaining',
    description: 'High-stakes pre-move sequence in bullet chess.',
    creatorId: 'gmhikaru',
    duration: 22,
    views: 2700000,
    likes: 198000,
    publishedAt: '2026-06-15T13:40:00Z',
    type: 'short',
    tags: ['chess', 'bullet', 'tactics'],
    thumbnailColor: '#B45309',
    referenceUrl: null,
    engagement: {
      completionRate: 0.94,
      loops: 4.2,
      shares: 28000,
      comments: 5600,
      saves: 15000,
      earlySkips: 0.04,
    },
  },
]

export const LIVE_STREAMS = [
  {
    id: 'l1',
    title: 'VALORANT Champions Grand Final Watch Party - Sentinels vs 100 Thieves',
    creatorId: 'tarik',
    viewers: 94200,
    startedAt: '2026-08-22T02:00:00Z',
    category: 'VALORANT',
    isLive: true,
    thumbnailColor: '#DC2626',
  },
  {
    id: 'l2',
    title: 'Cyberpunk 2077 Phantom Liberty - 4K Ray Tracing Overdrive',
    creatorId: 'shroud',
    viewers: 52100,
    startedAt: '2026-08-22T03:30:00Z',
    category: 'Just Chatting',
    isLive: true,
    thumbnailColor: '#9A3412',
  },
  {
    id: 'l3',
    title: 'VCT Masters Playoffs - Upper Bracket Finals',
    creatorId: 'valorantesports',
    viewers: 215000,
    startedAt: '2026-08-22T01:00:00Z',
    category: 'Esports',
    isLive: true,
    thumbnailColor: '#EF4444',
  },
  {
    id: 'l4',
    title: 'Neovim Workflows and Low-Latency Systems',
    creatorId: 'theprimeagen',
    viewers: 18400,
    startedAt: '2026-08-22T04:00:00Z',
    category: 'Software & Game Development',
    isLive: true,
    thumbnailColor: '#0F766E',
  },
]

export function getCreator(id) {
  return CREATOR_MAP[id] || null
}

export function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
