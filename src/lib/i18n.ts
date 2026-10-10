// Idiomas de la app. Los textos se escriben en el propio código con su traducción al lado:
// t('Terminar', 'Finish'). Así cada texto se lee en su contexto y no hay claves que mantener.
// Al cambiar de idioma la app se vuelve a montar entera (App usa el idioma como key).
//
// Francés y portugués: diccionarios aparte (src/i18n/fr.json y pt.json, del español a cada idioma),
// que se descargan solo si se elige ese idioma. Los textos con huecos (t(`Día ${n}`, …)) se guardan
// como «Día {0}» y se reconocen al vuelo. Lo que no esté traducido sale en inglés. Ver
// scripts/i18n/extract.mjs, que saca todos los textos, y tests/i18n-dict.test.ts, que comprueba que
// están todos traducidos.

export type Lang = 'es' | 'en' | 'fr' | 'pt'
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'es', name: 'Español' }, { id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'pt', name: 'Português' },
]

/** Idioma del sistema: el preferido del móvil si la app lo tiene; si no, inglés. */
export function systemLang(): Lang {
  const preferred = (typeof navigator === 'undefined' ? 'es' : (navigator.languages?.[0] ?? navigator.language ?? 'es')).toLowerCase()
  return (['es', 'fr', 'pt'] as const).find((l) => preferred.startsWith(l)) ?? 'en'
}

let current: Lang = 'es'

export const lang = () => current

/** Idioma de los datos que solo existen en español e inglés (nombres e instrucciones del catálogo, alimentos…). */
export const dataLang = (): 'es' | 'en' => (current === 'es' ? 'es' : 'en')

// MARK: Diccionarios

type Dict = Record<string, string>
interface Loaded { exact: Map<string, string>; templates: { re: RegExp; to: string }[]; cache: Map<string, string> }
const dicts: Partial<Record<Lang, Loaded>> = {}
const loading: Partial<Record<Lang, Promise<void>>> = {}
const listeners = new Set<() => void>()
let dictVersion = 0

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Prepara un diccionario: los textos fijos para buscar al momento y las plantillas como expresiones. */
export function compileDict(dict: Dict): Loaded {
  const exact = new Map<string, string>()
  const templates: { re: RegExp; to: string; literal: number }[] = []
  for (const [es, to] of Object.entries(dict)) {
    if (!/\{\d+\}/.test(es)) { exact.set(es, to); continue }
    const parts = es.split(/\{(\d+)\}/)
    const order: number[] = []
    let source = '^'
    parts.forEach((p, i) => {
      if (i % 2) { order.push(Number(p)); source += '([\\s\\S]*?)' } else source += escape(p)
    })
    // Primero las plantillas con más texto fijo: «Día {0} · {1}» antes que «Día {0}».
    const literal = parts.filter((_, i) => i % 2 === 0).join('').length
    if (literal < 3) continue
    const re = new RegExp(`${source}$`)
    // Si los huecos no van en orden en el español, se reordenan al aplicar.
    templates.push({ re, to: order.every((n, i) => n === i) ? to : to.replace(/\{(\d+)\}/g, (_, n) => `{${order.indexOf(Number(n))}}`), literal })
  }
  templates.sort((a, b) => b.literal - a.literal)
  return { exact, templates, cache: new Map() }
}

function translate(d: Loaded, es: string): string | undefined {
  const hit = d.exact.get(es) ?? d.cache.get(es)
  if (hit !== undefined) return hit
  for (const tpl of d.templates) {
    const m = tpl.re.exec(es)
    if (!m) continue
    const out = tpl.to.replace(/\{(\d+)\}/g, (_, n) => m[Number(n) + 1] ?? '')
    if (d.cache.size > 2000) d.cache.clear()
    d.cache.set(es, out)
    return out
  }
  return undefined
}

/** Para los tests (y para cargar uno sin esperar a la red). */
export function installDict(l: Lang, dict: Dict) {
  dicts[l] = compileDict(dict)
  dictVersion++
  listeners.forEach((f) => f())
}

function loadDict(l: Lang): Promise<void> {
  if (l === 'es' || l === 'en' || dicts[l]) return Promise.resolve()
  loading[l] ??= (l === 'fr' ? import('../i18n/fr.json') : import('../i18n/pt.json'))
    .then((m) => installDict(l, (m as { default: Dict }).default))
    .catch(() => { delete loading[l] })
  return loading[l]!
}

/** Espera a que esté el diccionario del idioma actual (antes de pintar la app). */
export const dictReady = () => loadDict(current)

/** Clave que cambia con el idioma y al llegar su diccionario (para volver a pintar). */
export const langKey = () => `${current}:${dicts[current] ? 1 : 0}:${dictVersion}`
export function onDict(f: () => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}

export function setLang(l: Lang) {
  current = l
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = l
  void loadDict(l)
}

/** El texto en el idioma actual. */
export function t(es: string, en: string): string {
  if (current === 'es') return es
  if (current === 'en') return en
  const d = dicts[current]
  return (d && translate(d, es)) ?? en
}

/** Locale para fechas y números ('en-GB': día antes que mes y semanas de lunes, como en la app). */
export const locale = () => ({ es: 'es-ES', en: 'en-GB', fr: 'fr-FR', pt: 'pt-PT' })[current]

/** Plural sencillo: n + forma singular o plural en el idioma actual. */
export const plural = (n: number, es: [string, string], en: [string, string]) =>
  `${n} ${t(es[n === 1 ? 0 : 1], en[n === 1 ? 0 : 1])}`
