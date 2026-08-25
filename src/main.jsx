import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { healLocalState, verifyLocalUploads } from './lib/selfHeal'

try { healLocalState() } catch {}
verifyLocalUploads().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
