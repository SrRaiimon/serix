// Programas de Rutinas: el generador, la biblioteca y el 5/3/1.
import { ChevronRight, RotateCcw, WandSparkles } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Card, Segmented, Sheet, Thumb, useCatalog } from '../components/ui'
import { editable, fromKg, parseDecimal, toKg, weight } from '../lib/format'
import { LIFTS_531, trainingMaxFrom } from '../lib/progression'
import { buildLibraryProgram, equipmentInfo, equipmentProfiles, generate, goals, LIBRARY, levelInfo, levels, type EquipmentProfile, type GeneratedProgram, type GeneratorConfig, type LibraryProgram } from '../lib/generator'
import { navigate } from '../lib/router'
import { finishedSessions, updateSettings, useData } from '../lib/store'
import { records } from '../lib/stats'
import { defaultTracking, PROGRAM_TARGET_SECONDS, targetText } from '../lib/tracking'
import { programDayMinutes, ProgramPreview, PullupBarRow } from '../components/Program'
import { saveProgram } from '../lib/programs'
import { t } from '../lib/i18n'

export function GeneratorForm({ config, onChange }: { config: GeneratorConfig; onChange: (c: GeneratorConfig) => void }) {
  return (
    <>
      <div className="list-header">{t('Objetivo', 'Goal')}</div>
      <div className="list">
        <label className="list-row">
          <span className="grow">{t('Objetivo', 'Goal')}</span>
          <select className="select" value={config.goal} onChange={(e) => onChange({ ...config, goal: e.target.value as GeneratorConfig['goal'] })}>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">{t('Nivel', 'Level')}</span>
          <select className="select" value={config.level} onChange={(e) => onChange({ ...config, level: e.target.value as GeneratorConfig['level'] })}>
            {levels.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
      </div>
      <div className="list-header">{t('Disponibilidad', 'Availability')}</div>
      <div className="card">
        <span className="small muted">{t('Días por semana', 'Days per week')}</span>
        <Segmented value={String(config.days)} options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => onChange({ ...config, days: Number(v) })} />
        <span className="small muted">{t('Minutos por sesión', 'Minutes per session')}</span>
        <Segmented value={String(config.minutes)} options={[30, 45, 60, 75, 90].map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => onChange({ ...config, minutes: Number(v) })} />
      </div>
      <div className="list-header">{t('Material disponible', 'Available equipment')}</div>
      <div className="list">
        {equipmentProfiles.map((p) => (
          <button key={p.id} className="list-row" aria-pressed={config.equipment === p.id} onClick={() => onChange({ ...config, equipment: p.id })}>
            <span className="grow">{p.label}</span>
            {config.equipment === p.id && <span style={{ color: 'var(--accent-text)', fontWeight: 800 }}>✓</span>}
          </button>
        ))}
        {config.equipment !== 'gym' && <PullupBarRow value={!!config.pullupBar} onChange={(v) => onChange({ ...config, pullupBar: v || undefined })} />}
      </div>
    </>
  )
}

export function GeneratorSheet({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const [config, setConfig] = useState<GeneratorConfig>({
    goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment, pullupBar: settings.pullupBar,
  })
  const [program, setProgram] = useState<GeneratedProgram>()
  const [variation, setVariation] = useState(0)

  if (program) {
    return (
      <Sheet title={t('Vista previa', 'Preview')} onClose={onClose}
        left={<button className="nav-btn" onClick={() => setProgram(undefined)}>{t('Atrás', 'Back')}</button>}
        right={<button className="nav-btn" onClick={() => { setVariation(variation + 1); setProgram(generate(config, catalog, variation + 1)) }}><RotateCcw size={18} /> {t('Otra propuesta', 'Another one')}</button>}
        footer={<button className="btn primary block" onClick={() => { saveProgram(program); onClose(); navigate('routines') }}>{t('Guardar programa', 'Save program')}</button>}>
        <ProgramPreview program={program} />
      </Sheet>
    )
  }

  return (
    <Sheet title={t('Generar programa', 'Generate program')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}
      footer={
        <button className="btn primary block" onClick={() => {
          updateSettings(config)
          setVariation(0)
          setProgram(generate(config, catalog, 0))
        }}><WandSparkles size={19} /> {t('Generar programa', 'Generate program')}</button>
      }>
      <GeneratorForm config={config} onChange={setConfig} />
    </Sheet>
  )
}

/** Programas listos para usar (lib/generator.ts, LIBRARY): elegir, ver y añadir. */
export function LibrarySheet({ onClose, on531 }: { onClose: () => void; on531?: () => void }) {
  const catalog = useCatalog()
  const data = useData()
  const [chosen, setChosen] = useState<LibraryProgram>()
  const [equipment, setEquipment] = useState<EquipmentProfile>(data.settings.equipment)
  const [minutes, setMinutes] = useState(data.settings.minutes)
  const program = useMemo(() => (chosen ? buildLibraryProgram(chosen, equipment, catalog, !!data.settings.pullupBar, minutes) : undefined), [chosen, equipment, catalog, data.settings.pullupBar, minutes])

  const add = () => {
    if (!program) return
    // Si ya tienes uno con ese nombre, se añade con otro para no mezclarlos.
    const taken = new Set(data.routines.map((r) => r.programName))
    let name = program.name
    for (let n = 2; taken.has(name); n++) name = `${program.name} (${n})`
    saveProgram({ ...program, name })
    onClose()
    navigate('routines')
  }

  if (chosen && program) {
    return (
      // Con su propia clave: es otra hoja (el foco y el lector van a ella), no la lista con otro título.
      <Sheet key={chosen.id} title={t(...chosen.name)} onClose={onClose}
        left={<button className="nav-btn" onClick={() => setChosen(undefined)}>{t('Atrás', 'Back')}</button>}
        footer={<button className="btn primary block" onClick={add}>{t('Añadir programa', 'Add program')}</button>}>
        <p className="muted" style={{ margin: 0 }}>{t(...chosen.description)}</p>
        {!chosen.equipment && (
          <label className="list-row card-row">
            <span className="grow">{t('Material', 'Equipment')}</span>
            <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as EquipmentProfile)}>
              {equipmentProfiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        )}
        {/* Los programas abiertos se recortan al tiempo que tienes; el 5×5 y los circuitos tienen su pauta cerrada. */}
        {!chosen.fixed && (
          <div className="card">
            <span className="small muted">{t('Minutos por sesión', 'Minutes per session')}</span>
            <Segmented value={String(minutes)} options={[30, 45, 60, 75, 90].map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => setMinutes(Number(v))} />
          </div>
        )}
        {program.days.map((d, i) => (
          <Card key={i} title={`${d.name} · ~${programDayMinutes(d)} min`}>
            {d.exercises.map((g) => (
              <div key={g.exercise.id} className="row" style={{ gap: 10 }}>
                <Thumb exerciseId={g.exercise.id} size={40} />
                <span className="grow clamp-2">{g.exercise.name}</span>
                <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{targetText({ ...g, tracking: defaultTracking(g.exercise), targetSeconds: PROGRAM_TARGET_SECONDS })}</span>
              </div>
            ))}
          </Card>
        ))}
        <p className="small muted" style={{ margin: 0 }}>{t('Cuando completas todas las repeticiones, la app te sube el peso la sesión siguiente. Puedes cambiar cualquier ejercicio después, como en cualquier rutina.', 'When you complete every rep, the app raises the weight for you next session. You can swap any exercise later, like in any routine.')}</p>
      </Sheet>
    )
  }

  return (
    <Sheet key="library" title={t('Biblioteca de programas', 'Program library')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      {/* Por nivel, cada uno con su cabecera: antes el PPL de 6 días (avanzado) iba en la lista general, encima de
          la cabecera «Avanzado» que solo tenía el 5/3/1. */}
      {levels.map(({ id: level }) => {
        const list = LIBRARY.filter((p) => p.level === level)
        if (!list.length && !(level === 'advanced' && on531)) return null
        return (
          <Fragment key={level}>
            <h2 className="list-header">{levelInfo(level).label}</h2>
            <div className="list">
              {list.map((p) => (
                <button key={p.id} className="list-row" onClick={() => setChosen(p)}>
                  <span className="grow" style={{ textAlign: 'left' }}>
                    <span className="bold" style={{ display: 'block' }}>{t(...p.name)}</span>
                    <span className="small muted clamp-2">{p.equipment ? `${equipmentInfo(p.equipment).label} · ` : ''}{t(...p.description)}</span>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </button>
              ))}
              {level === 'advanced' && on531 && (
                <button className="list-row" onClick={on531}>
                  <span className="grow" style={{ textAlign: 'left' }}>
                    <span className="bold" style={{ display: 'block' }}>{t('5/3/1 de Jim Wendler · 4 días', 'Jim Wendler\'s 5/3/1 · 4 days')}</span>
                    <span className="small muted clamp-2">{t('Fuerza en los cuatro básicos con ciclos de 4 semanas. Necesitas saber tu 1RM.', 'Strength on the four main lifts in 4-week cycles. You need to know your 1RM.')}</span>
                  </span>
                  <ChevronRight size={18} className="muted" />
                </button>
              )}
            </div>
          </Fragment>
        )
      })}
    </Sheet>
  )
}

/** Crea el programa 5/3/1 (4 días) a partir del 1RM de los cuatro básicos. */
export function Program531Sheet({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog()
  const data = useData()
  const unit = data.settings.unit
  const best = useMemo(() => new Map(records(finishedSessions(data)).map((r) => [r.exerciseId, r.e1rm])), [data])
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(LIFTS_531.map((l) => {
    const e = best.get(l.id)
    return [l.id, e ? editable(Math.round(fromKg(e, unit))) : '']
  })))
  const oneRms = LIFTS_531.map((l) => toKg(parseDecimal(values[l.id] ?? '') ?? 0, unit))
  const ready = oneRms.every((v) => v > 0)

  const create = () => {
    const ex = (id: string) => catalog.get(id)!
    saveProgram({
      name: '5/3/1',
      summary: t('4 días · método 5/3/1 de Jim Wendler · TM al 90 % del 1RM, sube al acabar cada ciclo de 4 semanas',
        '4 days · Jim Wendler\'s 5/3/1 · TM at 90% of 1RM, goes up after each 4-week cycle'),
      days: LIFTS_531.map((l, i) => ({
        name: `${t(`Día ${i + 1}`, `Day ${i + 1}`)} · ${t(l.day[0], l.day[1])}`,
        exercises: [
          { exercise: ex(l.id), sets: 3, repsMin: 1, repsMax: 5, rest: 180, progression: 'wave531' as const, trainingMax: trainingMaxFrom(oneRms[i], unit) },
          ...l.accessories.map(([id, sets, repsMin, repsMax]) => ({ exercise: ex(id), sets, repsMin, repsMax, rest: 90 })),
        ],
      })),
    })
    onClose()
    navigate('routines')
  }

  return (
    <Sheet title={t('Programa 5/3/1', '5/3/1 program')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={<button className="btn primary block" disabled={!ready} onClick={create}>{t('Crear programa', 'Create program')}</button>}>
      <p className="muted" style={{ margin: 0 }}>
        {t('Cuatro días por semana, uno por básico. Cada semana cambian los porcentajes (5, 3 y 5/3/1 repeticiones, y una de descarga) y la última serie es «todas las que puedas». El peso sale de tu máximo de entrenamiento (TM), el 90 % de tu 1RM, que sube solo al acabar cada ciclo.',
          'Four days a week, one per main lift. The percentages change every week (5, 3 and 5/3/1 reps, plus a deload week) and the last set is "as many as you can". Weights come from your training max (TM), 90% of your 1RM, which goes up automatically after each cycle.')}
      </p>
      <div className="list-header">{t('Tu 1RM en cada básico', 'Your 1RM on each lift')}</div>
      <div className="list">
        {LIFTS_531.map((l, i) => (
          <label key={l.id} className="list-row">
            <Thumb exerciseId={l.id} size={40} />
            <span className="grow">
              <span className="bold" style={{ display: 'block', fontSize: 15 }}>{catalog.get(l.id)?.name}</span>
              <span className="small muted">{oneRms[i] > 0 ? `TM ${weight(trainingMaxFrom(oneRms[i], unit), unit)}` : t('Escribe tu 1RM', 'Enter your 1RM')}</span>
            </span>
            <input inputMode="decimal" placeholder="0" style={{ textAlign: 'right', width: 80, fontSize: 17 }} value={values[l.id] ?? ''}
              aria-label={`1RM ${catalog.get(l.id)?.name ?? ''}`} onChange={(e) => setValues({ ...values, [l.id]: e.target.value })} />
            <span className="muted">{unit}</span>
          </label>
        ))}
      </div>
      <p className="list-footer" style={{ margin: 0 }}>
        {t('Si no sabes tu 1RM, usa la calculadora de 1RM de Perfil con una serie reciente. Rellenamos los que ya tienes registrados.',
          'If you do not know your 1RM, use the 1RM calculator in Profile with a recent set. The ones you have logged are filled in for you.')}
      </p>
    </Sheet>
  )
}
