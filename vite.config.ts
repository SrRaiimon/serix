import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Genera sw.js con la lista de archivos del build para que la app funcione sin conexión. */
function serviceWorker(): Plugin {
  return {
    name: 'gym-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      // El lector de códigos de barras (.wasm, ~1 MB), el de etiquetas (ocr/, ~6 MB) y los productos de
      // supermercado (aesan.json, ~2 MB) no se precargan: se guardan la primera vez que se usan, así no
      // los descarga quien no los usa (ver sw-template.js).
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.wasm') && !f.startsWith('ocr/'))
      const statics = ['./', 'index.html', 'manifest.webmanifest', 'exercises_index.json', 'exercises_es.json', 'exercise_ids_v1.json', 'foods.json', 'licenses.txt',
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

/**
 * Lector de etiquetas (Comidas): el worker y el motor de Tesseract.js y los datos de español se
 * sirven desde la propia web en ocr/, en vez de desde un CDN. Solo se descargan al usarlo.
 */
function ocrAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const tesseract = dirname(require.resolve('tesseract.js/package.json'))
  const core = dirname(createRequire(join(tesseract, 'package.json')).resolve('tesseract.js-core/package.json'))
  const files: Record<string, string> = {
    'ocr/worker.min.js': join(tesseract, 'dist/worker.min.js'),
    // Tres versiones del motor según lo que admita el móvil (el worker elige una sola).
    'ocr/core/tesseract-core-lstm.wasm.js': join(core, 'tesseract-core-lstm.wasm.js'),
    'ocr/core/tesseract-core-simd-lstm.wasm.js': join(core, 'tesseract-core-simd-lstm.wasm.js'),
    'ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js': join(core, 'tesseract-core-relaxedsimd-lstm.wasm.js'),
    'ocr/lang/spa.traineddata.gz': join(dirname(require.resolve('@tesseract.js-data/spa/package.json')), '4.0.0_best_int/spa.traineddata.gz'),
  }
  return {
    name: 'gym-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0].replace(/^\//, '')
        const file = path && files[path]
        if (!file) return next()
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source: readFileSync(file) })
    },
  }
}

/**
 * Política de seguridad de contenidos (solo en producción: el servidor de desarrollo necesita
 * scripts en línea). Todo se carga de la propia web: si alguien lograra inyectar código de otro
 * sitio, el navegador no lo ejecutaría ni le dejaría enviar datos fuera (salvo a Open Food Facts,
 * que solo recibe códigos de barras).
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    // 'wasm-unsafe-eval' solo permite compilar WebAssembly propio (el lector de códigos de barras), no eval.
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Open Food Facts: solo para consultar un producto por su código de barras (Comidas).
    "connect-src 'self' https://world.openfoodfacts.org",
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
  // Versión visible en Perfil y en Legal: la de package.json (se sube el último número en cada publicación).
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
  plugins: [react(), ocrAssets(), serviceWorker(), contentSecurityPolicy()],
})
