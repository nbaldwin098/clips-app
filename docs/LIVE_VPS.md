# Always-on Live ingest (no home PC)

Render cannot accept OBS. You need one small cloud VM running MediaMTX from this repo.

Do **not** set `VITE_LIVE_INGEST_CONNECTED=true` until a second device plays HLS.

## 1. Get a VM

Any Ubuntu 22+ box with a public IP. 1 vCPU / 1 GB RAM is enough. About $4–6/mo, or an always-free Oracle ARM VM if you already have that account.

Open inbound **1935/tcp** and **8888/tcp**.

## 2. Install MediaMTX

SSH in, then:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/nbaldwin098/clips-app.git
cd clips-app/docker/mediamtx
sudo sh bootstrap-vps.sh
```

The script prints your RTMP server URL and an HLS test URL.

## 3. Prove it

1. OBS → Settings → Stream → Service **Custom**.
2. Server = `rtmp://VPS_IP:1935/live`
3. Stream key = `test`
4. Start Streaming.
5. On a phone (not the same PC), open  
   `http://VPS_IP:8888/live/test/index.m3u8`  
   (VLC works if the browser will not play HLS).

If that fails, leave Calabi alone. Fix firewall / Docker first.

## 4. Wire Calabi (only after step 3)

Render env:

```
VITE_LIVE_RTMP_URL=rtmp://VPS_IP:1935/live
VITE_LIVE_HLS_BASE=http://VPS_IP:8888/live
VITE_LIVE_INGEST_CONNECTED=true
```

Redeploy the Node service.

Later: put TLS in front of 8888 (`https://live.calabi.us`) and change `VITE_LIVE_HLS_BASE` to that HTTPS origin. Safari on iPhone wants HTTPS.

## What stays off until then

- Window share on `/live` still works.
- Health `liveIngestFlagOn` must stay `false`.
