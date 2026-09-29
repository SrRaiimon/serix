import { isStandalone } from './pwa'
import { getData, updateSettings, type AppData } from './store'

// Los datos solo viven en el dispositivo. Dos defensas: pedir al navegador que no los borre para
// liberar espacio (almacenamiento persistente) y recordar de vez en cuando que se exporte una copia.

const DAY = 86400000
/** Días sin copia a partir de los que se recuerda hacer una. */
export const BACKUP_EVERY_DAYS = 30
const SNOOZE_DAYS = 14

/** Descarga la copia de seguridad y apunta la fecha. */
export function exportBackup() {
  const blob = new Blob([JSON.stringify(getData(), null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `serix-copia-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  updateSettings({ lastBackupAt: Date.now(), backupSnoozeUntil: undefined })
}

/** ¿Toca recordar la copia? Solo cuando ya hay algo que perder (3 entrenamientos o más). */
export function backupDue(d: AppData, finishedSessions: number, now = Date.now()): boolean {
  if (finishedSessions < 3) return false
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
