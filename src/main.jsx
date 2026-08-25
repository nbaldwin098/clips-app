import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { healLocalState } from './lib/selfHeal'
import { restoreLostUploads } from './lib/restoreUploads'

try { healLocalState() } catch {}
restoreLostUploads().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
