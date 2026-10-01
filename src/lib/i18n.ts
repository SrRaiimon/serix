// Idiomas de la app. Los textos se escriben en el propio código con su traducción al lado:
// t('Terminar', 'Finish'). Así cada texto se lee en su contexto y no hay claves que mantener.
// Al cambiar de idioma la app se vuelve a montar entera (App usa el idioma como key).

export type Lang = 'es' | 'en'

/** Idioma del sistema: español si el idioma preferido del móvil es el español; si no, inglés. */
export function systemLang(): Lang {
  const preferred = typeof navigator === 'undefined' ? 'es' : (navigator.languages?.[0] ?? navigator.language ?? 'es')
  return preferred.toLowerCase().startsWith('es') ? 'es' : 'en'
}

let current: Lang = 'es'

export const lang = () => current

export function setLang(l: Lang) {
  current = l
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = l
}

/** El texto en el idioma actual. */
export const t = (es: string, en: string) => (current === 'en' ? en : es)

/** Locale para fechas y números ('en-GB': día antes que mes y semanas de lunes, como en la app). */
export const locale = () => (current === 'en' ? 'en-GB' : 'es-ES')

/** Plural sencillo: n + forma singular o plural en el idioma actual. */
export const plural = (n: number, es: [string, string], en: [string, string]) =>
  `${n} ${(current === 'en' ? en : es)[n === 1 ? 0 : 1]}`
