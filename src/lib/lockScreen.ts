import { useSyncExternalStore } from 'react'
import { t } from './i18n'

// Aviso del descanso con el móvil bloqueado (Android).
//
// Una web no puede programar una notificación para dentro de X segundos sin un servidor, y Android
// congela la página al bloquear la pantalla. Lo que sí respeta es la reproducción de audio: mientras
// suena algo, la página sigue viva. Así que durante el descanso se reproduce un audio casi en
// silencio, con la cuenta atrás en los controles multimedia de la pantalla bloqueada (Media Session),
// y al terminar la página —que sigue activa— muestra una notificación de verdad, con vibración.
// En iPhone las apps web se suspenden igualmente: allí no funciona.
//
// Segundo camino, independiente del audio: el service worker también espera hasta el final del
// descanso (dentro de un evento, que Chrome deja vivir hasta 5 minutos) y muestra la notificación
// aunque la página esté congelada. Los dos avisan por el service worker, que evita el duplicado.

let player: HTMLAudioElement | undefined
let playerUrl: string | undefined

/**
 * WAV de 10 s que no se oye: un tono de 25 Hz a −50 dB. Tiene que superar el umbral de silencio de
 * Chrome (unos −72 dB): si no, no lo cuenta como audio sonando y congela la página igualmente (pasaba
 * con la primera versión, un ruido de ±1 a −90 dB). Los altavoces del móvil no reproducen 25 Hz y con
 * auriculares queda muy por debajo de lo audible.
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
  for (let i = 0; i < samples; i++) v.setInt16(44 + i * 2, Math.round(100 * Math.sin((2 * Math.PI * 25 * i) / rate)), true)
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
    player ??= Object.assign(new Audio(playerUrl), { loop: true, volume: 1 })
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

const restMessage = (endAt: number) => ({
  type: 'rest', endAt,
  title: t('¡Descanso terminado!', 'Rest is over!'),
  options: {
    body: t('A por la siguiente serie', 'On to the next set'),
    tag: 'serix-rest', renotify: true, vibrate: [300, 150, 300, 150, 300],
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
  },
})

async function worker(): Promise<ServiceWorker | undefined> {
  try {
    return (await navigator.serviceWorker.getRegistration())?.active ?? undefined
  } catch {
    return undefined
  }
}

/** Pide al service worker que avise al final del descanso (aunque la página se congele). */
export async function scheduleRestNotification(endAt: number) {
  if (!lockScreenSupported() || Notification.permission !== 'granted') return
  ;(await worker())?.postMessage(restMessage(endAt))
}

/** Descanso saltado: el service worker ya no avisa. */
export async function cancelRestNotification() {
  if (!lockScreenSupported()) return
  ;(await worker())?.postMessage({ type: 'rest-cancel' })
}

/** Notificación de «descanso terminado» (se ve con el móvil bloqueado). */
export async function notifyRestDone(endAt: number) {
  if (!lockScreenSupported() || Notification.permission !== 'granted') return
  const message = restMessage(endAt)
  try {
    const sw = await worker()
    // El service worker la muestra solo si no lo hizo ya él a su hora.
    if (sw) return sw.postMessage(message)
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) await registration.showNotification(message.title, message.options)
    else new Notification(message.title, message.options)
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

// Prueba desde Perfil: qué pasó durante el descanso de 10 s, para saber qué falla en cada móvil.

export interface LockScreenTest {
  endAt: number
  /** Cuándo terminó la cuenta atrás en la página y si estaba oculta (móvil bloqueado). */
  pageAt?: number
  pageHidden?: boolean
  /** Cuándo mostró la notificación el service worker. */
  notifiedAt?: number
}

let test: LockScreenTest | undefined
const testListeners = new Set<() => void>()
const setTest = (next: LockScreenTest | undefined) => {
  test = next
  testListeners.forEach((l) => l())
}

export const startLockScreenTest = (endAt: number) => setTest({ endAt })

export function notePageFinish(endAt: number) {
  if (test?.endAt === endAt && test.pageAt === undefined) setTest({ ...test, pageAt: Date.now(), pageHidden: document.visibilityState === 'hidden' })
}

export function useLockScreenTest() {
  return useSyncExternalStore((l) => {
    testListeners.add(l)
    return () => testListeners.delete(l)
  }, () => test)
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as { type?: string; endAt?: number; at?: number } | null
    const current = test
    if (current && msg?.type === 'rest-notified' && current.endAt === msg.endAt && current.notifiedAt === undefined) setTest({ ...current, notifiedAt: msg.at })
  })
}
