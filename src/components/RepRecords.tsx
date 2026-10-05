import { Medal } from 'lucide-react'
import { useMemo } from 'react'
import { shortDay, weightValue, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { repRecords } from '../lib/stats'
import type { Session } from '../lib/store'
import { Card } from './ui'

/** Récords reales del ejercicio a 1, 3, 5 y 10 repeticiones. */
export function RepRecordsCard({ exerciseId, sessions, unit }: { exerciseId: string; sessions: Session[]; unit: Unit }) {
  const list = useMemo(() => repRecords(exerciseId, sessions), [exerciseId, sessions])
  if (!list.some(Boolean)) return null
  return (
    <Card title={t('Récords por repeticiones', 'Rep records')} icon={Medal}>
      <div className="rep-records">
        {list.map((r, i) => (
          <div key={i} className="rep-record">
            <span className="tiny muted">{[1, 3, 5, 10][i]}RM</span>
            <span className="bold">{r ? <>{weightValue(r.weight, unit)}<small> {unit}</small></> : '—'}</span>
            <span className="tiny muted">{r ? (r.reps > r.target ? t(`${r.reps} reps · ${shortDay(r.date)}`, `${r.reps} reps · ${shortDay(r.date)}`) : shortDay(r.date)) : ' '}</span>
          </div>
        ))}
      </div>
      <span className="small muted">{t('El mayor peso que has movido al menos esas repeticiones (real, no estimado).', 'The heaviest weight you have moved for at least that many reps (actual, not estimated).')}</span>
    </Card>
  )
}
