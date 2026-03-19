// ── FIX #1: CSS import must come BEFORE createRoot().render()
// Previously it was after the render call, which is semantically wrong
// and can cause a flash of unstyled content on slow connections.
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)