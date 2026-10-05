import { Medal } from 'lucide-react'
import { useMemo } from 'react'
import { shortDay, weightValue, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { REP_TARGETS, repRecords } from '../lib/stats'
import type { Session } from '../lib/store'
import { Card } from './ui'

/** Récords reales del ejercicio a 1, 3, 5 y 10 repeticiones. */
export function RepRecordsCard({ exerciseId, sessions, unit }: { exerciseId: string; sessions: Session[]; unit: Unit }) {
  const list = useMemo(() => repRecords(exerciseId, sessions), [exerciseId, sessions])
  if (!list.some(Boolean)) return null
  // Si la misma serie es la mejor para varias repeticiones (97,5 kg × 9 vale para 1, 3 y 5), va una sola vez.
  const rows: { targets: number[]; r: NonNullable<(typeof list)[number]> }[] = []
  list.forEach((r, i) => {
    if (!r) return
    const prev = rows[rows.length - 1]
    if (prev && prev.r.weight === r.weight && prev.r.reps === r.reps && prev.r.date === r.date) prev.targets.push(REP_TARGETS[i])
    else rows.push({ targets: [REP_TARGETS[i]], r })
  })
  const repsLabel = (targets: number[]) => targets.length === 1
    ? (targets[0] === 1 ? t('1 rep', '1 rep') : `${targets[0]} reps`)
    : `${targets.slice(0, -1).join(', ')} ${t('y', 'and')} ${targets[targets.length - 1]} reps`
  return (
    <Card title={t('Peso máximo por repeticiones', 'Heaviest weight by reps')} icon={Medal}>
      <div className="rep-rows">
        {rows.map(({ targets, r }) => (
          <div key={targets[0]} className="rep-row">
            <span className="rep-target">{repsLabel(targets)}</span>
            <strong>{weightValue(r.weight, unit)}<small> {unit}</small></strong>
            <span className="small muted">{r.reps > targets[targets.length - 1] ? t(`hecho a ${r.reps} reps · ${shortDay(r.date)}`, `done for ${r.reps} reps · ${shortDay(r.date)}`) : shortDay(r.date)}</span>
          </div>
        ))}
      </div>
      <span className="small muted">{t('Real, no estimado: lo más que has levantado haciendo al menos esas repeticiones.', 'Actual, not estimated: the most you have lifted for at least that many reps.')}</span>
    </Card>
  )
}
