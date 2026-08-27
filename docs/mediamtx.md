# MediaMTX — free self-host RTMP + HLS

Calabi Live already builds stream keys and playback URLs from env. MediaMTX is a **free** way to provide the RTMP ingest + HLS CDN yourself (VPS, home lab, or a cheap cloud VM).

## Quick start

```bash
cd docker/mediamtx
docker compose up -d
```

- **OBS Server:** `rtmp://YOUR_PUBLIC_IP:1935/live`
- **OBS Stream key:** whatever Calabi Studio shows (or any path segment)
- **HLS play URL:** `http://YOUR_PUBLIC_IP:8888/live/<streamKey>/index.m3u8`

Open firewall ports **1935** (RTMP) and **8888** (HLS). Prefer a reverse proxy with TLS for HLS in production (`https://live.example.com/...`).

## Wire Calabi

In Render / `.env`:

```env
VITE_LIVE_RTMP_URL=rtmp://YOUR_HOST:1935/live
VITE_LIVE_HLS_BASE=https://YOUR_HOST/live
```

Studio Live already uses these via `getLiveRtmpUrl()` / `getLiveHlsBase()` in `src/lib/featureFlags.js`.

## Limits (honest)

| Free self-host | Still costs money / ops |
|----------------|-------------------------|
| Software + config in this repo | A VPS with public IP + bandwidth |
| Local LAN testing | TLS certs / domain for public HLS |
| One box, few concurrent streams | Multi-region CDN, recording, DVR |

Mux / Cloudflare Stream remain the paid managed options — see `docs/INFRA.md`.

## Security tips

- Do not expose MediaMTX admin without auth.
- Put HLS behind Cloudflare or nginx + HTTPS.
- Rotate stream keys in Studio if a key leaks.
- For production, pin the MediaMTX image tag instead of `latest`.
