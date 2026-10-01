import { ArrowRightLeft, FileUp, Link2Off } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Segmented, Sheet, Thumb, useCatalog } from '../components/ui'
import type { Exercise } from '../lib/catalog'
import { shortDay, type Unit } from '../lib/format'
import { plural, t } from '../lib/i18n'
import { matchExercise, parseWorkouts, toSessions } from '../lib/importCsv'
import { finishedSessions, update, useData, withUndo } from '../lib/store'
import { ExercisePicker } from './Exercises'

// Importar el historial de Strong o Hevy (CSV): resumen, unidad y emparejado de ejercicios.

export function ImportCsvSheet({ text, onClose, onDone }: { text: string; onClose: () => void; onDone: (count: number) => void }) {
  const catalog = useCatalog()
  const data = useData()
  const [unit, setUnit] = useState<Unit>(data.settings.unit)
  const [overrides, setOverrides] = useState(new Map<string, Exercise | null>())
  const [choosing, setChoosing] = useState<string>()

  const parsed = useMemo(() => {
    try {
      return parseWorkouts(text, unit)
    } catch {
      return undefined
    }
  }, [text, unit])
  // Nombres distintos del archivo, con cuántas series tienen (los más usados primero).
  const names = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of parsed?.workouts ?? []) for (const e of w.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + e.sets.length)
    return [...counts].sort((a, b) => b[1] - a[1])
  }, [parsed])
  const auto = useMemo(() => new Map(names.map(([n]) => [n, matchExercise(n, catalog)])), [names, catalog])
  const mapping = useMemo(() => {
    const m = new Map<string, Exercise | undefined>()
    for (const [n] of names) m.set(n, overrides.has(n) ? overrides.get(n) ?? undefined : auto.get(n))
    return m
  }, [names, auto, overrides])
  const existing = useMemo(() => finishedSessions(data), [data])
  const sessions = useMemo(() => (parsed ? toSessions(parsed.workouts, mapping, existing) : []), [parsed, mapping, existing])

  if (!parsed) {
    return (
      <Sheet title={t('Importar historial', 'Import history')} onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
        <Card title={t('Formato no reconocido', 'Unrecognised format')} icon={Link2Off}>
          <span>{t('El archivo no parece una exportación de Strong o Hevy. En Strong: Ajustes → Exportar datos. En Hevy: Perfil → Ajustes → Exportar y descargar datos → Exportar entrenamientos.',
            'The file does not look like a Strong or Hevy export. In Strong: Settings → Export data. In Hevy: Profile → Settings → Export & import data → Export workouts.')}</span>
        </Card>
      </Sheet>
    )
  }

  const workouts = parsed.workouts
  const skipped = workouts.length - sessions.length
  const unmatched = names.filter(([n]) => !mapping.get(n)).length
  const app = parsed.format === 'strong' ? 'Strong' : 'Hevy'
  const save = () => {
    withUndo(plural(sessions.length, ['entrenamiento importado', 'entrenamientos importados'], ['workout imported', 'workouts imported']),
      () => update((d) => { d.sessions.push(...sessions) }))
    onDone(sessions.length)
    onClose()
  }

  return (
    <Sheet title={t(`Importar de ${app}`, `Import from ${app}`)} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!sessions.length} onClick={save}>
        <FileUp size={19} /> {sessions.length ? `${t('Importar', 'Import')} ${plural(sessions.length, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}` : t('Nada nuevo que importar', 'Nothing new to import')}
      </button>}>
      <Card>
        <strong>{plural(workouts.length, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}{workouts.length > 0 && ` · ${shortDay(workouts[0].start)} – ${shortDay(workouts[workouts.length - 1].start)}`}</strong>
        {skipped > 0 && <span className="small muted">{t(`${skipped} ya estaban en Serix y no se repetirán.`, `${skipped} were already in Serix and will not be duplicated.`)}</span>}
        {parsed.format === 'strong' && (
          <>
            <span className="small">{t('¿En qué unidad están los pesos del archivo?', 'What unit are the weights in the file?')}</span>
            <Segmented value={unit} onChange={(u: Unit) => setUnit(u)} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
          </>
        )}
      </Card>

      <div className="list-header">{t('Ejercicios', 'Exercises')} · {names.length}</div>
      <p className="list-footer" style={{ margin: 0 }}>
        {unmatched
          ? t(`${unmatched} sin equivalencia: se importarán con su nombre (sin figura ni mapa muscular). Toca cualquiera para elegir el ejercicio de Serix que corresponde.`,
            `${unmatched} without a match: they will be imported with their name (no figure or muscle map). Tap any of them to choose the matching Serix exercise.`)
          : t('Toca cualquiera para cambiar el ejercicio de Serix que le corresponde.', 'Tap any of them to change the matching Serix exercise.')}
      </p>
      <div className="list">
        {names.map(([name, sets]) => {
          const match = mapping.get(name)
          return (
            <button key={name} className="list-row" onClick={() => setChoosing(name)}>
              {match ? <Thumb exerciseId={match.id} size={40} /> : <span className="import-nomatch"><ArrowRightLeft size={18} /></span>}
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="bold clamp-1" style={{ display: 'block', fontSize: 15 }}>{match ? match.name : t('Sin equivalencia', 'No match')}</span>
                <span className="small muted clamp-1">{name} · {plural(sets, ['serie', 'series'], ['set', 'sets'])}</span>
              </span>
            </button>
          )
        })}
      </div>
      {choosing && (
        <ExercisePicker single title={choosing} onClose={() => setChoosing(undefined)}
          onDone={([e]) => setOverrides((o) => new Map(o).set(choosing, e ?? null))} />
      )}
    </Sheet>
  )
}
