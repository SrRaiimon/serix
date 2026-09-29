import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerServiceWorker } from './lib/pwa'
import { flush } from './lib/store'
import './styles.css'

registerServiceWorker()

// Guarda al pasar a segundo plano: en móvil el navegador puede cerrar la app sin avisar.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
