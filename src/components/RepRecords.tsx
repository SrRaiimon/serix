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
  const rows = list.map((r, i) => ({ target: REP_TARGETS[i], r })).filter((x) => x.r)
  return (
    <Card title={t('Peso máximo por repeticiones', 'Heaviest weight by reps')} icon={Medal}>
      <div className="rep-rows">
        {rows.map(({ target, r }) => (
          <div key={target} className="rep-row">
            <span className="rep-target">{target === 1 ? t('1 rep', '1 rep') : `${target} reps`}</span>
            <strong>{weightValue(r!.weight, unit)}<small> {unit}</small></strong>
            <span className="small muted">{r!.reps > target ? t(`con ${r!.reps} · ${shortDay(r!.date)}`, `with ${r!.reps} · ${shortDay(r!.date)}`) : shortDay(r!.date)}</span>
          </div>
        ))}
      </div>
      <span className="small muted">{t('Real, no estimado: lo más que has levantado haciendo al menos esas repeticiones.', 'Actual, not estimated: the most you have lifted for at least that many reps.')}</span>
    </Card>
  )
}
