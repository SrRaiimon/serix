import { lang, t } from './i18n'
import { isStandalone } from './pwa'

// Contar un fallo o proponer una idea al creador de Serix por sus redes (Instagram, LinkedIn o GitHub).
// El mensaje empieza diciendo si es un FALLO o una IDEA y lleva la versión y el tipo de móvil (nunca tus
// datos). Serix no tiene servidor: no se envía nada por sí solo, lo mandas tú desde la red que elijas.

export type FeedbackKind = 'bug' | 'idea'

/** Dónde contactar con el creador. */
export const CONTACT = [
  { id: 'instagram', name: 'Instagram', handle: '@srraiimon', profile: 'https://www.instagram.com/srraiimon/', dm: 'https://ig.me/m/srraiimon' },
  { id: 'linkedin', name: 'LinkedIn', handle: 'ramoncasañamartinez', profile: 'https://www.linkedin.com/in/ramoncasa%C3%B1amartinez/' },
  { id: 'github', name: 'GitHub', handle: 'SrRaiimon', profile: 'https://github.com/SrRaiimon' },
] as const
export type ContactId = (typeof CONTACT)[number]['id']

/** Móvil y navegador, sin nada que identifique a la persona. */
export function deviceSummary(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const os = /iPhone|iPad/.test(ua) ? `iOS ${(/OS (\d+)_/.exec(ua) ?? [])[1] ?? ''}`.trim()
    : /Android/.test(ua) ? `Android ${(/Android (\d+)/.exec(ua) ?? [])[1] ?? ''}`.trim()
      : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : 'otro'
  const browser = /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'otro'
  return `${os} · ${browser}${isStandalone() ? ' · instalada' : ''}`
}

/** Primera línea: deja claro si es un fallo o una idea. */
export const feedbackTitle = (kind: FeedbackKind) => (kind === 'idea' ? t('💡 IDEA para Serix', '💡 IDEA for Serix') : t('🐞 FALLO en Serix', '🐞 BUG in Serix'))

export function feedbackText(kind: FeedbackKind, detail: string): string {
  return [feedbackTitle(kind), '', detail.trim(), '', `(${t('Versión', 'Version')} ${__APP_VERSION__} · ${deviceSummary()} · ${lang()})`].join('\n')
}

/**
 * Manda el mensaje por la red elegida. GitHub abre una incidencia nueva ya rellenada («Fallo: …» o
 * «Idea: …»); Instagram abre el chat y LinkedIn el perfil, con el mensaje copiado para pegarlo.
 * Se llama dentro del toque para que el navegador deje abrir la pestaña.
 */
export function sendTo(contact: ContactId, kind: FeedbackKind, detail: string): 'opened' | 'copied' {
  const text = feedbackText(kind, detail)
  const c = CONTACT.find((x) => x.id === contact)!
  if (contact === 'github') {
    const title = `${kind === 'idea' ? t('Idea', 'Idea') : t('Fallo', 'Bug')}: ${detail.trim().split('\n')[0].slice(0, 70)}`
    window.open(`https://github.com/SrRaiimon/serix/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`, '_blank', 'noopener')
    return 'opened'
  }
  void navigator.clipboard?.writeText(text).catch(() => undefined)
  window.open('dm' in c ? c.dm : c.profile, '_blank', 'noopener')
  return 'copied'
}
