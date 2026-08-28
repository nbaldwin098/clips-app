#!/bin/sh
# Calabi Live — run on any always-on Ubuntu/Debian VPS. Does not touch Render.
# Usage: curl the raw file or copy this script, then: sudo sh bootstrap-vps.sh
set -eu

need_docker=0
if ! command -v docker >/dev/null 2>&1; then
  need_docker=1
fi
if ! docker compose version >/dev/null 2>&1; then
  need_docker=1
fi

if [ "$need_docker" = 1 ]; then
  echo "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker || true
fi

ROOT=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$ROOT"

docker compose pull
docker compose up -d

IP=$(curl -4 -fsS https://ifconfig.me || curl -4 -fsS https://api.ipify.org || echo 'YOUR_VPS_IP')

echo
echo "MediaMTX is up. Do not flip VITE_LIVE_INGEST_CONNECTED yet."
echo
echo "Open on the VPS firewall / security group:"
echo "  1935/tcp  (OBS RTMP)"
echo "  8888/tcp  (HLS play)"
echo
echo "Test from OBS"
echo "  Server:     rtmp://${IP}:1935/live"
echo "  Stream key: test"
echo
echo "Then on a phone open:"
echo "  http://${IP}:8888/live/test/index.m3u8"
echo
echo "If that plays, add these on Render and redeploy:"
echo "  VITE_LIVE_RTMP_URL=rtmp://${IP}:1935/live"
echo "  VITE_LIVE_HLS_BASE=http://${IP}:8888/live"
echo
echo "Only after the phone test works:"
echo "  VITE_LIVE_INGEST_CONNECTED=true"
echo "  (then Render redeploy)"
