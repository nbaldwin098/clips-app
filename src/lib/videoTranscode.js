/**
 * Optional client-side compress via ffmpeg.wasm (CDN dynamic import).
 * Default upload path stays original-file — do not force WebM on iOS.
 */
import { clientTranscodeEnabled } from './featureFlags'
import { prepareVideoForUpload } from './videoStorage'

const FFMPEG_CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm'
const UTIL_CDN = 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm'

/**
 * When client transcode is enabled and the file is a large MP4/MOV,
 * attempt a lighter H.264 MP4. On any failure, fall back to original bytes.
 */
export async function prepareVideoForUploadMaybeTranscode(file, opts = {}) {
  const base = await prepareVideoForUpload(file)
  const enabled = opts.force === true || clientTranscodeEnabled()
  if (!enabled || !file || typeof window === 'undefined') return base
  if (!String(file.type || '').startsWith('video/')) return base
  // Skip tiny files and already-small clips
  if ((file.size || 0) < 8 * 1024 * 1024) return base
  // Never force WebM — phones need MP4
  try {
    const [{ FFmpeg }, { fetchFile }] = await Promise.all([
      import(/* @vite-ignore */ FFMPEG_CDN),
      import(/* @vite-ignore */ UTIL_CDN),
    ])
    const ffmpeg = new FFmpeg()
    if (!ffmpeg.loaded) {
      await ffmpeg.load({
        coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      })
    }
    const input = 'in.mp4'
    const output = 'out.mp4'
    await ffmpeg.writeFile(input, await fetchFile(file))
    await ffmpeg.exec([
      '-i', input,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      output,
    ])
    const data = await ffmpeg.readFile(output)
    const blob = new Blob([data.buffer], { type: 'video/mp4' })
    if (!blob.size || blob.size >= file.size * 0.98) return base
    const next = new File([blob], (file.name || 'video').replace(/\.\w+$/, '') + '.mp4', {
      type: 'video/mp4',
      lastModified: Date.now(),
    })
    return {
      ...base,
      file: next,
      storedBytes: next.size,
      transcoded: true,
    }
  } catch (err) {
    console.warn('[calabi] client transcode skipped:', err?.message || err)
    return base
  }
}
