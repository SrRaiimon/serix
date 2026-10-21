import { BlockCard } from '../components/Block'
import { weekDone } from '../lib/schedule'
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronDown, ChevronRight, ClipboardList, Library, Clock, Dumbbell, Ellipsis, FilePlus2, Flame, Link2, Minus, Pencil, Play, Plus, Timer, Trash2, Unlink, WandSparkles, Link as LinkIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionSheet, Card, Empty, LargeTitle, NavBar, Sheet, Stepper, StatBand, Thumb, useCatalog, useToast } from '../components/ui'
import type { Exercise } from '../lib/catalog'
import { clock, day, editable, fromKg, increment, parseDecimal, relative, rest, restOptions, toKg, tons, uid, weight } from '../lib/format'
import { BARBELL_EQUIPMENT } from '../lib/warmup'
import { GeneratorSheet, LibrarySheet, Program531Sheet } from './RoutinesPrograms'
import { muscleSummary } from '../lib/labels'
import { back, navigate } from '../lib/router'
import { finishedSessions, lastPerformed, update, updateSettings, useData, withUndo, type AppData, type Progression, type Routine, type SessionExercise, type SetEntry } from '../lib/store'
import { e1rm, records, sessionDuration, sessionVolume, workingSets } from '../lib/stats'
import { addsLoad, bodyweightText, liftText } from '../lib/bodyweight'
import { groupKind, groupSlots, linkWithNext, normalizeGroups, unlink } from '../lib/groups'
import { encodePlan, extractCode, planLink, shareLink } from '../lib/share'
import { defaultTargetSeconds, defaultTracking, targetText, trackingOf, trackingOptions, type Tracking } from '../lib/tracking'
import { nextRoutine, previewRoutine, routineFacts, startEmpty, startRoutine, weekRoutine } from '../lib/workout'
import { AlternativesSheet } from './Alternatives'
import { ExercisePicker, ExerciseSheet } from './Exercises'
import { QrSheet } from '../components/Qr'
import { RoutineMuscleMap } from '../components/MuscleMap'
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


export function RoutinesScreen({ generate = false }: { generate?: boolean }) {
  const data = useData()
  const [showGenerator, setShowGenerator] = useState(generate)
  // También si ya estabas en Rutinas (la pantalla no se vuelve a montar al cambiar a #/routines/generate).
  useEffect(() => { if (generate) setShowGenerator(true) }, [generate])
  const [show531, setShow531] = useState(false)
  const [library, setLibrary] = useState(false)
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
  const next = data.routines.length > 1 ? nextRoutine(data) : undefined
  // El bloque arriba solo si ya está en marcha o programado; si no, es una oferta y va al final.
  const blockOn = !!data.settings.block
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
      <LargeTitle title={t('Rutinas', 'Routines')} actions={<>
        <button className="btn secondary btn-sm" onClick={() => setMenu(true)}><Plus size={17} aria-hidden="true" /> {t('Nueva', 'New')}</button>
      </>} />
      {data.routines.length === 0 ? (
        <Empty icon={ClipboardList} title={t('Aún no tienes rutinas', 'No routines yet')}
          message={t('Genera un programa según tu objetivo o crea tu propia rutina desde cero.', 'Generate a program for your goal or build your own routine from scratch.')}
          action={<div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => setShowGenerator(true)}><WandSparkles size={19} /> {t('Generar programa', 'Generate program')}</button>
            <button className="btn secondary" onClick={() => setLibrary(true)}><Library size={19} /> {t('Biblioteca', 'Library')}</button>
          </div>} />
      ) : (
        <>
        {/* En modo sencillo no se ofrece, pero si ya hay un bloque se muestra para poder verlo y terminarlo. */}
        {blockOn && <BlockCard />}
        {keys.map((key) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="list-header">
              <span className="grow clamp-1">{key || t('Mis rutinas', 'My routines')}</span>
              {key && key === active && <span className="tag accent">{t('ACTIVO', 'ACTIVE')}</span>}
              {key && <button className="nav-btn" style={{ padding: 0, minHeight: 0, zIndex: 1 }} onClick={() => setProgramMenu(key)} aria-label={t('Opciones del programa', 'Program options')}><Ellipsis size={20} /></button>}
            </div>
            <div className="list">
              {groups.get(key)!.map((r) => <RoutineRow key={r.id} routine={r} data={data} next={r.id === next?.id} />)}
            </div>
          </div>
        ))}
        {!blockOn && !data.settings.simpleMode && <BlockCard />}
        </>
      )}
      <div className="list">
        <button className="list-row" onClick={() => navigate('exercises')}>
          <Dumbbell size={20} aria-hidden="true" />
          <span className="grow">
            <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t('Ejercicios', 'Exercises')}</span>
            <span className="small muted">{t('Todos los ejercicios, con cómo se hacen y qué músculos trabajan', 'Every exercise, how to do it and the muscles it works')}</span>
          </span>
          <ChevronRight size={18} className="muted" aria-hidden="true" />
        </button>
      </div>

      {menu && (
        <ActionSheet onClose={() => setMenu(false)} options={[
          { section: t('Programas', 'Programs'), icon: Library, label: t('Biblioteca de programas', 'Program library'), hint: t('Programas probados, por nivel y material', 'Proven programs, by level and equipment'), onSelect: () => setLibrary(true) },
          { section: t('Programas', 'Programs'), icon: WandSparkles, label: t('Generar programa', 'Generate program'), hint: t('A medida: objetivo, días y minutos', 'Tailored: goal, days and minutes'), onSelect: () => setShowGenerator(true) },
          { section: t('Rutina', 'Routine'), icon: FilePlus2, label: t('Nueva rutina vacía', 'New empty routine'), hint: t('Eliges tú los ejercicios', 'You pick the exercises'), onSelect: createRoutine },
          { section: t('Rutina', 'Routine'), icon: LinkIcon, label: t('Importar desde enlace', 'Import from link'), hint: t('La que te ha pasado un amigo', 'One a friend sent you'), onSelect: importFromLink },
          { section: t('Sin rutina', 'No routine'), icon: Timer, label: t('Entrenamiento libre', 'Free workout'), hint: t('Empiezas ya y añades ejercicios sobre la marcha', 'Start now and add exercises as you go'), onSelect: startEmpty },
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
      {showGenerator && <GeneratorSheet onClose={() => { setShowGenerator(false); if (generate) navigate('routines') }} />}
      {show531 && <Program531Sheet onClose={() => setShow531(false)} />}
      {library && <LibrarySheet onClose={() => setLibrary(false)} on531={data.settings.simpleMode ? undefined : () => { setLibrary(false); setShow531(true) }} />}
      {editing && <RoutineEditor id={editing} onClose={() => setEditing(undefined)} />}
      {qrSheet}
      {toast}
    </div>
  )
}

/** Fila de rutina: abre la ficha y, a la derecha, empieza directamente. La que toca, marcada. */
function RoutineRow({ routine, data, next }: { routine: Routine; data: AppData; next: boolean }) {
  const last = lastPerformed(data, routine.id)
  const facts = routineFacts(data, routine)
  return (
    <div className={`list-row routine-row ${next ? 'next' : ''}`}>
      <button className="routine-main" onClick={() => navigate('routines', routine.id)}>
        {next && <span className="routine-next">{weekDone(data) ? t('La siguiente', 'Next one') : t('Te toca hoy', 'Up next')}</span>}
        <span className="bold" style={{ display: 'block' }}>{routine.name}</span>
        <span className="small muted clamp-2">{routine.exercises.length ? muscleSummary(routine) : t('Sin ejercicios', 'No exercises')}</span>
        <span className="small routine-meta">
          {plural(routine.exercises.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises'])} · {plural(facts.sets, ['serie', 'series'], ['set', 'sets'])} · ~{facts.minutes} min
        </span>
        <span className="small muted">{last ? t(`Última vez: ${relative(last).toLowerCase()}`, `Last done: ${relative(last).toLowerCase()}`) : t('Sin estrenar', 'Not done yet')}</span>
      </button>
      {routine.exercises.length > 0 && (
        <button className={`icon-btn routine-play ${next ? 'go' : ''}`} onClick={() => startRoutine(routine)} aria-label={t(`Empezar ${routine.name}`, `Start ${routine.name}`)}>
          <Play size={17} fill="currentColor" />
        </button>
      )}
    </div>
  )
}

/** El calentamiento que trae el entreno (en el primer ejercicio pesado): las series de calentamiento previstas. */
function WarmupLine({ planned, unit }: { planned: SessionExercise; unit: AppData['settings']['unit'] }) {
  const ramp = planned.sets.filter((s) => s.warmup)
  if (!ramp.length) return null
  return (
    <span className="warmup-line">
      <Flame size={13} />{t(`Calentamiento (${unit})`, `Warm-up (${unit})`)} <strong>{ramp.map((w) => `${editable(fromKg(w.weight, unit))}×${w.reps}`).join(' · ')}</strong>
    </span>
  )
}

/** Lo que te propondrá la app hoy en un ejercicio: el peso de la serie más pesada y por qué. */
function TodayTarget({ planned, unit }: { planned: SessionExercise; unit: AppData['settings']['unit'] }) {
  if (trackingOf(planned) !== 'weight_reps') return null
  // En las máquinas asistidas el peso es la ayuda: ahí solo cuentan las repeticiones.
  const sets = planned.sets.filter((s) => !s.warmup).map((s) => (planned.assisted ? { ...s, weight: 0 } : s))
  const top = sets.reduce<SetEntry | undefined>((a, b) => (!a || b.weight > a.weight ? b : a), undefined)
  if (!top || (top.weight === 0 && top.reps === 0)) return <span className="ex-last"><span className="tiny muted">{t('Primera vez', 'First time')}</span></span>
  // Las repeticiones de cada serie con ese peso, como las rellena el entreno (10/9/8 si la última vez fueron
  // esas); antes salía solo la primera («× 10») y el entreno proponía otra cosa.
  const same = sets.filter((s) => s.weight === top.weight).map((s) => s.reps)
  const reps = same.every((r) => r === same[0]) ? `${same[0]}` : same.join('/')
  const auto = planned.auto
  const why = planned.deload ? t('Descarga', 'Deload')
    : auto?.kind === 'up' ? `↑ +${weight(auto.to - auto.from, unit)}`
      : auto?.kind === 'reps' ? (auto.harder ? t('Prueba una variante', 'Try a harder variation') : `↑ ${auto.to} reps`)
      : auto?.kind === 'wave' && auto.reset ? t('5/3/1 · TM −10 %', '5/3/1 · TM −10%')
      : auto?.kind === 'wave' ? t(`5/3/1 · sem. ${auto.week}`, `5/3/1 · wk ${auto.week}`)
        : auto?.kind === 'hold' && auto.mode === 'double' ? t(`Meta: ${planned.repsMax} reps`, `Goal: ${planned.repsMax} reps`)
          : auto?.kind === 'hold' ? t('Repite el peso', 'Repeat the weight')
            : t('Igual que antes', 'Same as before')
  return (
    <span className="ex-last">
      {/* Dominadas, fondos…: el peso es el lastre, con su «+» como en el entreno. */}
      {/* El peso arriba y las repeticiones debajo: en una línea («57,5 kg × 10/9/8/7») le quitaba el sitio al nombre. */}
      <strong>{top.weight > 0 ? `${addsLoad(planned) ? '+' : ''}${weight(top.weight, unit)}` : `${reps} reps`}</strong>
      {top.weight > 0 && <span className="tiny">× {reps}</span>}
      <span className={`tiny ${auto?.kind === 'up' || (auto?.kind === 'reps' && !auto.harder) ? 'up' : 'muted'}`}>{why}</span>
    </span>
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
  const catalog = useCatalog()
  const planned = useMemo(() => (routine ? previewRoutine(routine, data) : []), [routine, data])
  if (!routine) return <><NavBar showBack /><div className="screen with-nav"><Empty icon={ClipboardList} title={t('Rutina eliminada', 'Routine deleted')} message="" /></div></>
  const unit = data.settings.unit
  const last = finishedSessions(data).find((s) => s.routineId === routine.id)
  const detailSlots = groupSlots(routine.exercises)
  const duration = routineFacts(data, routine)
  const week = weekRoutine(data, routine)
  // La serie con el mayor 1RM estimado de la última vez, con el peso que se mueve (sin el corporal: unas
  // dominadas con lastre no deben tapar al press de banca) y escrita como en el resto de la app.
  const bestSet = last?.exercises.flatMap((e) => workingSets(e).filter((s) => s.weight > 0 && s.reps > 0 && !(e.assisted && e.bodyweight !== undefined)).map((s) => ({
    name: e.name, reps: s.reps, e1rm: e1rm(s.weight, s.reps),
    text: e.bodyweight === undefined ? liftText(s, unit, addsLoad(e)) : bodyweightText(s.weight, unit),
  })))
    .reduce<{ name: string; text: string; reps: number; e1rm: number } | undefined>((a, b) => (!a || b.e1rm > a.e1rm ? b : a), undefined)
  const muscles = routine.exercises.map((e) => ({ muscle: e.muscle, secondaryMuscles: catalog.get(e.exerciseId)?.secondaryMuscles ?? [] }))

  const duplicate = () => {
    update((d) => {
      d.routines.push({ ...structuredClone(routine), id: uid(), name: `${routine.name} (${t('copia', 'copy')})`, createdAt: Date.now(), order: routine.order + 1 })
    })
  }

  return (
    <>
      <NavBar showBack right={<>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('Editar rutina', 'Edit routine')}><Pencil size={18} /></button>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label={t('Opciones', 'Options')}><Ellipsis size={20} /></button>
      </>} />
      <div className="screen with-nav">
        <header className="ex-head">
          <h1 className="ex-title">{routine.name}</h1>
          <span className="muted">{routine.programName ?? t('Mis rutinas', 'My routines')} · <span style={{ whiteSpace: 'nowrap' }}>{last ? t(`Última vez ${relative(last.start).toLowerCase()}`, `Last done ${relative(last.start).toLowerCase()}`) : t('Aún sin estrenar', 'Not done yet')}</span></span>
        </header>
        <StatBand items={[
          { value: routine.exercises.length, label: t('Ejercicios', 'Exercises') },
          { value: duration.sets, label: duration.deload ? t('Series · descarga', 'Sets · deload') : t('Series', 'Sets') },
          { value: `~${duration.minutes}′`, label: duration.measured ? t('Tu duración', 'Your time') : t('Duración aprox.', 'Approx. time') },
        ]} />
        {routine.notes && <p className="small muted" style={{ margin: 0 }}>{routine.notes}</p>}
        <div className="list-header"><span className="grow">{t('Ejercicios', 'Exercises')}</span>{routine.exercises.length > 0 && <span>{t('Para hoy', 'Today\'s target')}</span>}</div>
        {duration.deload ? (
          <p className="list-footer" style={{ margin: '-6px 4px 0' }}>{t('Semana de descarga: menos series y un 10 % menos de peso para recuperar. La siguiente vuelves a tus pesos.', 'Deload week: fewer sets and 10% less weight to recover. Next week you go back to your usual weights.')}</p>
        ) : routine.exercises.some((e) => e.progression) && (
          <p className="list-footer" style={{ margin: '-6px 4px 0' }}>{t('Cuando completas todas las repeticiones, la app te sube el peso la sesión siguiente.', 'When you complete every rep, the app raises the weight for you next session.')}</p>
        )}
        <div className="list">
          {routine.exercises.length === 0 && (
            <button className="list-row accent" onClick={() => setEditing(true)}><Plus size={20} /> {t('Añadir ejercicios', 'Add exercises')}</button>
          )}
          {routine.exercises.map((e, i) => {
            const slot = detailSlots[i]
            return (
              <button key={i} className="list-row ex-plan" onClick={() => setDetail(e.exerciseId)}
                style={slot.letter ? { boxShadow: 'inset 1px 0 0 var(--accent)' } : undefined}>
                <Thumb exerciseId={e.exerciseId} size={50} />
                <span className="grow">
                  <span className="bold clamp-2" style={{ fontSize: 15 }}>
                    {slot.letter && <span className="group-badge">{slot.letter}{slot.position}</span>}
                    {e.name}
                  </span>
                  <span className="small muted row" style={{ gap: 6, flexWrap: 'wrap', rowGap: 0 }}>
                    <span>{e.progression === 'wave531' ? `5/3/1${e.trainingMax ? ` · TM ${weight(e.trainingMax, unit)}` : ''}` : e.progression === 'percent' ? `${targetText(week.exercises[i])} · ${Math.round((e.percent ?? 0.75) * 100)} %` : targetText(week.exercises[i])}</span>
                    <span className="row" style={{ gap: 3, whiteSpace: 'nowrap' }} aria-label={t('Descanso', 'Rest')}><Clock size={12} /> {slot.letter && !slot.last ? t('sin descanso', 'no rest') : rest(e.rest)}</span>
                  </span>
                </span>
                {planned[i] && <TodayTarget planned={planned[i]} unit={unit} />}
                {planned[i] && <WarmupLine planned={planned[i]} unit={unit} />}
              </button>
            )
          })}
        </div>
        {routine.exercises.length > 0 && (
          <Card title={t('Músculos que trabaja', 'Muscles worked')}>
            <RoutineMuscleMap exercises={muscles} label={`${t('Músculos que trabaja', 'Muscles worked')}: ${routine.name}`} />
          </Card>
        )}
        {last && (
          <>
            <div className="list-header">{t('Última vez', 'Last time')}</div>
            <div className="list">
              <button className="list-row" onClick={() => navigate('progress', 'session', last.id)}>
                <span className="grow">
                  <span className="bold" style={{ display: 'block' }}>{day(last.start)}</span>
                  <span className="small muted">{Math.round(sessionDuration(last) / 60000)} min · {tons(sessionVolume(last), unit)} {t('movidos', 'moved')} · {plural(last.exercises.reduce((n, e) => n + workingSets(e).length, 0), ['serie', 'series'], ['set', 'sets'])}</span>
                  {bestSet && <span className="small" style={{ display: 'block' }}>{t('Mejor serie', 'Best set')}: <strong>{bestSet.name} <span style={{ whiteSpace: 'nowrap' }}>{bestSet.text} × {bestSet.reps}</span></strong></span>}
                </span>
                <ChevronRight size={18} className="chevron" />
              </button>
            </div>
          </>
        )}
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
  const [expanded, setExpanded] = useState<number>()
  if (!routine) return null

  const edit = (fn: (r: Routine) => void) => update((d) => {
    const r = d.routines.find((x) => x.id === id)
    if (r) fn(r)
  })
  const planned = (e: Exercise, base?: { sets: number; repsMin: number; repsMax: number; rest: number }) => {
    const tracking = defaultTracking(e)
    return {
      exerciseId: e.id, name: e.name, muscle: e.muscle,
      sets: base?.sets ?? 3, repsMin: base?.repsMin ?? 8, repsMax: base?.repsMax ?? 12,
      // Los básicos con barra (sentadilla, peso muerto, press…) piden descansos largos: al menos 3 min.
      rest: base?.rest ?? (BARBELL_EQUIPMENT.has(e.equipment) && e.category === 'strength' && !['arms', 'core'].includes(e.bodyPart) ? Math.max(180, data.settings.defaultRest) : data.settings.defaultRest),
      tracking, ...(tracking === 'time' ? { targetSeconds: defaultTargetSeconds } : {}),
    }
  }
  const add = (list: Exercise[]) => edit((r) => {
    r.exercises.push(...list.map((e) => planned(e)))
  })
  const done = () => { if (!routine.name.trim()) edit((r) => { r.name = t('Rutina', 'Routine') }); onClose() }
  const setTracking = (i: number, t: Tracking) => edit((r) => {
    r.exercises[i].tracking = t
    if (t === 'time') r.exercises[i].targetSeconds ??= defaultTargetSeconds
  })
  // Al elegir 5/3/1 se propone como TM el 90 % del mejor 1RM estimado del ejercicio.
  const setProgression = (i: number, p: Progression | undefined) => edit((r) => {
    const ex = r.exercises[i]
    ex.progression = p
    if (p === 'percent') ex.percent ??= 0.75
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
    <Sheet title={t('Editar rutina', 'Edit routine')} onClose={done}
      footer={<button className="btn primary block" onClick={done}>{t('Listo', 'Done')}</button>}>
      <div className="list">
        <div className="list-row"><input className="grow" style={{ fontSize: 17 }} value={routine.name} placeholder={t('Nombre de la rutina', 'Routine name')} onChange={(e) => edit((r) => { r.name = e.target.value })} /></div>
        <div className="list-row"><textarea className="grow" rows={2} value={routine.notes} placeholder={t('Notas (opcional)', 'Notes (optional)')} onChange={(e) => edit((r) => { r.notes = e.target.value })} /></div>
      </div>
      <div className="list-header">{t('Ejercicios', 'Exercises')}</div>
      <div className="list">
        {routine.exercises.map((e, i) => {
          const open = expanded === i
          const tracking = trackingOf(e)
          const noRest = !!slots[i].letter && !slots[i].last
          const summary = `${targetText(e)} · ${noRest ? t('sin descanso', 'no rest') : t(`${rest(e.rest)} de descanso`, `${rest(e.rest)} rest`)}`
          return (
          <div key={i} className={`list-row edit-row ${open ? 'open' : ''}`} style={slots[i].letter ? { boxShadow: 'inset 1px 0 0 var(--accent)' } : undefined}>
            {slots[i].letter && slots[i].first && (
              <span className="group-head"><Link2 size={15} /> {groupKind(slots[i].size)} {slots[i].letter}: {t('sin descanso entre ejercicios', 'no rest between exercises')}</span>
            )}
            <button className="edit-head" onClick={() => setExpanded(open ? undefined : i)} aria-expanded={open}>
              <Thumb exerciseId={e.exerciseId} size={40} />
              <span className="grow">
                <span className="bold clamp-2" style={{ fontSize: 15 }}>
                  {slots[i].letter && <span className="group-badge">{slots[i].letter}{slots[i].position}</span>}
                  {e.name}
                </span>
                {!open && <span className="small muted clamp-2">{summary}</span>}
              </span>
              <ChevronDown size={18} className="chevron edit-chevron" />
            </button>
            {open && (
              <>
            <div className="edit-grid">
              <Stepper label={t('Series', 'Sets')} value={e.sets} min={1} max={10} onChange={(v) => edit((r) => { r.exercises[i].sets = v })} />
              {tracking === 'weight_reps' && (
                <>
                  <Stepper label={t('Reps mín.', 'Min reps')} value={e.repsMin} min={1} max={50} onChange={(v) => edit((r) => { r.exercises[i].repsMin = v; if (r.exercises[i].repsMax < v) r.exercises[i].repsMax = v })} />
                  <Stepper label={t('Reps máx.', 'Max reps')} value={e.repsMax} min={1} max={50} onChange={(v) => edit((r) => { r.exercises[i].repsMax = v; if (r.exercises[i].repsMin > v) r.exercises[i].repsMin = v })} />
                </>
              )}
              {tracking === 'time' && (
                <div className="stepper">
                  <span className="tiny muted">{t('Tiempo', 'Time')}</span>
                  <select className="field" value={e.targetSeconds ?? defaultTargetSeconds}
                    onChange={(ev) => edit((r) => { r.exercises[i].targetSeconds = Number(ev.target.value) })}>
                    {timeTargets.map((o) => <option key={o} value={o}>{clock(o)}</option>)}
                  </select>
                </div>
              )}
              {noRest ? (
                <div className="stepper">
                  <span className="tiny muted">{t('Descanso', 'Rest')}</span>
                  <span className="small muted" style={{ padding: '6px 0' }}>{t('Ninguno', 'None')}</span>
                </div>
              ) : (
                <RestStepper label={slots[i].letter ? t('Tras la ronda', 'After round') : t('Descanso', 'Rest')} value={e.rest}
                  onChange={(v) => edit((r) => { r.exercises[i].rest = v })} />
              )}
            </div>
            {tracking === 'weight_reps' && (
              <label className="edit-field">
                <span className="grow">
                  <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t('Cómo sube el peso', 'How the weight goes up')}</span>
                  <span className="small muted">{progressionHelp(e.progression)}</span>
                </span>
                <select className="field" value={e.progression ?? ''} onChange={(ev) => setProgression(i, (ev.target.value || undefined) as Progression | undefined)}>
                  {progressionOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
            )}
            {tracking === 'weight_reps' && (
              <label className="edit-field">
                <span className="grow">
                  <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t('Tempo (opcional)', 'Tempo (optional)')}</span>
                  <span className="small muted">{t('Segundos bajando-pausa-subiendo, p. ej. 3-1-1. En el entreno, unos pitidos marcan el ritmo.', 'Seconds lowering-pause-lifting, e.g. 3-1-1. During the workout, beeps mark the pace.')}</span>
                </span>
                <input className="field" style={{ width: 90 }} placeholder="3-1-1" defaultValue={e.tempo ?? ''} aria-label={t('Tempo', 'Tempo')}
                  onChange={(ev) => {
                    const v = ev.target.value.trim()
                    edit((r) => { r.exercises[i].tempo = /^\d-\d-\d(-\d)?$/.test(v) ? v : undefined })
                  }} />
              </label>
            )}
            {tracking === 'weight_reps' && e.progression === 'percent' && (
              <label className="edit-field">
                <span className="grow bold" style={{ fontSize: 15 }}>{t('Porcentaje', 'Percentage')}</span>
                <select className="field" value={String(e.percent ?? 0.75)} onChange={(ev) => edit((r) => { r.exercises[i].percent = Number(ev.target.value) })}>
                  {[0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((v) => <option key={v} value={v}>{Math.round(v * 100)} %</option>)}
                </select>
              </label>
            )}
            {tracking === 'weight_reps' && e.progression === 'wave531' && (
              <label className="edit-field">
                <span className="grow bold" style={{ fontSize: 15 }}>{t('Máx. de entreno (TM)', 'Training max (TM)')}</span>
                <input className="field" inputMode="decimal" style={{ width: 90 }}
                  defaultValue={e.trainingMax ? editable(fromKg(e.trainingMax, data.settings.unit)) : ''} placeholder={data.settings.unit}
                  aria-label={t('Máximo de entrenamiento', 'Training max')}
                  onChange={(ev) => {
                    const v = parseDecimal(ev.target.value)
                    edit((r) => { r.exercises[i].trainingMax = v && v > 0 ? toKg(v, data.settings.unit) : undefined; r.exercises[i].tmSince = Date.now() })
                  }} />
              </label>
            )}
            <label className="edit-field">
              <span className="grow">
                <span className="bold" style={{ display: 'block', fontSize: 15 }}>{t('Qué apuntas', 'What you log')}</span>
                <span className="small muted">{t('En cada serie', 'On each set')}</span>
              </span>
              <select className="field" value={tracking} onChange={(ev) => setTracking(i, ev.target.value as Tracking)}>
                {trackingOptions().map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <div className="edit-actions">
              <button className="nav-btn" onClick={() => setReplacing(i)}><ArrowLeftRight size={17} /> {t('Sustituir', 'Replace')}</button>
              {i < routine.exercises.length - 1 && !noRest && (
                <button className="nav-btn" onClick={() => edit((r) => linkWithNext(r.exercises, i))} aria-label={t('Hacer superserie con el siguiente', 'Superset with the next one')}>
                  <Link2 size={17} /> {t('Superserie con el siguiente', 'Superset with next')}
                </button>
              )}
              {slots[i].letter && (
                <button className="nav-btn" onClick={() => edit((r) => unlink(r.exercises, i))} aria-label={t('Separar de la superserie', 'Remove from superset')}>
                  <Unlink size={17} /> {t('Separar', 'Unlink')}
                </button>
              )}
            </div>
            <div className="edit-actions">
              <button className="icon-btn" disabled={i === 0} onClick={() => { move(i, -1); setExpanded(i - 1) }} aria-label={t('Subir', 'Move up')}><ArrowUp size={18} /></button>
              <button className="icon-btn" disabled={i === routine.exercises.length - 1} onClick={() => { move(i, 1); setExpanded(i + 1) }} aria-label={t('Bajar', 'Move down')}><ArrowDown size={18} /></button>
              <span className="grow" />
              <button className="nav-btn" style={{ color: 'var(--red-text)' }} onClick={() => { setExpanded(undefined); withUndo(t(`Quitado: ${e.name}`, `Removed: ${e.name}`), () => edit((r) => { r.exercises.splice(i, 1); normalizeGroups(r.exercises) })) }}><Trash2 size={17} /> {t('Quitar', 'Remove')}</button>
            </div>
              </>
            )}
          </div>
          )
        })}
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

/** Descanso con − / + (los mismos pasos que en el resto de la app). */
function RestStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  // Si el valor no está entre las opciones (rutinas antiguas o importadas), se parte del más cercano.
  const index = restOptions.reduce((best, o, i) => (Math.abs(o - value) < Math.abs(restOptions[best] - value) ? i : best), 0)
  return (
    <div className="stepper">
      <span className="tiny muted">{label}</span>
      <div className="control">
        <button disabled={index === 0 && value <= restOptions[0]} onClick={() => onChange(restOptions[Math.max(0, value > restOptions[index] ? index : index - 1)])} aria-label={`${t('Menos', 'Less')} ${label}`}><Minus size={15} strokeWidth={3} /></button>
        <span style={{ minWidth: 52, textAlign: 'center' }}>{rest(value)}</span>
        <button disabled={index === restOptions.length - 1 && value >= restOptions[index]} onClick={() => onChange(restOptions[Math.min(restOptions.length - 1, value < restOptions[index] ? index : index + 1)])} aria-label={`${t('Más', 'More')} ${label}`}><Plus size={15} strokeWidth={3} /></button>
      </div>
    </div>
  )
}

/** Qué hace cada progresión, en una línea. */
const progressionHelp = (p: Progression | undefined) =>
  p === 'double' ? t('Cuando llegas a las reps máximas en todas las series, sube el peso y vuelves a las mínimas.', 'When you hit the max reps on every set, the weight goes up and you go back to the min reps.')
    : p === 'linear' ? t('Reps fijas: si las completas todas, la próxima vez sube el peso.', 'Fixed reps: if you complete them all, the weight goes up next time.')
      : p === 'wave531' ? t('Ciclos de 4 semanas sobre tu máximo de entrenamiento, que sube al acabar cada ciclo.', '4-week cycles on your training max, which goes up after each cycle.')
        : p === 'percent' ? t('El peso es un porcentaje de tu máximo estimado: cuando este sube, sube el peso.', 'The weight is a percentage of your estimated max: when it rises, so does the weight.')
        : t('Tú decides el peso; la app te propone el de la última vez.', 'You choose the weight; the app suggests last time\'s.')

const progressionOptions = (): { id: Progression | ''; label: string }[] => [
  { id: '', label: t('Manual', 'Manual') },
  { id: 'double', label: t('Doble progresión', 'Double progression') },
  { id: 'linear', label: t('Lineal', 'Linear') },
  { id: 'wave531', label: '5/3/1' },
  { id: 'percent', label: t('% del máximo', '% of max') },
]
