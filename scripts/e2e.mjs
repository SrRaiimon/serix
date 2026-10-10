// Prueba de extremo a extremo antes de publicar: abre la app compilada (dist) en Chrome sin ventana,
// hace el cuestionario, un entreno con una serie y apunta una comida, y comprueba que todo queda
// guardado y que no hay errores en la consola. Sin dependencias: Chrome se maneja con su protocolo de
// depuración (CDP) por WebSocket, que Node ya trae.
//
// Uso: npm run build && npm run e2e   (CHROME_PATH para indicar otro Chrome)
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
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

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })

  step = 'cuestionario'
  // El idioma sale del sistema: en los servidores de GitHub es inglés. Se elige español, como haría alguien.
  await click('^Español$', 15000)
  await click('^Empezar$')
  for (let i = 0; i < 4; i++) await click('^Continuar$')
  await click('^Crear mi programa$')
  await click('^Guardar programa$')
  await click('^Solo quiero entrenar$')

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
  await click('^Terminar$')
  await click('^Terminar y guardar$')
  await click('^Listo$')
  let d = await data()
  const done = d.sessions.filter((s) => s.end)
  check(done.length === 1, `Debería haber 1 entrenamiento terminado y hay ${done.length}`)
  check(done[0].exercises[0].sets.some((x) => x.done && x.weight === 40 && x.reps === 8), 'La serie de 40 × 8 no se ha guardado')

  step = 'comida'
  await run(() => { location.hash = '#/food' })
  await click('^Añadir$')
  await wait(1000)
  await run(() => document.querySelector('.quick-row .icon-btn').click())
  await wait(600)
  d = await data()
  check(d.nutrition.entries.length === 1, `Debería haber 1 alimento apuntado y hay ${d.nutrition.entries.length}`)

  step = 'pantallas'
  for (const hash of ['#/routines', '#/progress', '#/profile', '#/exercises', '#/timer', '#/progress/report']) {
    await run((h) => { location.hash = h }, hash)
    await wait(700)
    const blank = await run(() => !!document.querySelector('.rescue') || document.querySelector('main')?.textContent.trim() === '')
    check(!blank, `La pantalla ${hash} ha fallado`)
  }
  step = 'inglés y tema claro'
  // Mismo recorrido en inglés y con tema claro, cambiándolos desde Perfil como haría alguien.
  await run(() => { location.hash = '#/profile' })
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
  await run(() => { location.hash = '#/profile' })
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
