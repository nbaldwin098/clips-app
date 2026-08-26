import { useMemo, useState, useCallback } from 'react'
import {
  Code2,
  Boxes,
  Radio,
  Webhook,
  Package,
  FileSpreadsheet,
  Network,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import PageHeader from './PageHeader'
import { useAuth } from '../context/AuthContext'
import { lsGet, lsSet } from '../lib/storage'
import { cn } from '../lib/utils'

const PRODUCTS = [
  {
    id: 'embed',
    icon: Boxes,
    title: 'Embed Widget',
    tagline: 'Drop a live bubble map into any site',
    body: 'Ship an iframe or script tag that renders a post or channel bubble. Partners control theme, hub content id, and LOD caps. Ideal for creator portfolios, CMS plugins, and media sites.',
    endpoints: [
      'GET /v1/embed/bubble?contentId=&theme=',
      'POST /v1/embed/tokens  → short-lived embed JWT',
    ],
    sample: `<iframe
  src="https://calabi.us/embed/bubble?contentId=POST_ID&theme=dark"
  title="Audience bubble"
  style="width:100%;height:480px;border:0"
  loading="lazy"
></iframe>`,
  },
  {
    id: 'snapshot',
    icon: Network,
    title: 'REST Graph Snapshot',
    tagline: 'Pull the interaction graph as JSON',
    body: 'Fetch hub + people + edges for a content id or channel. Responses are LOD-ready: top-N actors plus an aggregate “more” node when the population is in the millions.',
    endpoints: [
      'GET /v1/bubbles/{contentId}',
      'GET /v1/bubbles/{contentId}?cap=240&until=',
      'GET /v1/channels/{handle}/bubbles',
    ],
    sample: `curl -H "Authorization: Bearer $CALABI_KEY" \\
  "https://api.calabi.us/v1/bubbles/CONTENT_ID?cap=240"`,
  },
  {
    id: 'stream',
    icon: Radio,
    title: 'Live Event Stream',
    tagline: 'SSE / WebSocket of bubble events',
    body: 'Subscribe to view, like, follow, share, skip, and tip events as they land. Platforms mirror audience growth into their own dashboards without polling.',
    endpoints: [
      'GET /v1/stream/bubbles/{contentId}  (text/event-stream)',
      'WSS /v1/ws/bubbles/{contentId}',
    ],
    sample: `const es = new EventSource(
  "https://api.calabi.us/v1/stream/bubbles/CONTENT_ID?token=" + key
);
es.onmessage = (e) => updateBubble(JSON.parse(e.data));`,
  },
  {
    id: 'webhooks',
    icon: Webhook,
    title: 'Webhook Ingest & Push',
    tagline: 'Push events in — or receive them out',
    body: 'Businesses that already have engagement pipelines can POST signed interaction batches into calabi bubbles, or register HTTPS endpoints to receive signed outbound bubble events.',
    endpoints: [
      'POST /v1/ingest/interactions',
      'POST /v1/webhooks  → register callback URL',
      'POST /v1/webhooks/test',
    ],
    sample: `curl -X POST https://api.calabi.us/v1/ingest/interactions \\
  -H "Authorization: Bearer $CALABI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contentId":"…","events":[{"actorId":"…","type":"like","at":"…"}]}'`,
  },
  {
    id: 'sdk',
    icon: Package,
    title: 'White-label Platform SDK',
    tagline: 'Host bubbles inside your product',
    body: 'npm @calabi/bubble-sdk — React/Vue/vanilla mounts with your brand colors, your domain, optional calabi chrome off. Same LOD engine that keeps millions of actors fitting in one viewport.',
    endpoints: [
      'npm i @calabi/bubble-sdk',
      'BubbleMap.mount(el, { apiKey, contentId, brand })',
    ],
    sample: `import { BubbleMap } from "@calabi/bubble-sdk";

BubbleMap.mount("#map", {
  apiKey: process.env.CALABI_KEY,
  contentId: "CONTENT_ID",
  brand: { accent: "#38bdf8", hubLabel: "Your App" },
  cap: 240,
});`,
  },
  {
    id: 'export',
    icon: FileSpreadsheet,
    title: 'Batch Analytics Export',
    tagline: 'CSV / Parquet for warehouses',
    body: 'Scheduled or on-demand exports of interaction tallies, unique actors, and LOD cluster sizes — for Snowflake, BigQuery, or internal BI without rendering the map.',
    endpoints: [
      'POST /v1/exports  → { format: "csv"|"parquet", range }',
      'GET /v1/exports/{jobId}',
    ],
    sample: `curl -X POST https://api.calabi.us/v1/exports \\
  -H "Authorization: Bearer $CALABI_KEY" \\
  -d '{"contentId":"…","format":"parquet","range":"30d"}'`,
  },
  {
    id: 'query',
    icon: Code2,
    title: 'Graph Query API',
    tagline: 'Ask the bubble graph questions',
    body: 'Filter actors by action type, time window, or surface; return ranked neighborhoods around a hub. Built for recommendation partners and research teams.',
    endpoints: [
      'POST /v1/graph/query',
      '{ "hub": "content:…", "where": { "types": ["like","share"] }, "limit": 100 }',
    ],
    sample: `curl -X POST https://api.calabi.us/v1/graph/query \\
  -H "Authorization: Bearer $CALABI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"hub":"content:CONTENT_ID","where":{"types":["like"]},"limit":50}'`,
  },
]

const KEYS_LS = 'calabi_bubble_api_keys_v1'

function loadKeys() {
  const raw = lsGet(KEYS_LS, [])
  return Array.isArray(raw) ? raw : []
}

function makeKey() {
  const bytes = new Uint8Array(24)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `cb_live_${body}`
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 h-7 px-2 text-[11px] font-semibold border border-zinc-700 text-zinc-300 hover:text-white"
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(text)
          setOk(true)
          setTimeout(() => setOk(false), 1200)
        } catch {}
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * More → API: business / platform access to the bubble system.
 */
export default function BubbleApiPage({ onNavigate }) {
  const { user, isAuthenticated } = useAuth()
  const [active, setActive] = useState(PRODUCTS[0].id)
  const [keys, setKeys] = useState(() => loadKeys())
  const product = useMemo(
    () => PRODUCTS.find((p) => p.id === active) || PRODUCTS[0],
    [active]
  )

  const createKey = useCallback(() => {
    if (!isAuthenticated) return
    const next = [
      {
        id: `k_${Date.now()}`,
        label: `Key ${keys.length + 1}`,
        prefix: 'cb_live_',
        secret: makeKey(),
        createdAt: new Date().toISOString(),
        ownerId: user?.id || null,
        scopes: ['embed', 'snapshot', 'stream', 'webhooks', 'sdk', 'export', 'query'],
      },
      ...keys,
    ].slice(0, 8)
    setKeys(next)
    lsSet(KEYS_LS, next.map((k) => ({ ...k, secret: `${k.secret.slice(0, 12)}…` })))
  }, [isAuthenticated, keys, user?.id])

  const revokeKey = useCallback((id) => {
    const next = keys.filter((k) => k.id !== id)
    setKeys(next)
    lsSet(KEYS_LS, next.map((k) => ({ ...k, secret: k.secret?.includes('…') ? k.secret : `${String(k.secret).slice(0, 12)}…` })))
  }, [keys])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <PageHeader title="Bubble API" onBack={() => onNavigate?.('home')} />
      <div className="space-y-2">
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
          Let businesses and platforms use calabi’s audience bubble system — the same LOD engine that
          keeps millions of actors inside one viewport. Pick a product path below; every mode shares
          one API key model and cloud-backed interaction truth.
        </p>
        <p className="text-xs text-zinc-500">
          Live HTTP surfaces roll out behind partner keys. Keys created here are stored on this device for development; production keys will sync to your cloud account.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-[#0e0e14] p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">API keys</h2>
          </div>
          <button
            type="button"
            disabled={!isAuthenticated}
            onClick={createKey}
            className={cn(
              'h-8 px-3 text-xs font-semibold border',
              isAuthenticated
                ? 'border-white text-white hover:bg-white hover:text-black'
                : 'border-zinc-700 text-zinc-500 cursor-not-allowed'
            )}
          >
            {isAuthenticated ? 'Create key' : 'Sign in to create a key'}
          </button>
        </div>
        {!keys.length ? (
          <p className="text-xs text-zinc-500">No keys yet. Create one after cloud sign-in.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center gap-2 justify-between rounded-lg border border-zinc-800 bg-[#121218] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{k.label}</p>
                  <p className="text-[11px] font-mono text-zinc-400 truncate">{k.secret}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!String(k.secret).includes('…') ? <CopyBtn text={k.secret} /> : null}
                  <button
                    type="button"
                    onClick={() => revokeKey(k.id)}
                    className="h-7 px-2 text-[11px] font-semibold border border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Ways to use the bubble system</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRODUCTS.map((p) => {
            const Icon = p.icon
            const on = p.id === active
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={cn(
                  'text-left rounded-xl border px-3 py-3 transition-colors',
                  on ? 'border-white bg-[#16161f]' : 'border-zinc-800 bg-[#0e0e14] hover:border-zinc-600'
                )}
              >
                <Icon className={cn('h-4 w-4 mb-2', on ? 'text-white' : 'text-zinc-500')} />
                <p className="text-xs font-semibold text-white">{p.title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{p.tagline}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#0e0e14] overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-zinc-800 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{product.title}</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">{product.body}</p>
          </div>
          <a
            href={`#${product.id}`}
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white"
          >
            Docs anchor <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="px-4 md:px-5 py-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Endpoints</p>
          <ul className="space-y-1.5">
            {product.endpoints.map((line) => (
              <li key={line} className="text-[12px] font-mono text-zinc-300 break-all">
                {line}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 pt-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sample</p>
            <CopyBtn text={product.sample} />
          </div>
          <pre className="text-[11px] leading-relaxed text-zinc-300 bg-black/50 border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {product.sample}
          </pre>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#121218] p-4 md:p-5 text-xs text-zinc-400 space-y-2">
        <h2 className="text-sm font-semibold text-white">Scale contract</h2>
        <p>
          Bubble responses never ask clients to paint millions of DOM nodes. The API returns a soft-capped
          actor set (default 240) plus an aggregate cluster carrying the remaining population weight —
          the same contract Creator Studio uses so maps always fit their box.
        </p>
        <p>
          Rate limits, partner SLAs, and signed webhook secrets ship with production keys. Until then,
          use this page to design integrations against the published shapes above.
        </p>
      </section>
    </div>
  )
}
