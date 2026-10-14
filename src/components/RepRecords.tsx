import { Medal } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { shortDay, weightValue, type Unit } from '../lib/format'
import { t } from '../lib/i18n'
import { REP_TARGETS, repRecords } from '../lib/stats'
import type { Session } from '../lib/store'
import { Card } from './ui'

/** Récords reales del ejercicio a 1, 3, 5 y 10 repeticiones. */
export function RepRecordsCard({ exerciseId, sessions, unit }: { exerciseId: string; sessions: Session[]; unit: Unit }) {
  const list = useMemo(() => repRecords(exerciseId, sessions), [exerciseId, sessions])
  if (!list.some(Boolean)) return null
  // Si una misma serie es el récord de varias repeticiones (10 reps con un peso valen también para 1, 3 y
  // 5), una sola fila «1–10» en vez de la misma cifra cuatro veces.
  const rows: { target: string; r: NonNullable<(typeof list)[number]> }[] = []
  list.forEach((r, i) => {
    if (!r) return
    const prev = rows[rows.length - 1]
    if (prev && prev.r.weight === r.weight && prev.r.date === r.date) prev.target = `${prev.target.split('–')[0]}–${REP_TARGETS[i]}`
    else rows.push({ target: String(REP_TARGETS[i]), r })
  })
  return (
    <Card title={t('Peso máximo por repeticiones', 'Heaviest weight by reps')} icon={Medal}>
      <div className="rep-table">
        <span className="rep-th">{t('Reps', 'Reps')}</span><span className="rep-th">{t('Peso', 'Weight')}</span><span className="rep-th">{t('En una serie de', 'In a set of')}</span>
        {rows.map(({ target, r }) => (
          <Fragment key={target}>
            <span className="rep-target">{target}</span>
            {/* Con el peso corporal dentro (dominadas, fondos) salían decimales como 92,82: medio kilo basta. */}
            <strong>{weightValue(Math.round(r.weight * 2) / 2, unit)}<small> {unit}</small></strong>
            <span className="small muted">{t(`${r.reps} reps · ${shortDay(r.date)}`, `${r.reps} reps · ${shortDay(r.date)}`)}</span>
          </Fragment>
        ))}
      </div>
      <span className="small muted">{t('Real, no estimado: lo más que has levantado haciendo al menos esas repeticiones.', 'Actual, not estimated: the most you have lifted for at least that many reps.')}</span>
    </Card>
  )
}
