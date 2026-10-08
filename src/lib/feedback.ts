import { lang, t } from './i18n'
import { isStandalone } from './pwa'

// Contar un fallo o una idea: se prepara un mensaje con la versión y el tipo de móvil (nunca tus datos)
// y se abre el menú de compartir del móvil para mandarlo por Instagram, WhatsApp, correo… (en Perfil →
// Ayuda están las redes del creador).
// Serix no tiene servidor: no se envía nada a ningún sitio por sí solo.

/** Móvil y navegador, sin nada que identifique a la persona. */
export function deviceSummary(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const os = /iPhone|iPad/.test(ua) ? `iOS ${(/OS (\d+)_/.exec(ua) ?? [])[1] ?? ''}`.trim()
    : /Android/.test(ua) ? `Android ${(/Android (\d+)/.exec(ua) ?? [])[1] ?? ''}`.trim()
      : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : 'otro'
  const browser = /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'otro'
  return `${os} · ${browser}${isStandalone() ? ' · instalada' : ''}`
}

export function feedbackText(kind: 'bug' | 'idea' | 'crash', detail = ''): string {
  const head = kind === 'idea' ? t('Idea para Serix', 'Idea for Serix') : t('Fallo en Serix', 'Bug in Serix')
  return [
    `${head} (${__APP_VERSION__} · ${deviceSummary()} · ${lang()})`,
    '',
    detail || (kind === 'idea' ? t('Mi idea: ', 'My idea: ') : t('Qué estaba haciendo y qué pasó: ', 'What I was doing and what happened: ')),
  ].join('\n')
}

/** Abre el menú de compartir con el mensaje; si no hay, lo copia. Devuelve 'copied' si se copió. */
export async function sendFeedback(kind: 'bug' | 'idea' | 'crash', detail?: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = feedbackText(kind, detail)
  try {
    if (navigator.share) { await navigator.share({ text }); return 'shared' }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'cancelled'
  }
}
