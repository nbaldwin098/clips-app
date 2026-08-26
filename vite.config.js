import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const vastProxy = {
  '/__vast/exo': {
    target: 'https://s.magsrv.com',
    changeOrigin: true,
    rewrite: () => '/v1/vast.php?idz=6012450',
  },
  '/__vast/exo-feed': {
    target: 'https://s.magsrv.com',
    changeOrigin: true,
    rewrite: () => '/v1/vast.php?idz=6012452',
  },
  '/__vast/exo-live': {
    target: 'https://s.magsrv.com',
    changeOrigin: true,
    rewrite: () => '/v1/vast.php?idz=6012454',
  },
}

function spaIndexFallback() {
  return {
    name: 'spa-index-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      if (!existsSync(index)) return
      copyFileSync(index, resolve('dist/404.html'))
    },
  }
}

export default defineConfig({
  appType: 'spa',
  plugins: [
    react(),
    tailwindcss(),
    spaIndexFallback(),
  ],
  server: { proxy: vastProxy },
  preview: { proxy: vastProxy },
})
