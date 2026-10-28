// Prueba de extremo a extremo antes de publicar: abre la app compilada (dist) en Chrome sin ventana,
// hace el cuestionario, un entreno con una serie y apunta una comida, y comprueba que todo queda
// guardado y que no hay errores en la consola. Sin dependencias: Chrome se maneja con su protocolo de
// depuración (CDP) por WebSocket, que Node ya trae.
//
// Uso: npm run build && npm run e2e   (CHROME_PATH para indicar otro Chrome)
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { preview } from 'vite'

const CHROME = process.env.CHROME_PATH
  ?? ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p))
if (!CHROME) throw new Error('No se encuentra Chrome: indica CHROME_PATH')

const PORT = 4180
const DEBUG = 9333
const server = await preview({ configFile: 'vite.config.ts', logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
const profile = mkdtempSync(join(tmpdir(), 'serix-e2e-'))
// En los servidores Linux de GitHub, Chrome no puede crear su sandbox (falta permiso para los espacios
// de nombres de usuario): ahí se arranca sin ella. Solo abre la app local, nada de fuera.
const linux = process.platform === 'linux'
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  ...(linux ? ['--no-sandbox', '--disable-dev-shm-usage'] : []), '--window-size=390,844', '--lang=es-ES', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
let chromeLog = ''
chrome.stderr.on('data', (b) => { chromeLog = (chromeLog + b).slice(-2000) })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let ws
const errors = []
let step = 'arrancar'
/** Texto de la pantalla, para entender un fallo. */
let pageText = async () => ''

async function main() {
  // Conectar con la pestaña.
  let target
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find((x) => x.type === 'page') } catch { await wait(200) }
  }
  if (!target) throw new Error(`Chrome no ha arrancado (${CHROME})\n${chromeLog}`)
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const run = async (fn, ...args) => {
    const r = await send('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  pageText = () => run(() => document.body.innerText.slice(0, 600))
  /** Espera a que haya un botón o enlace con ese texto y lo pulsa. */
  const click = async (text, timeout = 8000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const ok = await run((src) => {
        const re = new RegExp(src)
        const el = [...document.querySelectorAll('button, a')].find((b) => re.test(b.textContent.trim()) && !b.disabled)
        el?.click()
        return !!el
      }, text)
      if (ok) { await wait(350); return }
      await wait(150)
    }
    throw new Error(`No aparece el botón «${text}»`)
  }
  const data = () => run(() => new Promise((res) => {
    const q = indexedDB.open('gymapp', 1)
    q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('data'); g.onsuccess = () => res(g.result) }
  }))
  const check = (ok, message) => { if (!ok) throw new Error(message) }
  // Revisión móvil de las nuevas hojas y avisos, en ambos temas; las capturas son opcionales.
  const checkDiscomfortLayout = async (name) => {
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true })
    for (const theme of ['light', 'dark']) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] })
      await wait(150)
      check(await run(() => document.documentElement.scrollWidth <= innerWidth), `${name}: desbordamiento horizontal a 375 px`)
      if (process.env.SERIX_E2E_SHOTS) {
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        writeFileSync(join(process.env.SERIX_E2E_SHOTS, `${name}-${theme}.png`), Buffer.from(shot.data, 'base64'))
      }
    }
    await send('Emulation.setEmulatedMedia', { features: [] })
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  }
  // history.length cuenta también Adelante: lo que importa para Atrás es volver al índice original.
  const historyIndex = async () => (await send('Page.getNavigationHistory')).currentIndex
  // Dar tiempo a CDP a responder antes de que Atrás abandone el documento.
  const browserBack = async () => { await run(() => { setTimeout(() => history.back(), 50) }); await wait(550) }
  const freshOnboarding = async () => {
    // Cada salida se prueba desde cero, con datos aislados en el perfil temporal de Chrome.
    await send('Storage.clearDataForOrigin', { origin: `http://127.0.0.1:${PORT}`, storageTypes: 'indexeddb,local_storage' })
    await run(() => sessionStorage.clear())
    await send('Page.reload')
    await click('^Español$', 15000)
  }

  // Apagar también el servidor: así ni el service worker ni la caché HTTP pueden ocultar una falta de caché.
  const setOffline = async (offline) => {
    if (offline) await new Promise((resolve, reject) => server.httpServer.close((err) => err ? reject(err) : resolve()))
    else await new Promise((resolve) => server.httpServer.listen(PORT, '127.0.0.1', resolve))
    await send('Network.enable')
    await send('Network.setCacheDisabled', { cacheDisabled: true })
    await send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  }
  const chooseLanguage = async (language) => {
    await run(() => { location.hash = '#/profile/general' })
    await wait(700)
    await run((value) => {
      const select = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === value))
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }, language)
    await wait(700)
  }

  const checkOfflineTabs = async (language) => {
    const titles = language === 'es' ? ['Rutinas', 'Comidas', 'Progreso', 'Perfil'] : ['Routines', 'Food', 'Progress', 'Profile']
    for (const [i, route] of ['routines', 'food', 'progress', 'profile'].entries()) {
      await run((hash) => { location.hash = hash }, `#/${route}`)
      await send('Page.reload')
      await wait(1000)
      check(await run((title) => !document.querySelector('.rescue') && [...document.querySelectorAll('h1')].some((h) => h.textContent.trim() === title), titles[i]), `${titles[i]} no abre offline (${language})`)
    }
    await run(() => { location.hash = '#/' })
    await wait(700)
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })

  step = 'historial del cuestionario: Atrás y Saltar'
  // El idioma sale del sistema: en los servidores de GitHub es inglés. Se elige español, como haría alguien.
  await click('^Español$', 15000)
  step = 'primera visita sin conexión'
  await run(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
  await setOffline(true)
  await send('Page.reload')
  await wait(1000)
  check(await run(() => !!document.querySelector('.onb') && document.body.innerText.includes('Empezar')), 'No arranca offline en español tras la primera visita')
  await click('^English$')
  await send('Page.reload')
  await wait(1000)
  check(await run(() => document.documentElement.lang === 'en' && document.body.innerText.includes('Start')), 'No arranca offline en inglés tras la primera visita')
  await click('^Español$')
  await setOffline(false)
  step = 'historial del cuestionario: Atrás y Saltar'
  const initialIndex = await historyIndex()
  await click('^Empezar$')
  await click('^Continuar$')
  await click('^Continuar$')
  await browserBack()
  check(await run(() => history.state?.serixOnb === 2 && sessionStorage.getItem('onb-step') === '2'), 'Atrás no volvió del paso 3 al 2')
  await click('^Saltar$')
  check(await historyIndex() === initialIndex, 'Saltar dejó pasos del cuestionario detrás de Inicio')
  check(await run(() => !!document.querySelector('.tabbar') && !history.state?.serixOnb), 'Saltar no terminó el cuestionario')
  await browserBack()
  check(await historyIndex() === initialIndex - 1, 'Atrás desde Inicio consumió un paso muerto')
  const previous = await send('Page.getNavigationHistory')
  check(!previous.entries[previous.currentIndex].url.startsWith(`http://127.0.0.1:${PORT}`), 'Atrás sigue dentro del cuestionario')
  await run(() => { setTimeout(() => history.forward(), 50) })
  await wait(800)

  for (const exit of ['Cancelar', 'Atrás', 'Solo quiero entrenar']) {
    step = `historial al terminar: ${exit}`
    await freshOnboarding()
    const startIndex = await historyIndex()
    await click('^Empezar$')
    for (let i = 0; i < 4; i++) await click('^Continuar$')
    await click('^Crear mi programa$')
    await click('^Guardar programa$')
    if (exit === 'Solo quiero entrenar') await click('^Solo quiero entrenar$')
    else {
      await click('^Sí, calcular mis calorías$')
      check(await run(() => !!history.state?.serixDialog), 'GoalsSheet no añadió su entrada')
      if (exit === 'Cancelar') await click('^Cancelar$')
      else await browserBack()
    }
    await wait(500)
    check(await historyIndex() === startIndex, `${exit}: quedaron pasos muertos o hubo un doble retroceso`)
    check(await run(() => !!document.querySelector('.tabbar') && !document.querySelector('[role="dialog"]') && history.state === null), `${exit}: no terminó en Inicio sin hojas`)
  }

  step = 'historial de hojas: sustitución y Atrás'
  const homeHash = await run(() => location.hash)
  const homeIndex = await historyIndex()
  await run(() => { location.hash = '#/routines' })
  await click('^Nueva$')
  const menuIndex = await historyIndex()
  await click('^Nueva rutina vacía')
  check(await run(() => !!document.querySelector('[aria-label="Editar rutina"]')), 'No se abrió el editor')
  check(await historyIndex() === menuIndex, 'El editor añadió una entrada en vez de sustituir la ActionSheet')
  await browserBack()
  check(await run(() => !document.querySelector('[role="dialog"]') && location.hash === '#/routines'), 'Atrás no cerró solo el editor')
  check(await historyIndex() === menuIndex - 1, 'Cerrar el editor dejó una entrada muerta')
  await browserBack()
  check(await historyIndex() === homeIndex && await run(() => location.hash) === homeHash, 'Atrás después del editor no volvió a Inicio')
  console.log('e2e historial: Atrás y Saltar, terminar con y sin GoalsSheet, y sustituir y cerrar hojas correctos')

  step = 'pantalla secundaria guardada al visitarla'
  check(await run(async () => {
    const keys = (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url)))).flat()
    return !keys.some((url) => /assets\/Photos-/.test(url))
  }), 'Fotos sigue en la precarga')
  await run(() => { location.hash = '#/profile/photos' })
  await wait(1000)
  check(await run(() => document.body.innerText.includes('Fotos de progreso')), 'No abrió Fotos online')
  await setOffline(true)
  await send('Page.reload')
  await wait(1000)
  check(await run(() => document.body.innerText.includes('Fotos de progreso') && !document.querySelector('.rescue')), 'La pantalla secundaria visitada no funciona offline')
  await run(() => { location.hash = '#/' })
  await send('Page.reload')
  await wait(1000)
  check(await run(() => !!document.querySelector('.tabbar') && document.documentElement.lang === 'es'), 'Inicio no arranca offline en español')

  await checkOfflineTabs('es')

  step = 'entreno'
  await click('^Empezar$')
  await wait(800)
  await run(() => {
    const [kg, reps] = document.querySelectorAll('.set-row.current input.set-input')
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
    set(kg, '40'); set(reps, '8')
  })
  await wait(300)
  await run(() => document.querySelector('.set-row.current button.set-check').click())
  await wait(500)
  // Atrás respeta las capas: primero la hoja, luego Foco y después minimiza sin perder las series.
  const workoutIndex = await historyIndex()
  await click('^Terminar$')
  await browserBack()
  check(await run(() => !!document.querySelector('.fullscreen') && !document.querySelector('.dialog-backdrop')), 'Atrás no cerró solo la hoja del entreno')
  await click('Foco')
  await browserBack()
  check(await run(() => !document.querySelector('.focus-mode') && !!document.querySelector('.fullscreen')), 'Atrás no cerró solo Foco')
  check(await historyIndex() === workoutIndex, 'Foco dejó una entrada muerta')
  await browserBack()
  check(await run(() => !document.querySelector('.fullscreen')), 'Atrás no minimizó el entreno')
  check(await historyIndex() === workoutIndex - 1, 'Minimizar dejó una entrada muerta')
  const activeBefore = (await data()).sessions.find((s) => !s.end)
  check(activeBefore?.exercises[0].sets.some((s) => s.done && s.weight === 40 && s.reps === 8), 'Minimizar perdió la serie')
  await run(() => document.querySelector('.active-bar').click())
  await wait(600)
  check(await run(() => !!document.querySelector('.fullscreen')), 'No se pudo reabrir el entreno')
  check(await historyIndex() === workoutIndex, 'Reabrir no creó una sola entrada')
  console.log('e2e entreno: Atrás cierra hoja y Foco, minimiza y conserva la serie al reabrir')
  // La segunda serie, con un solo toque y sin escribir nada: se apuntan las repeticiones del objetivo.
  await run(() => document.querySelector('.set-row.current button.set-check')?.click())
  await wait(500)
  // Registrar una zona y un lado no añade pasos al marcado normal de series.
  await run(() => document.querySelector('button[aria-label="Opciones del ejercicio"]').click())
  await click('^Me ha molestado$')
  await checkDiscomfortLayout('molestia-zonas')
  await click('^Izquierdo$')
  await click('^Hombro$')
  check((await data()).sessions.find((s) => !s.end)?.exercises[0].discomfort?.side === 'left', 'No se guardó la molestia con su lado')
  await click('^Terminar$')
  await click('^Terminar y guardar$')
  await click('^Listo$')
  check(await historyIndex() === workoutIndex - 1, 'Terminar dejó entradas muertas del entreno o su confirmación')
  let d = await data()
  const done = d.sessions.filter((s) => s.end)
  check(done.length === 1, `Debería haber 1 entrenamiento terminado y hay ${done.length}`)
  check(done[0].exercises[0].sets.some((x) => x.done && x.weight === 40 && x.reps === 8), 'La serie de 40 × 8 no se ha guardado')
  check(done[0].exercises[0].sets.filter((x) => x.done && x.reps > 0).length >= 2, 'Marcar una serie sin escribir las repeticiones no la ha apuntado')

  step = 'molestia en el siguiente entreno'
  await run(() => { location.hash = '#/progress' })
  await wait(700)
  check(await run(() => !!document.querySelector('.discomfort-recent')), 'Falta Molestias recientes en Progreso')
  await checkDiscomfortLayout('molestias-progreso')
  await run((id) => { location.hash = '#/progress/session/' + id }, done[0].id)
  await click('^Repetir este entrenamiento$')
  check(await run(() => document.body.innerText.includes('La última vez te molestó el hombro')), 'No recuerda la molestia al repetir')
  await run(() => document.querySelector('.discomfort-warning').scrollIntoView({ block: 'center' }))
  await checkDiscomfortLayout('molestia-aviso')
  const weightsBefore = (await data()).sessions.find((s) => !s.end).exercises[0].sets.filter((s) => !s.done).map((s) => s.weight)
  await click('^Bajar un 10 %$')
  const weightsAfter = (await data()).sessions.find((s) => !s.end).exercises[0].sets.filter((s) => !s.done).map((s) => s.weight)
  check(JSON.stringify(weightsAfter) === JSON.stringify(weightsBefore.map((w) => Math.max(0, Math.floor(w * 0.9 / 2.5) * 2.5))), 'La propuesta no bajó al escalón de peso esperado')
  await click('^Cambiar de ejercicio$')
  check(await run(() => !!document.querySelector('input[placeholder="Buscar otro ejercicio"]')), 'No abrió las alternativas existentes')
  await browserBack()
  await click('^Ya no me molesta$')
  check(await run(() => !document.querySelector('.discomfort-warning')), 'Sigue avisando después de resolver la molestia')
  await send('Page.reload')
  await wait(900)
  await run(() => document.querySelector('.active-bar').click())
  await wait(500)
  check(await run(() => !document.querySelector('.discomfort-warning')), 'El aviso resuelto reaparece al recargar')
  await click('^Descartar entrenamiento$')
  await click('^Descartar$')
  console.log('e2e molestias: zona y lado, Progreso, siguiente entreno, bajar carga, alternativas y resolución persistente correctos')

  step = 'comida'
  await run(() => { location.hash = '#/food' })
  await click('^Añadir$')
  await wait(1000)
  await run(() => document.querySelector('.quick-row .icon-btn').click())
  await wait(600)
  d = await data()
  check(d.nutrition.entries.length === 1, `Debería haber 1 alimento apuntado y hay ${d.nutrition.entries.length}`)

  step = 'validación de alimento propio'
  await click('^Crear alimento$')
  await run(() => document.querySelector('input[placeholder*="Mi batido"]').focus())
  await send('Input.insertText', { text: 'x'.repeat(360) })
  check(await run(() => document.querySelector('input[placeholder*="Mi batido"]').value.length === 80), 'El nombre admite más de 80 caracteres')
  await run(() => {
    const el = document.querySelector('input[placeholder*="Mi batido"]')
    el.select()
  })
  await send('Input.insertText', { text: '  Mi batido  ' })
  await run(() => document.querySelector('input[aria-label="Calorías"]').focus())
  check(await run(() => document.querySelector('input[placeholder*="Mi batido"]').value === 'Mi batido'), 'El nombre no se recorta al salir')
  await send('Input.insertText', { text: '999999' })
  await wait(150)
  check(await run(() => [...document.querySelectorAll('[role="alert"]')].some((e) => e.textContent.includes('entre 0 y 1000'))), 'Falta el motivo de las calorías imposibles')
  check(await run(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Guardar')?.disabled), 'Se pueden guardar calorías imposibles')
  await run(() => document.querySelector('input[aria-label="Calorías"]').select())
  await send('Input.insertText', { text: '100' })
  await wait(150)
  check(await run(() => ![...document.querySelectorAll('[role="alert"]')].some((e) => e.textContent.includes('entre 0 y 1000'))), 'El aviso no desaparece al corregir las calorías')
  await browserBack()
  console.log('e2e alimento propio: límite de 80 caracteres, trim al salir y aviso de calorías comprobados')

  step = 'inicio y pantalla visitada offline en inglés'
  await chooseLanguage('en')
  await run(() => { location.hash = '#/' })
  await send('Page.reload')
  await wait(1000)
  check(await run(() => document.documentElement.lang === 'en' && /Home/.test(document.querySelector('.tabbar')?.textContent ?? '')), 'Inicio no arranca offline en inglés')
  await run(() => { location.hash = '#/profile/photos' })
  await send('Page.reload')
  await wait(1000)
  check(await run(() => document.body.innerText.includes('Progress photos')), 'Fotos no funciona offline en inglés')
  await checkOfflineTabs('en')
  await chooseLanguage('es')
  await setOffline(false)
  console.log('e2e offline: primera visita e Inicio en español e inglés, entreno y comida guardados, y Fotos visitada; servidor apagado y caché HTTP desactivada')

  step = 'pantallas'
  for (const hash of ['#/routines', '#/progress', '#/profile', '#/profile/general', '#/profile/training', '#/profile/alerts', '#/profile/data', '#/exercises', '#/timer', '#/progress/report']) {
    await run((h) => { location.hash = h }, hash)
    await wait(700)
    const blank = await run(() => !!document.querySelector('.rescue') || document.querySelector('main')?.textContent.trim() === '')
    check(!blank, `La pantalla ${hash} ha fallado`)
  }
  step = 'inglés y tema claro'
  // Mismo recorrido en inglés y con tema claro, cambiándolos desde Perfil → General como haría alguien.
  await run(() => { location.hash = '#/profile/general' })
  await wait(700)
  await run(() => {
    const pick = (value) => {
      const select = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.value === value))
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
    pick('light')
    pick('en')
  })
  await wait(1200)
  const en = await run(() => ({ lang: document.documentElement.lang, theme: document.documentElement.dataset.theme, home: document.querySelector('.tabbar')?.textContent ?? '' }))
  check(en.lang === 'en' && en.theme === 'light' && /Home/.test(en.home), `No cambió a inglés y tema claro: ${JSON.stringify(en)}`)
  for (const hash of ['#/', '#/routines', '#/food', '#/progress', '#/profile', '#/exercises', '#/timer', '#/progress/report', '#/profile/measurements']) {
    await run((h) => { location.hash = h }, hash)
    await wait(700)
    const blank = await run(() => !!document.querySelector('.rescue') || document.querySelector('main')?.textContent.trim() === '')
    check(!blank, `La pantalla ${hash} ha fallado en inglés`)
    // Ningún texto en español en la barra de abajo ni en el título (un t() olvidado se vería aquí).
    const spanish = await run(() => /Inicio|Rutinas|Comidas|Progreso|Perfil/.test(document.querySelector('.tabbar')?.textContent ?? ''))
    check(!spanish, `Quedan textos en español en ${hash}`)
  }

  step = 'francés'
  // Francés: el diccionario se descarga aparte; la barra de abajo y una pantalla entera, sin español.
  await run(() => { location.hash = '#/profile/general' })
  await wait(700)
  await run(() => {
    const select = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.value === 'fr'))
    select.value = 'fr'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await wait(1500)
  const fr = await run(() => ({ lang: document.documentElement.lang, bar: document.querySelector('.tabbar')?.textContent ?? '' }))
  check(fr.lang === 'fr' && /Accueil/.test(fr.bar) && /Repas/.test(fr.bar), `No cambió a francés: ${JSON.stringify(fr)}`)
  for (const hash of ['#/', '#/wod', '#/progress', '#/food']) {
    await run((h) => { location.hash = h }, hash)
    await wait(700)
    const blank = await run(() => !!document.querySelector('.rescue') || document.querySelector('main')?.textContent.trim() === '')
    check(!blank, `La pantalla ${hash} ha fallado en francés`)
  }

  check(!errors.length, `Errores en la consola:\n${errors.join('\n')}`)
  console.log('e2e: cuestionario, entreno, comida y pantallas principales correctos, en español, en inglés con tema claro y en francés')
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.error(`e2e falló en «${step}»: ${e.message}`)
  try { console.error(`Pantalla:\n${await pageText()}`) } catch { /* sin página */ }
} finally {
  ws?.close()
  chrome.kill()
  await server.close()
  await wait(300)
  rmSync(profile, { recursive: true, force: true })
}
process.exit(failed ? 1 : 0)
