import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Genera sw.js con la lista de archivos del build para que la app funcione sin conexión. */
function serviceWorker(): Plugin {
  return {
    name: 'gym-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const statics = ['./', 'index.html', 'manifest.webmanifest', 'exercises_es.json', 'exercise_ids_v1.json', 'licenses.txt',
        'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']
      // Sin duplicados: cache.addAll falla si una misma URL aparece dos veces.
      const precache = [...new Set([...statics, ...files])]
      const version = Date.now().toString(36)
      const template = readFileSync('src/sw-template.js', 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

// Fecha de compilación, visible en Perfil para saber qué versión tiene cada móvil.
const buildDate = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Política de seguridad de contenidos (solo en producción: el servidor de desarrollo necesita
 * scripts en línea). Todo se carga de la propia web: si alguien lograra inyectar código de otro
 * sitio, el navegador no lo ejecutaría ni le dejaría enviar datos fuera.
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ')
  return {
    name: 'gym-csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  }
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(buildDate) },
  plugins: [react(), serviceWorker(), contentSecurityPolicy()],
})
