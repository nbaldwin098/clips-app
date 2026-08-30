import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    VITE_SUPPORT_EMAIL: process.env.VITE_SUPPORT_EMAIL || '',
    VITE_COPYRIGHT_EMAIL: process.env.VITE_COPYRIGHT_EMAIL || '',
    VITE_PRIVACY_EMAIL: process.env.VITE_PRIVACY_EMAIL || '',
    VITE_LEGAL_EMAIL: process.env.VITE_LEGAL_EMAIL || '',
    VITE_DMCA_EMAIL: process.env.VITE_DMCA_EMAIL || '',
    VITE_STRIPE_PUBLISHABLE_KEY: process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    VITE_STRIPE_PAYMENT_LINK: process.env.VITE_STRIPE_PAYMENT_LINK || '',
    VITE_PLATFORM_OWNER_ID: process.env.VITE_PLATFORM_OWNER_ID || '',
    VITE_LIVE_INGEST_CONNECTED: process.env.VITE_LIVE_INGEST_CONNECTED || process.env.NEXT_PUBLIC_LIVE_INGEST_CONNECTED || '',
    VITE_LIVE_RTMP_URL: process.env.VITE_LIVE_RTMP_URL || process.env.NEXT_PUBLIC_LIVE_RTMP_URL || '',
    NEXT_PUBLIC_LIVE_RTMP_URL: process.env.NEXT_PUBLIC_LIVE_RTMP_URL || process.env.VITE_LIVE_RTMP_URL || '',
    VITE_LIVE_HLS_BASE: process.env.VITE_LIVE_HLS_BASE || process.env.NEXT_PUBLIC_LIVE_HLS_BASE || '',
    NEXT_PUBLIC_LIVE_HLS_BASE: process.env.NEXT_PUBLIC_LIVE_HLS_BASE || process.env.VITE_LIVE_HLS_BASE || '',
    VITE_LIVE_WHIP_URL: process.env.VITE_LIVE_WHIP_URL || process.env.NEXT_PUBLIC_LIVE_WHIP_URL || '',
    NEXT_PUBLIC_LIVE_WHIP_URL: process.env.NEXT_PUBLIC_LIVE_WHIP_URL || process.env.VITE_LIVE_WHIP_URL || '',
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    }
    config.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    })
    return config
  },
}

export default nextConfig
