// Usar Serix sin conexión. La app, el catálogo y los pasos de los ejercicios ya se guardan al
// instalarla; el escáner de códigos, los productos del súper y el lector de etiquetas se guardan al
// usarlos la primera vez. Desde Perfil se pueden descargar también de una vez (unos 17 MB), para el
// gimnasio o el súper sin cobertura. Lo hace el service worker (ver src/sw-template.js).

export interface OfflineProgress {
  done: number
  total: number
  failed?: number
}

async function worker(): Promise<ServiceWorker | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined
  const registration = await navigator.serviceWorker.getRegistration()
  return registration?.active ?? undefined
}

/** Cuántos de los archivos opcionales están guardados (nada si no hay service worker, p. ej. en desarrollo). */
export async function offlineStatus(): Promise<OfflineProgress | undefined> {
  const sw = await worker()
  if (!sw) return undefined
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => resolve(undefined), 5000)
    channel.port1.onmessage = (e: MessageEvent<OfflineProgress>) => { clearTimeout(timer); resolve(e.data) }
    sw.postMessage({ type: 'offline-status' }, [channel.port2])
  })
}

/** Descarga lo que falte; `onProgress` recibe cada paso. Resuelve con el resultado final. */
export async function prepareOffline(onProgress: (p: OfflineProgress) => void): Promise<OfflineProgress | undefined> {
  const sw = await worker()
  if (!sw) return undefined
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (e: MessageEvent<OfflineProgress & { type: string }>) => {
      const { done, total, failed } = e.data
      onProgress({ done, total, failed })
      if (e.data.type === 'done') resolve({ done, total, failed })
    }
    sw.postMessage({ type: 'offline-prepare' }, [channel.port2])
  })
}

/** Si hay conexión ahora mismo (el navegador lo sabe a medias: «sí» no garantiza que llegue). */
export const online = () => typeof navigator === 'undefined' || navigator.onLine !== false
