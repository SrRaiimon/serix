import { HeartPulse } from 'lucide-react'
import { useMemo } from 'react'
import { t } from '../lib/i18n'
import { MAIN_GROUPS } from '../lib/labels'
import { muscleRecovery, type MuscleRecovery } from '../lib/stats'
import type { Session } from '../lib/store'
import { Card, useCatalog } from './ui'

// Estado de recuperación por grupo muscular (estimación orientativa, ver stats.muscleRecovery).

export interface GroupRecovery {
  label: string
  muscles: string[]
  /** 0-1; 1 = listo. Sin datos recientes cuenta como listo. */
  ready: number
  /** Horas que faltan para estar listo. */
  hoursLeft: number
}

/** Por debajo de esto se considera que el grupo todavía se está recuperando. */
export const RECOVERING = 0.6

export function useRecovery(sessions: Session[]): GroupRecovery[] {
  const catalog = useCatalog()
  return useMemo(() => {
    const now = Date.now()
    const byMuscle = new Map<string, MuscleRecovery>(
      muscleRecovery(sessions, (id) => catalog.get(id)?.secondaryMuscles ?? [], now).map((r) => [r.muscle, r]),
    )
    return MAIN_GROUPS.map(([label, muscles]) => {
      // El grupo está tan recuperado como su parte menos recuperada.
      const worst = muscles.map((m) => byMuscle.get(m)).filter((r): r is MuscleRecovery => !!r).sort((a, b) => a.ready - b.ready)[0]
      return {
        label: t(...label), muscles,
        ready: worst?.ready ?? 1,
        hoursLeft: worst ? Math.max(0, Math.ceil((1 - worst.ready) * worst.hoursNeeded)) : 0,
      }
    })
  }, [sessions, catalog])
}

const status = (g: GroupRecovery) =>
  g.ready >= 1 ? t('Listo', 'Ready')
    : g.ready >= RECOVERING ? t(`Casi listo · ~${g.hoursLeft} h`, `Almost ready · ~${g.hoursLeft} h`)
    : t(`Recuperándose · ~${g.hoursLeft} h`, `Recovering · ~${g.hoursLeft} h`)

const tone = (g: GroupRecovery) => (g.ready >= 1 ? 'ready' : g.ready >= RECOVERING ? 'almost' : 'recovering')

export function RecoveryCard({ sessions }: { sessions: Session[] }) {
  const groups = useRecovery(sessions)
  return (
    <Card title={t('Recuperación muscular', 'Muscle recovery')} icon={HeartPulse}>
      <div className="recovery-list">
        {groups.map((g) => (
          <div key={g.label} className={`recovery-row ${tone(g)}`}>
            <span className="recovery-name">{g.label}</span>
            <span className="recovery-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.ready * 100)} aria-label={`${g.label}: ${status(g)}`}>
              <span style={{ width: `${Math.round(g.ready * 100)}%` }} />
            </span>
            <span className="recovery-status small">{status(g)}</span>
          </div>
        ))}
      </div>
      <span className="small muted">
        {t('Estimación orientativa según el volumen del último entrenamiento de cada grupo (de 48 a 96 h). Escucha a tu cuerpo: el descanso, el sueño y la intensidad también cuentan.',
          'A rough estimate based on the volume of each group\'s last workout (48 to 96 h). Listen to your body: rest, sleep and intensity matter too.')}
      </span>
    </Card>
  )
}
