import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const vastProxy = {
  '/__vast/exo': {
    target: 'https://s.magsrv.com',
    changeOrigin: true,
    rewrite: () => '/v1/vast.php?idz=6010924',
  },
  '/__vast/exo-live': {
    target: 'https://s.magsrv.com',
    changeOrigin: true,
    rewrite: () => '/v1/vast.php?idz=6010934',
  },
}

export default defineConfig({
  appType: 'spa',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: { proxy: vastProxy },
  preview: { proxy: vastProxy },
})
