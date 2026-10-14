import type { AppData } from './store'

// Aparte de friends.ts (grande: compartir, comprimir, comparar) para que Inicio pueda decidir si toca el
// recordatorio sin cargar todo eso al abrir la app.

const DAY = 86400000

/** Domingo o lunes, con amigos añadidos y sin haber compartido en 6 días: recordar mandar el resumen. */
export function shareReminderDue(data: AppData, now = Date.now()): boolean {
  const { friendShareAt, friendReminderOff, friendReminderSnooze } = data.settings
  if (friendReminderOff || !data.friends.length) return false
  if (friendReminderSnooze && now < friendReminderSnooze) return false
  const weekday = new Date(now).getDay()
  return (weekday === 0 || weekday === 1) && (!friendShareAt || now - friendShareAt >= 6 * DAY)
}
