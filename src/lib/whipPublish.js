/** Publish a local MediaStream to MediaMTX via WHIP. */
export async function publishWhip(whipUrl, stream) {
  const url = String(whipUrl || '').trim()
  if (!url) return { ok: false, error: 'No WHIP URL. Set VITE_LIVE_WHIP_URL or HLS base.' }
  if (!stream || !stream.getTracks?.().length) return { ok: false, error: 'Turn camera or screen on first.' }
  if (typeof RTCPeerConnection === 'undefined') return { ok: false, error: 'This browser cannot WebRTC publish.' }

  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream)
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await waitIce(pc)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/sdp' },
    body: pc.localDescription?.sdp || offer.sdp,
  })
  if (!res.ok) {
    pc.close()
    return { ok: false, error: `Publish failed (${res.status}). Open firewall tcp 8889.` }
  }
  const answer = await res.text()
  await pc.setRemoteDescription({ type: 'answer', sdp: answer })
  return { ok: true, pc }
}

function waitIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const t = setTimeout(resolve, 2500)
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t)
        resolve()
      }
    })
  })
}
