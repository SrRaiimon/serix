import { t } from './i18n'

// Aviso del descanso con el móvil bloqueado (Android).
//
// Una web no puede programar una notificación para dentro de X segundos sin un servidor, y Android
// congela la página al bloquear la pantalla. Lo que sí respeta es la reproducción de audio: mientras
// suena algo, la página sigue viva. Así que durante el descanso se reproduce un audio casi en
// silencio, con la cuenta atrás en los controles multimedia de la pantalla bloqueada (Media Session),
// y al terminar la página —que sigue activa— muestra una notificación de verdad, con vibración.
// En iPhone las apps web se suspenden igualmente: allí no funciona.

let player: HTMLAudioElement | undefined
let playerUrl: string | undefined

/**
 * WAV de 10 s casi en silencio: un ruido de ±1 sobre 32768 (inaudible) para que el sistema lo trate
 * como audio que suena de verdad.
 */
function quietWav(): string {
  const rate = 8000, seconds = 10, samples = rate * seconds
  const buffer = new ArrayBuffer(44 + samples * 2)
  const v = new DataView(buffer)
  const text = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, 'data')
  v.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i++) v.setInt16(44 + i * 2, i % 2 ? 1 : -1, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

export const lockScreenSupported = () =>
  typeof window !== 'undefined' && 'mediaSession' in navigator && 'Notification' in window && 'serviceWorker' in navigator

/** Pide permiso para notificar (desde un toque del usuario). */
export async function requestLockScreenPermission(): Promise<boolean> {
  if (!lockScreenSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export interface LockScreenControls {
  onAdd: (seconds: number) => void
  onSkip: () => void
}

/** Empieza (o actualiza) la cuenta atrás en la pantalla bloqueada. Debe llamarse desde un toque. */
export function showRestOnLockScreen(endAt: number, total: number, controls: LockScreenControls) {
  if (!lockScreenSupported()) return
  try {
    playerUrl ??= quietWav()
    player ??= Object.assign(new Audio(playerUrl), { loop: true })
    void player.play().catch(() => {})
    const session = navigator.mediaSession
    const end = new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    session.metadata = new MediaMetadata({
      title: t(`Descanso · termina a las ${end}`, `Rest · ends at ${end}`),
      artist: 'Serix',
      artwork: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    })
    session.playbackState = 'playing'
    // Barra de progreso del descanso en los controles multimedia.
    const duration = total / 1000
    session.setPositionState?.({ duration, position: Math.min(duration, Math.max(0, duration - (endAt - Date.now()) / 1000)), playbackRate: 1 })
    session.setActionHandler('seekforward', () => controls.onAdd(15))
    session.setActionHandler('seekbackward', () => controls.onAdd(-15))
    // «Pausa» en la pantalla bloqueada = saltar el descanso (pausar el audio congelaría la página).
    session.setActionHandler('pause', () => controls.onSkip())
    session.setActionHandler('stop', () => controls.onSkip())
  } catch {
    /* sin soporte */
  }
}

/** Quita la cuenta atrás de la pantalla bloqueada y deja de reproducir. */
export function clearRestFromLockScreen() {
  try {
    player?.pause()
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      for (const action of ['seekforward', 'seekbackward', 'pause', 'stop'] as const) navigator.mediaSession.setActionHandler(action, null)
    }
  } catch {
    /* sin soporte */
  }
}

/** Notificación de «descanso terminado» (se ve con el móvil bloqueado). */
export async function notifyRestDone() {
  if (!lockScreenSupported() || Notification.permission !== 'granted') return
  const title = t('¡Descanso terminado!', 'Rest is over!')
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: t('A por la siguiente serie', 'On to the next set'),
    tag: 'serix-rest', renotify: true, vibrate: [300, 150, 300, 150, 300],
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) await registration.showNotification(title, options)
    else new Notification(title, options)
  } catch {
    /* sin permiso o sin soporte */
  }
}

/** Quita la notificación al volver a la app. */
export async function clearRestNotification() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    for (const n of (await registration?.getNotifications({ tag: 'serix-rest' })) ?? []) n.close()
  } catch {
    /* sin soporte */
  }
}
