import { BlockCard } from '../components/Block'
import { ArrowLeftRight, ClipboardList, Clock, Dumbbell, Ellipsis, Layers, Link2, Play, Plus, RotateCcw, Trash2, Unlink, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActionSheet, Card, Empty, LargeTitle, NavBar, Segmented, Sheet, Stepper, Thumb, Tile, useCatalog, useToast } from '../components/ui'
import type { Exercise } from '../lib/catalog'
import { clock, day, editable, fromKg, increment, parseDecimal, relative, rest, restOptions, toKg, uid, weight } from '../lib/format'
import { LIFTS_531, trainingMaxFrom } from '../lib/progression'
import { equipmentProfiles, generate, goals, levels, type GeneratedProgram, type GeneratorConfig } from '../lib/generator'
import { muscleSummary } from '../lib/labels'
import { back, navigate } from '../lib/router'
import { finishedSessions, lastPerformed, routineMinutes, routineSets, update, updateSettings, useData, withUndo, type AppData, type Progression, type Routine } from '../lib/store'
import { records } from '../lib/stats'
import { groupKind, groupSlots, linkWithNext, normalizeGroups, unlink } from '../lib/groups'
import { encodePlan, extractCode, planLink, shareLink } from '../lib/share'
import { defaultTargetSeconds, defaultTracking, targetText, trackingOf, trackingOptions, type Tracking } from '../lib/tracking'
import { startEmpty, startRoutine } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { ExercisePicker, ExerciseSheet } from './Exercises'
import { QrSheet } from '../components/Qr'
import { plural, t } from '../lib/i18n'

/** Comparte rutinas por enlace (hoja del sistema en el móvil; si no hay, copia al portapapeles). */
async function sharePlan(routines: Routine[], title: string, programName: string | undefined, showToast: (t: string) => void) {
  try {
    const result = await shareLink(title, planLink(await encodePlan(routines, programName)))
    if (result === 'copied') showToast(t('Enlace copiado: pégalo en WhatsApp', 'Link copied: paste it in WhatsApp'))
  } catch {
    showToast(t('No se pudo compartir', 'Could not share'))
  }
}

/** Código QR de un enlace de rutinas: devuelve la hoja (o nada) y la función que la abre. */
function useQr(showToast: (t: string) => void) {
  const [qr, setQr] = useState<{ title: string; url: string; routines: Routine[]; programName?: string }>()
  const open = async (routines: Routine[], title: string, programName?: string) => {
    try {
      setQr({ title, routines, programName, url: planLink(await encodePlan(routines, programName)) })
    } catch {
      showToast(t('No se pudo crear el código', 'Could not create the code'))
    }
  }
  const sheet = qr && (
    <QrSheet title={qr.title} url={qr.url} onClose={() => setQr(undefined)}
      onShare={() => void sharePlan(qr.routines, qr.title, qr.programName, showToast)} />
  )
  return [sheet, open] as const
}

const timeTargets = [15, 20, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1200, 1800]


export function RoutinesScreen() {
  const data = useData()
  const [showGenerator, setShowGenerator] = useState(false)
  const [show531, setShow531] = useState(false)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState<string>()
  const [programMenu, setProgramMenu] = useState<string>()
  const [toast, showToast] = useToast()
  const [qrSheet, openQr] = useQr(showToast)
  const active = data.settings.activeProgram

  const importFromLink = () => {
    const text = prompt(t('Pega el enlace de la rutina que te han compartido:', 'Paste the routine link you were sent:'))
    if (!text) return
    const code = extractCode(text)
    if (!code) return showToast(t('Eso no parece un enlace de rutina', 'That does not look like a routine link'))
    navigate('import', code)
  }

  const groups = new Map<string, Routine[]>()
  for (const r of [...data.routines].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)) {
    const key = r.programName ?? ''
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const keys = [...groups.keys()].sort((a, b) => (a === active ? -1 : b === active ? 1 : a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))

  const createRoutine = () => {
    const id = uid()
    update((d) => {
      d.routines.push({ id, name: t('Nueva rutina', 'New routine'), notes: '', order: d.routines.length, createdAt: Date.now(), exercises: [] })
    })
    setEditing(id)
  }

  return (
    <div className="screen">
      <LargeTitle title={t('Rutinas', 'Routines')} actions={<button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('Nueva', 'New')}><Plus size={22} /></button>} />
      {data.routines.length === 0 ? (
        <Empty icon={ClipboardList} title={t('Aún no tienes rutinas', 'No routines yet')}
          message={t('Genera un programa según tu objetivo o crea tu propia rutina desde cero.', 'Generate a program for your goal or build your own routine from scratch.')}
          action={<button className="btn primary" onClick={() => setShowGenerator(true)}><WandSparkles size={19} /> {t('Generar programa', 'Generate program')}</button>} />
      ) : (
        <>
        <BlockCard />
        {keys.map((key) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="list-header">
              <span className="grow clamp-1">{key || t('Mis rutinas', 'My routines')}</span>
              {key && key === active && <span className="tag accent">{t('ACTIVO', 'ACTIVE')}</span>}
              {key && <button className="nav-btn" style={{ padding: 0, minHeight: 0 }} onClick={() => setProgramMenu(key)} aria-label={t('Opciones del programa', 'Program options')}><Ellipsis size={20} /></button>}
            </div>
            <div className="list">
              {groups.get(key)!.map((r) => <RoutineRow key={r.id} routine={r} data={data} />)}
            </div>
          </div>
        ))}
        </>
      )}

      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: t('Generar programa', 'Generate program'), onSelect: () => setShowGenerator(true) },
          { label: t('Programa 5/3/1 (fuerza)', '5/3/1 program (strength)'), onSelect: () => setShow531(true) },
          { label: t('Nueva rutina vacía', 'New empty routine'), onSelect: createRoutine },
          { label: t('Importar desde enlace', 'Import from link'), onSelect: importFromLink },
          { label: t('Entrenamiento libre', 'Free workout'), onSelect: startEmpty },
        ]} />
      )}
      {programMenu && (
        <ActionSheet title={programMenu} onClose={() => setProgramMenu(undefined)} options={[
          { label: t('Compartir programa', 'Share program'), onSelect: () => void sharePlan(groups.get(programMenu) ?? [], programMenu, programMenu, showToast) },
          { label: t('Mostrar código QR', 'Show QR code'), onSelect: () => void openQr(groups.get(programMenu) ?? [], programMenu, programMenu) },
          ...(programMenu !== active ? [{ label: t('Marcar como activo', 'Set as active'), onSelect: () => updateSettings({ activeProgram: programMenu }) }] : []),
          {
            label: t('Eliminar programa', 'Delete program'), destructive: true, onSelect: () => {
              // Se borran sus rutinas (el historial se conserva) y se puede deshacer unos segundos.
              withUndo(t('Programa eliminado', 'Program deleted'), () => update((d) => {
                d.routines = d.routines.filter((r) => r.programName !== programMenu)
                if (d.settings.activeProgram === programMenu) d.settings.activeProgram = ''
              }))
            },
          },
        ]} />
      )}
      {showGenerator && <GeneratorSheet onClose={() => setShowGenerator(false)} />}
      {show531 && <Program531Sheet onClose={() => setShow531(false)} />}
      {editing && <RoutineEditor id={editing} onClose={() => setEditing(undefined)} />}
      {qrSheet}
      {toast}
    </div>
  )
}

function RoutineRow({ routine, data }: { routine: Routine; data: AppData }) {
  const last = lastPerformed(data, routine.id)
  return (
    <button className="list-row" onClick={() => navigate('routines', routine.id)}>
      <span className="grow">
        <span className="bold" style={{ display: 'block' }}>{routine.name}</span>
        <span className="small muted clamp-1">{routine.exercises.length ? muscleSummary(routine) : t('Sin ejercicios', 'No exercises')}</span>
        <span className="small muted row" style={{ gap: 12, marginTop: 4 }}>
          <span className="row" style={{ gap: 4 }}><Dumbbell size={13} /> {routine.exercises.length}</span>
          <span className="row" style={{ gap: 4 }}><Layers size={13} /> {plural(routineSets(routine), ['serie', 'series'], ['set', 'sets'])}</span>
          <span className="row" style={{ gap: 4 }}><Clock size={13} /> ~{routineMinutes(routine)} min</span>
          {last && <span style={{ marginLeft: 'auto' }}>{relative(last)}</span>}
        </span>
      </span>
    </button>
  )
}

export function RoutineDetailScreen({ id }: { id: string }) {
  const data = useData()
  const routine = data.routines.find((r) => r.id === id)
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)
  const [detail, setDetail] = useState<string>()
  const [toast, showToast] = useToast()
  const [qrSheet, openQr] = useQr(showToast)
  if (!routine) return <><NavBar showBack /><div className="screen with-nav"><Empty icon={ClipboardList} title={t('Rutina eliminada', 'Routine deleted')} message="" /></div></>
  const last = lastPerformed(data, routine.id)
  const detailSlots = groupSlots(routine.exercises)

  const duplicate = () => {
    update((d) => {
      d.routines.push({ ...structuredClone(routine), id: uid(), name: `${routine.name} (${t('copia', 'copy')})`, createdAt: Date.now(), order: routine.order + 1 })
    })
  }

  return (
    <>
      <NavBar showBack title={routine.name} right={<button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('Opciones', 'Options')}><Ellipsis size={20} /></button>} />
      <div className="screen with-nav">
        <div className="grid-3">
          <Tile icon={Dumbbell} value={routine.exercises.length} label={t('Ejercicios', 'Exercises')} />
          <Tile icon={Layers} value={routineSets(routine)} label={t('Series', 'Sets')} />
          <Tile icon={Clock} value={`~${routineMinutes(routine)}′`} label={t('Duración', 'Duration')} />
        </div>
        {routine.notes && <p className="small muted" style={{ margin: 0 }}>{routine.notes}</p>}
        <div className="list-header">{t('Ejercicios', 'Exercises')}</div>
        <div className="list">
          {routine.exercises.length === 0 && (
            <button className="list-row accent" onClick={() => setEditing(true)}><Plus size={20} /> {t('Añadir ejercicios', 'Add exercises')}</button>
          )}
          {routine.exercises.map((e, i) => {
            const slot = detailSlots[i]
            return (
              <button key={i} className="list-row" onClick={() => setDetail(e.exerciseId)}
                style={slot.letter ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}>
                <Thumb exerciseId={e.exerciseId} size={50} />
                <span className="grow">
                  <span className="bold clamp-2" style={{ fontSize: 15 }}>
                    {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
                    {e.name}
                  </span>
                  <span className="small muted">
                    {e.progression === 'wave531' ? `5/3/1${e.trainingMax ? ` · TM ${weight(e.trainingMax, data.settings.unit)}` : ''}` : targetText(e)} · {slot.letter && !slot.last ? t('sin descanso', 'no rest') : `${t('descanso', 'rest')} ${rest(e.rest)}`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {last && <p className="small muted" style={{ margin: 0 }}>{t('Último entrenamiento', 'Last workout')}: {day(last)}</p>}
        <div className="bottom-action">
          <button className="btn primary block" disabled={!routine.exercises.length} onClick={() => startRoutine(routine)}>
            <Play size={19} fill="currentColor" /> {t('Empezar entrenamiento', 'Start workout')}
          </button>
        </div>
      </div>
      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { label: t('Editar', 'Edit'), onSelect: () => setEditing(true) },
          { label: t('Compartir rutina', 'Share routine'), onSelect: () => void sharePlan([routine], routine.name, undefined, showToast) },
          { label: t('Mostrar código QR', 'Show QR code'), onSelect: () => void openQr([routine], routine.name) },
          { label: t('Duplicar', 'Duplicate'), onSelect: duplicate },
          {
            label: t('Eliminar', 'Delete'), destructive: true, onSelect: () => {
              withUndo(t('Rutina eliminada', 'Routine deleted'), () => update((d) => { d.routines = d.routines.filter((r) => r.id !== id) }))
              back()
            },
          },
        ]} />
      )}
      {editing && <RoutineEditor id={routine.id} onClose={() => setEditing(false)} />}
      {detail && <ExerciseSheet exerciseId={detail} onClose={() => setDetail(undefined)} />}
      {qrSheet}
      {toast}
    </>
  )
}

export function RoutineEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const data = useData()
  const routine = data.routines.find((r) => r.id === id)
  const [picker, setPicker] = useState(false)
  const [replacing, setReplacing] = useState<number>()
  if (!routine) return null

  const edit = (fn: (r: Routine) => void) => update((d) => {
    const r = d.routines.find((x) => x.id === id)
    if (r) fn(r)
  })
  const planned = (e: Exercise, base?: { sets: number; repsMin: number; repsMax: number; rest: number }) => {
    const tracking = defaultTracking(e)
    return {
      exerciseId: e.id, name: e.name, muscle: e.muscle,
      sets: base?.sets ?? 3, repsMin: base?.repsMin ?? 8, repsMax: base?.repsMax ?? 12, rest: base?.rest ?? data.settings.defaultRest,
      tracking, ...(tracking === 'time' ? { targetSeconds: defaultTargetSeconds } : {}),
    }
  }
  const add = (list: Exercise[]) => edit((r) => {
    r.exercises.push(...list.map((e) => planned(e)))
  })
  const setTracking = (i: number, t: Tracking) => edit((r) => {
    r.exercises[i].tracking = t
    if (t === 'time') r.exercises[i].targetSeconds ??= defaultTargetSeconds
  })
  // Al elegir 5/3/1 se propone como TM el 90 % del mejor 1RM estimado del ejercicio.
  const setProgression = (i: number, p: Progression | undefined) => edit((r) => {
    const ex = r.exercises[i]
    ex.progression = p
    if (p === 'wave531' && !ex.trainingMax) {
      const best = records(finishedSessions(data)).find((x) => x.exerciseId === ex.exerciseId)?.e1rm
      if (best) ex.trainingMax = toKg(Math.round(fromKg(best * 0.9, data.settings.unit) / increment(data.settings.unit)) * increment(data.settings.unit), data.settings.unit)
      ex.tmSince = Date.now()
    }
  })
  const move = (i: number, dir: -1 | 1) => edit((r) => {
    const j = i + dir
    ;[r.exercises[i], r.exercises[j]] = [r.exercises[j], r.exercises[i]]
    normalizeGroups(r.exercises)
  })
  const slots = groupSlots(routine.exercises)

  return (
    <Sheet title={t('Editar rutina', 'Edit routine')} onClose={onClose}
      right={<button className="nav-btn bold" onClick={() => { if (!routine.name.trim()) edit((r) => { r.name = t('Rutina', 'Routine') }); onClose() }}>{t('Listo', 'Done')}</button>}>
      <div className="list">
        <div className="list-row"><input className="grow" style={{ fontSize: 17 }} value={routine.name} placeholder={t('Nombre de la rutina', 'Routine name')} onChange={(e) => edit((r) => { r.name = e.target.value })} /></div>
        <div className="list-row"><textarea className="grow" rows={2} value={routine.notes} placeholder={t('Notas (opcional)', 'Notes (optional)')} onChange={(e) => edit((r) => { r.notes = e.target.value })} /></div>
      </div>
      <div className="list-header">{t('Ejercicios', 'Exercises')}</div>
      <div className="list">
        {routine.exercises.map((e, i) => (
          <div key={i} className="list-row" style={{
            flexDirection: 'column', alignItems: 'stretch', gap: 10,
            ...(slots[i].letter ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : {}),
          }}>
            {slots[i].letter && slots[i].first && (
              <span className="group-head"><Link2 size={15} /> {groupKind(slots[i].size)} {slots[i].letter}: {t('sin descanso entre ejercicios', 'no rest between exercises')}</span>
            )}
            <div className="row">
              <Thumb exerciseId={e.exerciseId} size={40} />
              <span className="grow bold clamp-2" style={{ fontSize: 15 }}>
                {slots[i].letter && <span className="group-badge">{slots[i].letter}{slots[i].position}</span>}
                {e.name}
              </span>
            </div>
            <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Stepper label={t('Series', 'Sets')} value={e.sets} min={1} max={10} onChange={(v) => edit((r) => { r.exercises[i].sets = v })} />
              {trackingOf(e) === 'weight_reps' && (
                <>
                  <Stepper label={t('Reps mín.', 'Min reps')} value={e.repsMin} min={1} max={50} onChange={(v) => edit((r) => { r.exercises[i].repsMin = v; if (r.exercises[i].repsMax < v) r.exercises[i].repsMax = v })} />
                  <Stepper label={t('Reps máx.', 'Max reps')} value={e.repsMax} min={1} max={50} onChange={(v) => edit((r) => { r.exercises[i].repsMax = v; if (r.exercises[i].repsMin > v) r.exercises[i].repsMin = v })} />
                </>
              )}
              {trackingOf(e) === 'time' && (
                <div className="stepper">
                  <span className="tiny muted">{t('Tiempo', 'Time')}</span>
                  <select className="field" style={{ padding: '5px 10px', fontSize: 15, fontWeight: 700 }} value={e.targetSeconds ?? defaultTargetSeconds}
                    onChange={(ev) => edit((r) => { r.exercises[i].targetSeconds = Number(ev.target.value) })}>
                    {timeTargets.map((o) => <option key={o} value={o}>{clock(o)}</option>)}
                  </select>
                </div>
              )}
              {slots[i].letter && !slots[i].last ? (
                <div className="stepper">
                  <span className="tiny muted">{t('Descanso', 'Rest')}</span>
                  <span className="small muted" style={{ padding: '6px 0' }}>{t('Ninguno', 'None')}</span>
                </div>
              ) : (
                <div className="stepper">
                  <span className="tiny muted">{slots[i].letter ? t('Tras la ronda', 'After round') : t('Descanso', 'Rest')}</span>
                  <select className="field" style={{ padding: '5px 10px', fontSize: 15, fontWeight: 700 }} value={e.rest} onChange={(ev) => edit((r) => { r.exercises[i].rest = Number(ev.target.value) })}>
                    {restOptions.map((o) => <option key={o} value={o}>{rest(o)}</option>)}
                  </select>
                </div>
              )}
              {trackingOf(e) === 'weight_reps' && (
                <div className="stepper">
                  <span className="tiny muted">{t('Progresión', 'Progression')}</span>
                  <select className="field" style={{ padding: '5px 10px', fontSize: 15, fontWeight: 700 }} value={e.progression ?? ''}
                    onChange={(ev) => setProgression(i, (ev.target.value || undefined) as Progression | undefined)}>
                    {progressionOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              )}
              {trackingOf(e) === 'weight_reps' && e.progression === 'wave531' && (
                <div className="stepper">
                  <span className="tiny muted">{t('Máx. de entreno (TM)', 'Training max (TM)')}</span>
                  <input className="field" inputMode="decimal" style={{ padding: '5px 10px', fontSize: 15, fontWeight: 700, width: 90 }}
                    defaultValue={e.trainingMax ? editable(fromKg(e.trainingMax, data.settings.unit)) : ''} placeholder={data.settings.unit}
                    aria-label={t('Máximo de entrenamiento', 'Training max')}
                    onChange={(ev) => {
                      const v = parseDecimal(ev.target.value)
                      edit((r) => { r.exercises[i].trainingMax = v && v > 0 ? toKg(v, data.settings.unit) : undefined; r.exercises[i].tmSince = Date.now() })
                    }} />
                </div>
              )}
              <div className="stepper">
                <span className="tiny muted">{t('Registro', 'Logging')}</span>
                <select className="field" style={{ padding: '5px 10px', fontSize: 15, fontWeight: 700 }} value={trackingOf(e)}
                  onChange={(ev) => setTracking(i, ev.target.value as Tracking)}>
                  {trackingOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
              <button className="nav-btn" style={{ fontSize: 15 }} onClick={() => setReplacing(i)} aria-label={t('Sustituir', 'Replace')}><ArrowLeftRight size={17} /> {t('Sustituir', 'Replace')}</button>
              {i < routine.exercises.length - 1 && !(slots[i].letter && !slots[i].last) && (
                <button className="nav-btn" style={{ fontSize: 15 }} onClick={() => edit((r) => linkWithNext(r.exercises, i))} aria-label={t('Unir con el siguiente', 'Link with the next one')}>
                  <Link2 size={17} /> {t('Unir', 'Link')}
                </button>
              )}
              {slots[i].letter && (
                <button className="nav-btn" style={{ fontSize: 15 }} onClick={() => edit((r) => unlink(r.exercises, i))} aria-label={t('Separar del grupo', 'Unlink from group')}>
                  <Unlink size={17} /> {t('Separar', 'Unlink')}
                </button>
              )}
              <span className="grow" />
              <button className="nav-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('Subir', 'Move up')}>↑</button>
              <button className="nav-btn" disabled={i === routine.exercises.length - 1} onClick={() => move(i, 1)} aria-label={t('Bajar', 'Move down')}>↓</button>
              <button className="nav-btn" style={{ color: 'var(--red-text)' }} onClick={() => withUndo(t(`Quitado: ${e.name}`, `Removed: ${e.name}`), () => edit((r) => { r.exercises.splice(i, 1); normalizeGroups(r.exercises) }))} aria-label={t('Quitar', 'Remove')}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        <button className="list-row accent" onClick={() => setPicker(true)}><Plus size={20} /> {t('Añadir ejercicios', 'Add exercises')}</button>
      </div>
      {picker && <ExercisePicker onDone={add} onClose={() => setPicker(false)} />}
      {replacing !== undefined && routine.exercises[replacing] && (
        <AlternativesSheet current={routine.exercises[replacing]} onClose={() => setReplacing(undefined)}
          onPick={(picked) => edit((r) => { r.exercises[replacing] = { ...planned(picked, r.exercises[replacing]), groupId: r.exercises[replacing].groupId } })} />
      )}
    </Sheet>
  )
}

export function saveProgram(program: GeneratedProgram) {
  update((d) => {
    program.days.forEach((dayPlan, index) => {
      d.routines.push({
        id: uid(),
        name: dayPlan.name,
        notes: program.summary,
        programName: program.name,
        order: index,
        createdAt: Date.now(),
        exercises: dayPlan.exercises.map((g) => {
          const tracking = defaultTracking(g.exercise)
          return {
            exerciseId: g.exercise.id, name: g.exercise.name, muscle: g.exercise.muscle,
            sets: g.sets, repsMin: g.repsMin, repsMax: g.repsMax, rest: g.rest, tracking,
            ...(tracking === 'time' ? { targetSeconds: 60 } : {}),
            // Los programas generados suben el peso solos (doble progresión salvo que se indique otra).
            ...(tracking === 'weight_reps' ? { progression: g.progression ?? 'double' } : {}),
            ...(g.trainingMax ? { trainingMax: g.trainingMax, tmSince: Date.now() } : {}),
          }
        }),
      })
    })
    d.settings.activeProgram = program.name
  })
}

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
          <button key={p.id} className="list-row" onClick={() => onChange({ ...config, equipment: p.id })}>
            <span className="grow">{p.label}</span>
            {config.equipment === p.id && <span style={{ color: 'var(--accent-text)', fontWeight: 800 }}>✓</span>}
          </button>
        ))}
      </div>
    </>
  )
}

export function ProgramPreview({ program }: { program: GeneratedProgram }) {
  return (
    <>
      <Card>
        <strong style={{ fontSize: 19 }}>{program.name}</strong>
        <span className="small muted">{program.summary}</span>
      </Card>
      {program.days.map((d) => (
        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="list-header">{d.name}</div>
          <div className="list">
            {d.exercises.map((g) => (
              <div key={g.exercise.id} className="list-row">
                <Thumb exerciseId={g.exercise.id} size={44} />
                <span className="grow">
                  <span className="bold clamp-2" style={{ fontSize: 15 }}>{g.exercise.name}</span>
                  <span className="small muted">{targetText({ ...g, tracking: defaultTracking(g.exercise), targetSeconds: 60 })} · {rest(g.rest)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function GeneratorSheet({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const [config, setConfig] = useState<GeneratorConfig>({
    goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment,
  })
  const [program, setProgram] = useState<GeneratedProgram>()
  const [variation, setVariation] = useState(0)

  if (program) {
    return (
      <Sheet title={t('Vista previa', 'Preview')} onClose={onClose}
        left={<button className="nav-btn" onClick={() => setProgram(undefined)}>{t('Atrás', 'Back')}</button>}
        right={<button className="nav-btn" onClick={() => { setVariation(variation + 1); setProgram(generate(config, catalog, variation + 1)) }}><RotateCcw size={18} /> {t('Otra', 'Another')}</button>}
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

const progressionOptions = (): { id: Progression | ''; label: string }[] => [
  { id: '', label: t('Manual', 'Manual') },
  { id: 'double', label: t('Doble progresión', 'Double progression') },
  { id: 'linear', label: t('Lineal', 'Linear') },
  { id: 'wave531', label: '5/3/1' },
]

/** Crea el programa 5/3/1 (4 días) a partir del 1RM de los cuatro básicos. */
function Program531Sheet({ onClose }: { onClose: () => void }) {
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
          'Four days a week, one per main lift. The percentages change every week (5, 3 and 5/3/1 reps, plus a deload week) and the last set is "as many as you can". Weights come from your training max (TM), 90% of your 1RM, which goes up by itself after each cycle.')}
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
