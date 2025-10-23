import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n-override'
import './index.css'
import App from './App.tsx'
import { withErrorOverlay } from './components/with-error-overlay'
import { Web3Provider } from './providers/Web3Provider'

const AppWithErrorOverlay = withErrorOverlay(App)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <AppWithErrorOverlay />
    </Web3Provider>
  </StrictMode>,
)
