import { useEffect } from 'react'
import { t } from './i18n'
import { dayKey, mealLabel, MEALS, type FoodEntry, type MealKey } from './nutrition'

// Recordatorio de apuntar las comidas. Una web no puede programar avisos con la app cerrada sin un
// servidor de notificaciones (y Serix no tiene servidor), así que:
// - dentro de la app, pasada la hora de una comida sin nada apuntado, se recuerda en Inicio y en Comidas;
// - si la app sigue abierta en segundo plano y hay permiso, a esa hora llega una notificación.

/** Hora (horario español) a partir de la cual se recuerda cada comida. */
export const REMINDER_AT: Record<MealKey, [number, number]> = { breakfast: [10, 30], lunch: [15, 30], snack: [18, 30], dinner: [22, 30] }

const at = (meal: MealKey, now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...REMINDER_AT[meal]).getTime()
export const reminderTime = (meal: MealKey) => REMINDER_AT[meal].map((n) => String(n).padStart(2, '0')).join(':')

/** Comidas de hoy cuya hora ya ha pasado y no tienen nada apuntado. */
export function dueMeals(entries: FoodEntry[], now = new Date()): MealKey[] {
  const today = dayKey(now)
  const logged = new Set(entries.filter((e) => e.day === today).map((e) => e.meal))
  return MEALS.filter((m) => now.getTime() >= at(m, now) && !logged.has(m))
}

/** Avisa con una notificación a la hora de cada comida, mientras la app esté abierta (aunque no a la vista). */
export function useFoodReminders(enabled: boolean, entries: FoodEntry[]) {
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined') return
    const now = new Date()
    const next = MEALS.map((m) => ({ m, when: at(m, now) })).find((x) => x.when > now.getTime())
    if (!next) return
    const timer = window.setTimeout(() => {
      if (!document.hidden || Notification.permission !== 'granted') return
      if (!dueMeals(entries).includes(next.m)) return
      void navigator.serviceWorker?.ready.then((r) => r.showNotification('Serix', {
        body: t(`¿Qué has comido? Aún no has apuntado: ${mealLabel(next.m).toLowerCase()}.`, `What did you eat? You have not logged: ${mealLabel(next.m).toLowerCase()}.`),
        tag: `food-${next.m}`,
        icon: 'icons/icon-192.png',
        data: { url: './#/food' },
      }))
    }, Math.min(next.when - now.getTime() + 1000, 2 ** 31 - 1))
    return () => window.clearTimeout(timer)
  }, [enabled, entries])
}

/** La comida que toca por la hora: hasta las 12 desayuno, hasta las 17 comida, hasta las 20:30 merienda. */
export function mealByTime(now = new Date()): MealKey {
  const m = now.getHours() * 60 + now.getMinutes()
  return m < 12 * 60 ? 'breakfast' : m < 17 * 60 ? 'lunch' : m < 20 * 60 + 30 ? 'snack' : 'dinner'
}

// Acceso directo «Apuntar comida»: Comidas abre el buscador de la comida que toca al montarse.
let pendingAdd: MealKey | undefined
export const requestAdd = (meal: MealKey) => { pendingAdd = meal }
export const takePendingAdd = () => { const m = pendingAdd; pendingAdd = undefined; return m }
