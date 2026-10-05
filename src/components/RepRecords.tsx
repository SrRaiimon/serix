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
  // Si la misma serie es el récord de varias repeticiones (p. ej. 97,5 kg × 9 vale para 1, 3 y 5), va en una sola fila.
  const rows: { targets: number[]; r: (typeof list)[number] }[] = []
  list.forEach((r, i) => {
    const target = REP_TARGETS[i]
    const prev = rows[rows.length - 1]
    if (prev && r && prev.r && prev.r.weight === r.weight && prev.r.reps === r.reps && prev.r.date === r.date) prev.targets.push(target)
    else rows.push({ targets: [target], r })
  })
  const merged = rows.find((x) => x.targets.length > 1)
  return (
    <Card title={t('Récords por repeticiones', 'Rep records')} icon={Medal}>
      <div className="rep-rows">
        {rows.map(({ targets, r }) => (
          <div key={targets[0]} className="rep-row">
            <span className="rep-target">{targets.length > 1 ? `${targets[0]}–${targets[targets.length - 1]}` : targets[0]}RM</span>
            <strong>{r ? <>{weightValue(r.weight, unit)}<small> {unit}</small></> : '—'}</strong>
            <span className="small muted">{r ? `${r.reps} reps · ${shortDay(r.date)}` : t('Aún sin marca', 'No record yet')}</span>
          </div>
        ))}
      </div>
      <span className="small muted">{t('El mayor peso que has levantado haciendo al menos esas repeticiones (real, no estimado).', 'The heaviest weight you have lifted for at least that many reps (actual, not estimated).')}
        {merged?.r && ' ' + t(`Hacerlo con más repeticiones también cuenta para menos: ${weightValue(merged.r.weight, unit)} ${unit} × ${merged.r.reps} vale para ${merged.targets.slice(0, -1).join(', ')} y ${merged.targets[merged.targets.length - 1]} repeticiones.`,
          `Doing it for more reps also counts for fewer: ${weightValue(merged.r.weight, unit)} ${unit} × ${merged.r.reps} counts for ${merged.targets.slice(0, -1).join(', ')} and ${merged.targets[merged.targets.length - 1]} reps.`)}</span>
    </Card>
  )
}
