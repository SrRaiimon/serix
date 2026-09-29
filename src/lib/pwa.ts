import { useSyncExternalStore } from 'react'
import { activeSession, flush, getData } from './store'

// Instalación como app: Android/Chrome ofrece un aviso propio (beforeinstallprompt); en iPhone hay
// que usar "Compartir → Añadir a pantalla de inicio" en Safari.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  deferred = undefined
  emit()
})

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => deferred !== undefined,
  )
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = undefined
  emit()
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  // Cuando se activa una versión nueva, se recarga para usarla ya (si no, hacía falta abrir la app
  // dos veces). Nunca a mitad de un entrenamiento: en ese caso llega en la siguiente apertura.
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading || activeSession(getData())) return
    reloading = true
    flush()
    location.reload()
  })

  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('sw.js')
    // En el móvil la app puede quedarse abierta días: al volver a ella se busca versión nueva.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update().catch(() => {})
    })
  })
}
