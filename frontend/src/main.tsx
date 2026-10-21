import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted variable fonts (bundled by Vite), so the app works offline.
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import App from './App.tsx'
import { ThemedToaster } from './components/ThemedToaster'
import { AuthProvider } from './context/AuthContext'
import { getThemeStore } from './lib/theme'

// Start following the saved / system theme right away (index.html already set it before paint).
getThemeStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ThemedToaster />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
