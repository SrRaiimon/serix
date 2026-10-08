import { isStandalone } from './pwa'
import { getData, updateSettings, type AppData } from './store'

// Los datos solo viven en el dispositivo. Dos defensas: pedir al navegador que no los borre para
// liberar espacio (almacenamiento persistente) y recordar de vez en cuando que se exporte una copia.

const DAY = 86400000
/** Días sin copia a partir de los que se recuerda hacer una. */
export const BACKUP_EVERY_DAYS = 30
const SNOOZE_DAYS = 14

/**
 * Guarda la copia de seguridad y apunta la fecha. En el móvil se abre el menú de compartir para dejarla
 * directamente en Drive, iCloud, el correo o Archivos; si no se puede, se descarga el archivo.
 */
export async function exportBackup(): Promise<boolean> {
  const name = `serix-copia-${new Date().toISOString().slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(getData(), null, 1)], { type: 'application/json' })
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
    } catch (e) {
      // Cancelado: no hay copia. Otro error (p. ej. sin permiso para compartir): se descarga.
      if ((e as Error).name === 'AbortError') return false
      download(blob, name)
    }
  } else {
    download(blob, name)
  }
  updateSettings({ lastBackupAt: Date.now(), backupSnoozeUntil: undefined })
  return true
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** ¿Toca recordar la copia? Solo cuando ya hay algo que perder: 3 entrenamientos o 5 días de comidas. */
export function backupDue(d: AppData, finishedSessions: number, now = Date.now()): boolean {
  if (finishedSessions < 3 && new Set(d.nutrition.entries.map((e) => e.day)).size < 5) return false
  if (d.settings.backupSnoozeUntil && now < d.settings.backupSnoozeUntil) return false
  return !d.settings.lastBackupAt || now - d.settings.lastBackupAt > BACKUP_EVERY_DAYS * DAY
}

export function snoozeBackup() {
  updateSettings({ backupSnoozeUntil: Date.now() + SNOOZE_DAYS * DAY })
}

export type StorageState = 'protected' | 'unprotected' | 'unsupported'

export async function storageState(): Promise<StorageState> {
  if (!navigator.storage?.persisted) return 'unsupported'
  try {
    return (await navigator.storage.persisted()) ? 'protected' : 'unprotected'
  } catch {
    return 'unsupported'
  }
}

/** Pide almacenamiento persistente. Algún navegador (Firefox) puede preguntar al usuario. */
export async function requestProtection(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

/**
 * Con la app instalada, Chrome y Safari conceden la persistencia sin preguntar, así que se pide sola
 * al abrirla. En el navegador normal no se pide automáticamente para no mostrar avisos inesperados.
 */
export async function autoProtect() {
  if (isStandalone() && (await storageState()) === 'unprotected') await requestProtection()
}
