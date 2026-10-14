import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerServiceWorker } from './lib/pwa'
import { flushPending, refreshFromDisk } from './lib/store'
import './styles.css'

registerServiceWorker()

// Guarda al pasar a segundo plano (en móvil el navegador puede cerrar la app sin avisar), pero solo si hay
// cambios: una pestaña que no ha tocado nada no debe escribir su copia, quizá vieja. Al volver, relee por
// si otra pestaña guardó mientras esta estaba dormida.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flushPending()
  else void refreshFromDisk()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
