import { Layers } from 'lucide-react'
import { useState } from 'react'
import { BLOCK_WEEKS, blockFocus, blockStart, blockWeek, type BlockWeek } from '../lib/block'
import { day } from '../lib/format'
import { t } from '../lib/i18n'
import { updateSettings, useData, withUndo } from '../lib/store'
import { ActionSheet, Card, Segmented } from './ui'

// Bloque de entrenamiento (ver lib/block.ts): la semana en que estás y qué toca.

/** Las semanas del bloque como puntos: hechas, la actual y la de descarga. */
function WeekDots({ w }: { w: BlockWeek }) {
  return (
    <div className="block-dots" aria-hidden="true">
      {Array.from({ length: w.weeks }, (_, i) => (
        <span key={i} className={`${i + 1 < w.week ? 'done' : i + 1 === w.week ? 'current' : ''} ${i + 1 === w.weeks ? 'deload' : ''}`} />
      ))}
    </div>
  )
}

const title = (w: BlockWeek) => (w.deload
  ? t(`Bloque · semana ${w.week} de ${w.weeks} (descarga)`, `Block · week ${w.week} of ${w.weeks} (deload)`)
  : t(`Bloque · semana ${w.week} de ${w.weeks}`, `Block · week ${w.week} of ${w.weeks}`))

/** Línea compacta para Inicio y el entrenamiento. */
export function BlockStatus({ at }: { at?: number }) {
  const { settings } = useData()
  const w = blockWeek(settings.block, at)
  if (!w) return null
  return (
    <div className={`block-status ${w.deload ? 'deload' : ''}`}>
      <span className="row" style={{ gap: 8 }}><Layers size={16} /> <strong className="grow">{title(w)}</strong> <WeekDots w={w} /></span>
      <span className="small muted">{blockFocus(w)}</span>
    </div>
  )
}

/** Tarjeta de Rutinas: empezar, ver y terminar el bloque. */
export function BlockCard() {
  const { settings } = useData()
  const [weeks, setWeeks] = useState(5)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const w = blockWeek(settings.block)

  const end = () => withUndo(t('Bloque terminado', 'Block ended'), () => updateSettings({ block: undefined }))
  const endDialog = confirmEnd && (
    <ActionSheet title={t('¿Terminar el bloque?', 'End the block?')} message={t('Dejarás de ver las semanas y no habrá descarga programada.', 'You will stop seeing the weeks and there will be no scheduled deload.')}
      onClose={() => setConfirmEnd(false)} options={[{ label: t('Terminar bloque', 'End block'), destructive: true, onSelect: end }]} />
  )

  // Programado para el lunes que viene.
  if (settings.block && !w) {
    return (
      <Card title={t('Bloque de entrenamiento', 'Training block')} icon={Layers}>
        <span className="small">{t(`Empieza el ${day(settings.block.start).toLowerCase()}: ${settings.block.weeks - 1} semanas de carga + 1 de descarga.`, `Starts on ${day(settings.block.start)}: ${settings.block.weeks - 1} loading weeks + 1 deload week.`)}</span>
        <button className="btn plain" onClick={() => setConfirmEnd(true)}>{t('Cancelar bloque', 'Cancel block')}</button>
        {endDialog}
      </Card>
    )
  }

  if (!settings.block || !w) {
    const start = blockStart()
    const thisWeek = start <= Date.now()
    return (
      <Card title={t('Bloque de entrenamiento', 'Training block')} icon={Layers}>
        <span className="small muted">
          {t('Planifica unas semanas apretando cada vez un poco más (de 3 a 1 repeticiones en la recámara) y una semana de descarga al final para recuperar. Se repite solo.',
            'Plan a few weeks pushing a little harder each time (from 3 down to 1 rep in reserve) and a deload week at the end to recover. It repeats automatically.')}
        </span>
        <Segmented value={String(weeks)} onChange={(v) => setWeeks(Number(v))}
          options={BLOCK_WEEKS.map((n) => ({ value: String(n), label: t(`${n} sem.`, `${n} wk`) }))} />
        <span className="tiny muted">
          {t(`${weeks - 1} semanas de carga + 1 de descarga.`, `${weeks - 1} loading weeks + 1 deload week.`)}{' '}
          {thisWeek ? t('Empieza esta semana.', 'Starts this week.') : t(`Empieza el lunes ${day(start).split(', ').pop()}, para no perder la primera semana.`, `Starts on Monday ${day(start).split(', ').pop()}, so the first week is not lost.`)}
        </span>
        <button className="btn primary" onClick={() => updateSettings({ block: { start, weeks } })}>{thisWeek ? t('Empezar bloque', 'Start block') : t('Programar bloque', 'Schedule block')}</button>
      </Card>
    )
  }

  return (
    <Card title={t('Bloque de entrenamiento', 'Training block')} icon={Layers}>
      <BlockStatus />
      {w.cycle > 1 && <span className="tiny muted">{t(`Bloque número ${w.cycle}: se repite solo hasta que lo termines.`, `Block number ${w.cycle}: it repeats until you end it.`)}</span>}
      <span className="tiny muted">
        {t('En la semana de descarga, los ejercicios de peso empiezan ya con menos series y un 10 % menos de peso. Los pesos que te propone la app no tienen en cuenta esas sesiones, así que después vuelves a los de antes.',
          'In the deload week, weight exercises already start with fewer sets and 10% less weight. The weights the app suggests ignore those sessions, so afterwards you go back to your previous ones.')}
      </span>
      <button className="btn plain" onClick={() => setConfirmEnd(true)}>{t('Terminar bloque', 'End block')}</button>
      {endDialog}
    </Card>
  )
}
