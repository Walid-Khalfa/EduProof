import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n-override'
import './index.css'
import App from './App.tsx'
import { Web3Provider } from './providers/Web3Provider'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Web3Provider>
  </StrictMode>,
)
