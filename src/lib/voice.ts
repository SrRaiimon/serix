import { locale } from './i18n'
import { getData } from './store'

// Avisos por voz con la voz del propio móvil (Web Speech API: sin conexión ni servicios externos).

export const voiceSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

// Chrome carga la lista de voces en segundo plano y la primera vez devuelve una vacía: el primer aviso salía
// con la voz por defecto (en ordenador, una «Google …» que se genera en un servidor). Pedirla ya la carga.
if (voiceSupported()) speechSynthesis.getVoices()

/** Dice el texto si los avisos por voz están activados (corta lo que estuviera diciendo). */
export function speak(text: string, force = false) {
  if (!voiceSupported() || (!force && !getData().settings.voice)) return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = locale()
    // Una voz del propio móvil si la hay: algunas (las «Google …» de Chrome) se generan en un servidor y el
    // texto saldría del móvil.
    const lang = u.lang.slice(0, 2).toLowerCase()
    const local = speechSynthesis.getVoices().find((v) => v.localService && v.lang.toLowerCase().startsWith(lang))
    if (local) u.voice = local
    u.rate = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* sin voz */
  }
}
