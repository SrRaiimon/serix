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
      // Arranque, cuestionario, las cinco pestañas y lo del gimnasio (entreno, intervalos, entreno del día y la
      // figura de cómo se hace) sin conexión; lo demás (fotos, amigos, importar, informe…) se guarda al usarlo.
      const core = new Set([
        '/screens/Onboarding.tsx', '/screens/Legal.tsx', '/screens/Routines.tsx', '/screens/Workout.tsx',
        '/screens/Session.tsx', '/screens/Food.tsx', '/screens/FoodGoals.tsx', '/screens/Profile.tsx',
        '/screens/Progress.tsx', '/screens/Intervals.tsx', '/screens/Wod.tsx',
        '/components/Coach.tsx', '/components/News.tsx', '/components/MoveFigure.tsx',
      ])
      const files = new Set<string>()
      const include = (file: string) => {
        if (files.has(file)) return
        files.add(file)
        const item = bundle[file]
        // Solo imports estáticos: seguir los dinámicos volvería a descargar todos los idiomas y lectores.
        if (item?.type === 'chunk') item.imports.forEach(include)
      }
      for (const [file, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' && (item.isEntry || [...core].some((id) => item.facadeModuleId?.replaceAll('\\', '/').endsWith(id)))) include(file)
        if (/\.(css|woff2)$/.test(file)) include(file)
      }
      // Los catálogos se conservan: nombres, instrucciones y alimentos básicos funcionan desde la primera visita.
      const statics = ['index.html', 'manifest.webmanifest', 'exercises_index.json', 'exercises_es.json', 'exercise_ids_v1.json', 'foods.json',
        'icons/serix-32.png', 'icons/serix-192.png', 'icons/serix.svg']
      const precache = [...new Set([...statics, ...files])]
      // «Usar sin conexión» también descarga las pantallas, idiomas e iconos que ahora son opcionales.
      const optional = [...new Set([
        ...Object.keys(bundle).filter((f) => !f.endsWith('.map') && !files.has(f) && !statics.includes(f)),
        ...Object.keys(OCR_FILES), 'aesan.json?v=3', 'licenses.txt',
        'icons/serix-512.png', 'icons/serix-maskable-192.png', 'icons/serix-maskable-512.png',
        'icons/serix-180.png', 'icons/serix-167.png', 'icons/serix-152.png',
      ])]
      const version = Date.now().toString(36)
      const template = readFileSync('src/sw-template.js', 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache))
          .replace('__OPTIONAL__', JSON.stringify(optional)),
      })
    },
  }
}

/**
 * Lector de etiquetas (Comidas): el worker y el motor de Tesseract.js y los datos de español se
 * sirven desde la propia web en ocr/, en vez de desde un CDN. Solo se descargan al usarlo.
 */
const require = createRequire(import.meta.url)
const tesseract = dirname(require.resolve('tesseract.js/package.json'))
const core = dirname(createRequire(join(tesseract, 'package.json')).resolve('tesseract.js-core/package.json'))
const OCR_FILES: Record<string, string> = {
  'ocr/worker.min.js': join(tesseract, 'dist/worker.min.js'),
  // Tres versiones del motor según lo que admita el móvil (el worker elige una sola).
  'ocr/core/tesseract-core-lstm.wasm.js': join(core, 'tesseract-core-lstm.wasm.js'),
  'ocr/core/tesseract-core-simd-lstm.wasm.js': join(core, 'tesseract-core-simd-lstm.wasm.js'),
  'ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js': join(core, 'tesseract-core-relaxedsimd-lstm.wasm.js'),
  'ocr/lang/spa.traineddata.gz': join(dirname(require.resolve('@tesseract.js-data/spa/package.json')), '4.0.0_best_int/spa.traineddata.gz'),
}

function ocrAssets(): Plugin {
  const files = OCR_FILES
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

/**
 * El CSS de la app (unos 14 KB comprimido) va dentro de index.html en vez de en un archivo aparte: la
 * hoja externa bloqueaba el primer dibujo esperando otra petición (~150 ms en móvil). El archivo .css se
 * sigue generando (lo precarga el service worker). Las rutas relativas (la fuente) pasan a ser desde la raíz.
 */
function inlineCss(): Plugin {
  return {
    name: 'gym-inline-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        return html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, file: string) => {
          const asset = ctx.bundle?.[file]
          if (!asset || asset.type !== 'asset') return tag
          const css = String(asset.source).replace(/url\(\.\//g, 'url(./assets/')
          return `<style>${css}</style>`
        })
      },
    },
  }
}

export default defineConfig({
  base: './',
  // Versión visible en Perfil y en Legal: la de package.json (se sube el último número en cada publicación).
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
  plugins: [react(), ocrAssets(), serviceWorker(), contentSecurityPolicy(), inlineCss()],
})
