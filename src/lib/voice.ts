import { lang } from './i18n'
import { getData } from './store'

// Avisos por voz con la voz del propio móvil (Web Speech API: sin conexión ni servicios externos).

export const voiceSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Dice el texto si los avisos por voz están activados (corta lo que estuviera diciendo). */
export function speak(text: string, force = false) {
  if (!voiceSupported() || (!force && !getData().settings.voice)) return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang() === 'en' ? 'en-GB' : 'es-ES'
    u.rate = 1.05
    speechSynthesis.speak(u)
  } catch {
    /* sin voz */
  }
}
