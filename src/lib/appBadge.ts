import { useEffect } from 'react'
import { addDays, startOfDay } from './format'
import { dueToday } from './schedule'
import { getData, useData, type AppData } from './store'

// El icono solo puede actualizarse mientras la app está abierta; nunca pide permisos por su cuenta.
export function trainingBadge(data: Pick<AppData, 'settings' | 'sessions'>, now = Date.now()): 0 | 1 {
  const today = startOfDay(now).getTime()
  const tomorrow = addDays(new Date(today), 1).getTime()
  const finishedToday = data.sessions.some((s) => s.end !== undefined && s.end >= today && s.end < tomorrow)
  return data.settings.appBadge !== false && data.settings.onboarded && !finishedToday && dueToday(data, now) ? 1 : 0
}

type BadgeAPI = { setAppBadge?: (value: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
export async function applyAppBadge(value: 0 | 1, api: BadgeAPI): Promise<void> {
  try {
    if (value) await api.setAppBadge?.(1)
    else await api.clearAppBadge?.()
  } catch { /* Si no está permitido o no está instalado, el resto de la app sigue funcionando. */ }
}

export function useAppBadge() {
  const data = useData()
  useEffect(() => {
    void applyAppBadge(trainingBadge(data), navigator)
  }, [data.settings, data.sessions])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void applyAppBadge(trainingBadge(getData()), navigator)
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
}
