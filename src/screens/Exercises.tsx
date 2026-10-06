import { ChartLine, Info, PencilLine, Plus, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LineChart } from '../components/charts'
import { MuscleMap, MusclePicker } from '../components/MuscleMap'
import { ExerciseNoteField } from '../components/ExerciseNote'
import { CustomExerciseSheet } from '../components/CustomExerciseSheet'
import { RepRecordsCard } from '../components/RepRecords'
import { ActionSheet, Card, Chip, Empty, LargeTitle, NavBar, Sheet, StatBand, Thumb, useCatalog, useProgressive, useToast } from '../components/ui'
import { emptyFilter, type Exercise, type ExerciseFilter } from '../lib/catalog'
import { clock, fromKg, int, num, relative, type Unit } from '../lib/format'
import { bodyPartLabel, bodyPartOrder, categoryKeys, categoryLabel, equipmentLabel, levelLabel, muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory, exerciseUsage, type ExerciseUsage } from '../lib/stats'
import { finishedSessions, update, useData } from '../lib/store'
import { defaultTargetSeconds, defaultTracking, setShortText, trackingOf } from '../lib/tracking'
import { plural, t } from '../lib/i18n'

// Las figuras de movimiento pesan bastante: se cargan aparte, al abrir la ficha de un ejercicio.
const MoveFigure = lazy(() => import('../components/MoveFigure').then((m) => ({ default: m.MoveFigure })))

export function toggleFavorite(id: string) {
  update((d) => {
    const favs = d.settings.favorites
    d.settings.favorites = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]
  })
}

function FilterBar({ filter, setFilter }: { filter: ExerciseFilter; setFilter: (f: ExerciseFilter) => void }) {
  const catalog = useCatalog()
  const [open, setOpen] = useState(false)
  const active = [filter.muscle, filter.equipment, filter.category].filter(Boolean).length + (filter.favoritesOnly ? 1 : 0)
  return (
    <>
      <div className="row">
        <label className="search grow">
          <Search size={18} />
          <input
            type="search"
            placeholder={t('Buscar ejercicio', 'Search exercises')}
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
          {filter.query && (
            <button onClick={() => setFilter({ ...filter, query: '' })} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>
          )}
        </label>
        <button className={`icon-btn ${active ? 'on' : ''}`} onClick={() => setOpen(true)} aria-label={active ? t(`Filtros (${active} activos)`, `Filters (${active} on)`) : t('Filtros', 'Filters')}>
          <SlidersHorizontal size={19} />
        </button>
      </div>
      {active > 0 && (
        <div className="chips">
          {filter.favoritesOnly && <Chip active label={t('Favoritos', 'Favourites')} icon={X} ariaLabel={`${t('Quitar filtro', 'Remove filter')}: ${t('Favoritos', 'Favourites')}`} onClick={() => setFilter({ ...filter, favoritesOnly: false })} />}
          {filter.muscle && <Chip active label={muscleLabel(filter.muscle)} icon={X} ariaLabel={`${t('Quitar filtro', 'Remove filter')}: ${muscleLabel(filter.muscle)}`} onClick={() => setFilter({ ...filter, muscle: undefined })} />}
          {filter.equipment && <Chip active label={equipmentLabel(filter.equipment)} icon={X} ariaLabel={`${t('Quitar filtro', 'Remove filter')}: ${equipmentLabel(filter.equipment)}`} onClick={() => setFilter({ ...filter, equipment: undefined })} />}
          {filter.category && <Chip active label={categoryLabel(filter.category)} icon={X} ariaLabel={`${t('Quitar filtro', 'Remove filter')}: ${categoryLabel(filter.category)}`} onClick={() => setFilter({ ...filter, category: undefined })} />}
        </div>
      )}
      <div className="chips">
        <Chip label={t('Todos', 'All')} active={!filter.bodyPart} onClick={() => setFilter({ ...filter, bodyPart: undefined })} />
        {bodyPartOrder.map((p) => (
          <Chip key={p} label={bodyPartLabel(p)} active={filter.bodyPart === p}
            onClick={(e) => {
              // Que el tipo elegido quede a la vista en la fila de categorías.
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
              setFilter({ ...filter, bodyPart: filter.bodyPart === p ? undefined : p })
            }} />
        ))}
      </div>
      {open && (
        <Sheet title={t('Filtros', 'Filters')} onClose={() => setOpen(false)}
          left={<button className="nav-btn" onClick={() => setFilter({ ...emptyFilter, query: filter.query, bodyPart: filter.bodyPart })}>{t('Quitar', 'Clear')}</button>}
          right={<button className="nav-btn bold" onClick={() => setOpen(false)}>{t('Listo', 'Done')}</button>}>
          <MusclePicker value={filter.muscle} onChange={(muscle) => setFilter({ ...filter, muscle })} />
          <div className="list">
            <label className="list-row">
              <Star size={20} color="var(--gold)" />
              <span className="grow">{t('Solo favoritos', 'Favourites only')}</span>
              <input type="checkbox" className="toggle" checked={filter.favoritesOnly}
                onChange={(e) => setFilter({ ...filter, favoritesOnly: e.target.checked })} />
            </label>
            <label className="list-row">
              <span className="grow">{t('Músculo', 'Muscle')}</span>
              <select className="select" value={filter.muscle ?? ''} onChange={(e) => setFilter({ ...filter, muscle: e.target.value || undefined })}>
                <option value="">{t('Todos', 'All')}</option>
                {catalog.muscles.map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
              </select>
            </label>
            <label className="list-row">
              <span className="grow">{t('Equipamiento', 'Equipment')}</span>
              <select className="select" value={filter.equipment ?? ''} onChange={(e) => setFilter({ ...filter, equipment: e.target.value || undefined })}>
                <option value="">{t('Todo', 'All')}</option>
                {catalog.equipments.map((m) => <option key={m} value={m}>{equipmentLabel(m)}</option>)}
              </select>
            </label>
            <label className="list-row">
              <span className="grow">{t('Tipo', 'Type')}</span>
              <select className="select" value={filter.category ?? ''} onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}>
                <option value="">{t('Todos', 'All')}</option>
                {categoryKeys.map((m) => <option key={m} value={m}>{categoryLabel(m)}</option>)}
              </select>
            </label>
          </div>
        </Sheet>
      )}
    </>
  )
}

function ExerciseRowContent({ exercise, favorite, thumb = 56, usage, unit }: { exercise: Exercise; favorite: boolean; thumb?: number; usage?: ExerciseUsage; unit?: Unit }) {
  return (
    <>
      <Thumb exerciseId={exercise.id} size={thumb} />
      <span className="grow">
        <span className="bold clamp-2" style={{ fontSize: 15.5 }}>
          {exercise.name}
          {favorite && <Star size={13} fill="currentColor" className="fav-star" aria-label={t('Favorito', 'Favourite')} />}
        </span>
        <span className="small muted clamp-1" style={{ display: 'block' }}>{exercise.custom ? `${t('Propio', 'Custom')} · ` : ''}{muscleLabel(exercise.muscle)} · {equipmentLabel(exercise.equipment)}</span>
      </span>
      {usage && unit && (
        <span className="ex-last">
          <strong>{setShortText(usage.top, trackingOf(usage.exercise), unit).replace(' × ', '×').replace(/ @[\d,.]+$/, '')}</strong>
          <span className="tiny muted">{relative(usage.last)}</span>
        </span>
      )}
    </>
  )
}

/** Uso de cada ejercicio a partir del historial (para «Tus ejercicios» y la última serie en cada fila). */
function useUsage() {
  const data = useData()
  return useMemo(() => exerciseUsage(finishedSessions(data)), [data])
}

const filtering = (f: ExerciseFilter) => Boolean(f.query.trim() || f.bodyPart || f.muscle || f.equipment || f.category || f.favoritesOnly)

/** Al buscar, primero lo que empieza por lo escrito y lo que ya has hecho; el resto, en orden alfabético. */
function rank(results: Exercise[], query: string, usage: Map<string, ExerciseUsage>): Exercise[] {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return results
  const score = (e: Exercise) => (e.name.toLocaleLowerCase().startsWith(q) ? 0 : 2) + (usage.has(e.id) ? 0 : 1)
  return [...results].sort((a, b) => score(a) - score(b))
}

// El filtro se conserva al volver desde la ficha de un ejercicio.
let savedFilter: ExerciseFilter = emptyFilter

export function ExercisesScreen() {
  const catalog = useCatalog()
  const { settings } = useData()
  const [filter, setFilterState] = useState(savedFilter)
  const setFilter = (f: ExerciseFilter) => {
    savedFilter = f
    setFilterState(f)
  }
  const usage = useUsage()
  const results = useMemo(() => rank(catalog.filter(filter, settings.favorites), filter.query, usage), [catalog, filter, settings.favorites, usage])
  const { shown, sentinel } = useProgressive(results, JSON.stringify(filter))
  const [creating, setCreating] = useState(false)
  // Sin buscar ni filtrar: arriba, los que ya haces (el más reciente primero).
  const mine = useMemo(() => filtering(filter) ? [] : [...usage.entries()].sort((a, b) => b[1].last - a[1].last).slice(0, 8)
    .map(([id, u]) => ({ exercise: catalog.get(id), usage: u })).filter((x): x is { exercise: Exercise; usage: ExerciseUsage } => Boolean(x.exercise)), [filter, usage, catalog])

  return (
    <div className="screen">
      <LargeTitle title={t('Ejercicios', 'Exercises')} actions={
        <button className="icon-btn" onClick={() => setCreating(true)} aria-label={t('Crear ejercicio propio', 'Create custom exercise')}><Plus size={22} /></button>
      } />
      {creating && <CustomExerciseSheet initialName={filter.query} onClose={() => setCreating(false)} onSaved={(id) => navigate('exercises', id)} />}
      <FilterBar filter={filter} setFilter={setFilter} />
      {mine.length > 0 && (
        <>
          <div className="list-header">{t('Tus ejercicios', 'Your exercises')}</div>
          <div className="list">
            {mine.map(({ exercise, usage: u }) => (
              <button key={exercise.id} className="list-row" onClick={() => navigate('exercises', exercise.id)}>
                <ExerciseRowContent exercise={exercise} favorite={settings.favorites.includes(exercise.id)} thumb={48} usage={u} unit={settings.unit} />
              </button>
            ))}
          </div>
        </>
      )}
      <div className="list-header">{filtering(filter) ? plural(results.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises']) : t(`Todos · ${results.length}`, `All · ${results.length}`)}</div>
      {results.length === 0 ? (
        <Empty icon={Search} title={t('Sin resultados', 'No results')} message={t('Prueba con otra palabra o quita algún filtro. ¿No está? Créalo tú.', 'Try another word or remove a filter. Not there? Create it.')}
          action={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={18} /> {t('Crear ejercicio', 'Create exercise')}</button>} />
      ) : (
        <div className="list">
          {shown.map((e) => (
            <button key={e.id} className="list-row" onClick={() => navigate('exercises', e.id)}>
              <ExerciseRowContent exercise={e} favorite={settings.favorites.includes(e.id)} usage={usage.get(e.id)} unit={settings.unit} />
            </button>
          ))}
        </div>
      )}
      {sentinel}
    </div>
  )
}

export function ExerciseDetailScreen({ id }: { id: string }) {
  const catalog = useCatalog()
  const exercise = catalog.get(id)
  const { settings } = useData()
  const [addTo, setAddTo] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toast, showToast] = useToast()
  const custom = useData().customExercises.find((c) => c.id === id)
  if (!exercise) return <div className="screen"><NavBar showBack /><Empty icon={Info} title={t('Ejercicio no encontrado', 'Exercise not found')} message="" /></div>
  const fav = settings.favorites.includes(id)
  return (
    <>
      <NavBar showBack right={
        <>
          <button className="icon-btn" onClick={() => toggleFavorite(id)} aria-label={t('Favorito', 'Favourite')}>
            <Star size={19} fill={fav ? 'var(--gold)' : 'none'} color={fav ? 'var(--gold)' : 'var(--text)'} />
          </button>
          {custom && <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('Editar ejercicio', 'Edit exercise')}><PencilLine size={19} /></button>}
        </>
      } />
      <div className="screen with-nav">
        <ExerciseDetailContent exercise={exercise} actions={
          <button className="btn secondary small" style={{ alignSelf: 'flex-start' }} onClick={() => setAddTo(true)}><Plus size={17} /> {t('Añadir a una rutina', 'Add to a routine')}</button>
        } />
      </div>
      {editing && custom && <CustomExerciseSheet existing={custom} onClose={() => setEditing(false)} />}
      {addTo && <AddToRoutine exercise={exercise} onClose={() => setAddTo(false)} onAdded={(name) => showToast(t(`Añadido a ${name}`, `Added to ${name}`))} />}
      {toast}
    </>
  )
}

function AddToRoutine({ exercise, onClose, onAdded }: { exercise: Exercise; onClose: () => void; onAdded: (name: string) => void }) {
  const { routines } = useData()
  if (!routines.length) {
    return <ActionSheet title={t('Aún no tienes rutinas', 'No routines yet')} message={t('Crea una en la pestaña Rutinas.', 'Create one in the Routines tab.')} options={[{ label: t('Ir a Rutinas', 'Go to Routines'), onSelect: () => navigate('routines') }]} onClose={onClose} />
  }
  return (
    <ActionSheet title={t('Añadir a rutina', 'Add to routine')} onClose={onClose} options={routines.map((r) => ({
      label: r.name,
      onSelect: () => {
        update((d) => {
          const tracking = defaultTracking(exercise)
          d.routines.find((x) => x.id === r.id)?.exercises.push({
            exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle,
            sets: 3, repsMin: 8, repsMax: 12, rest: d.settings.defaultRest, tracking,
            ...(tracking === 'time' ? { targetSeconds: defaultTargetSeconds } : {}),
          })
        })
        onAdded(r.name)
      },
    }))} />
  )
}

export function ExerciseDetailContent({ exercise, actions }: { exercise: Exercise; actions?: ReactNode }) {
  const data = useData()
  const unit = data.settings.unit
  const sessions = useMemo(() => finishedSessions(data), [data])
  const points = useMemo(() => exerciseHistory(exercise.id, sessions), [exercise.id, sessions])
  const usage = useMemo(() => exerciseUsage(sessions).get(exercise.id), [sessions, exercise.id])
  // Según lo que se registró de verdad (el tipo se puede cambiar a mano en el entrenamiento).
  const timed = points.length > 0 && points.every((p) => p.maxWeight === 0) && points.some((p) => p.maxDuration > 0 || p.maxDistance > 0)
  const tracking = timed ? (points.some((p) => p.maxDistance > 0) ? 'distance_time' : 'time') : points.length ? 'weight_reps' : defaultTracking(exercise)
  // El último paso que empieza por «Consejo» va aparte, como nota de técnica.
  const tipIndex = exercise.instructions.findIndex((x) => /^(consejo|tip)\s*:/i.test(x))
  const steps = exercise.instructions.filter((_, i) => i !== tipIndex)
  const tip = tipIndex >= 0 ? exercise.instructions[tipIndex].replace(/^(consejo|tip)\s*:\s*/i, '') : undefined
  const meta = [muscleLabel(exercise.muscle), equipmentLabel(exercise.equipment), !exercise.custom && levelLabel(exercise.level)].filter(Boolean).join(' · ')
  return (
    <>
      <header className="ex-head">
        <h1 className="ex-title">{exercise.name}</h1>
        <span className="muted">{exercise.custom ? `${t('Ejercicio propio', 'Custom exercise')} · ` : ''}{meta}</span>
        {actions}
      </header>
      <Suspense fallback={<div className="move-figure"><div className="move-figure-placeholder" /></div>}>
        <MoveFigure exercise={exercise} />
      </Suspense>
      {points.length > 0 && tracking === 'weight_reps' && (
        <Card title={t('Tu historial', 'Your history')}>
          <StatBand items={[
            { value: usage ? setShortText(usage.top, 'weight_reps', unit).replace(' × ', '×').replace(/ @[\d,.]+$/, '') : '—', label: usage ? t(`Última vez · ${relative(usage.last).toLowerCase()}`, `Last time · ${relative(usage.last).toLowerCase()}`) : t('Última vez', 'Last time') },
            { value: `${int(fromKg(Math.max(...points.map((p) => p.e1rm)), unit))} ${unit}`, label: t('Máx. estimado', 'Est. max') },
            { value: points.length, label: points.length === 1 ? t('sesión', 'session') : t('sesiones', 'sessions') },
          ]} />
          {points.length >= 2 && (
            <LineChart points={points.map((p) => ({ x: p.date, y: fromKg(p.e1rm, unit) }))} />
          )}
          <button className="btn small secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('progress', 'exercise', exercise.id)}>
            <ChartLine size={16} /> {t('Ver todo tu progreso', 'See all your progress')}
          </button>
        </Card>
      )}
      {points.length > 0 && tracking !== 'weight_reps' && (
        <Card title={t('Tu historial', 'Your history')}>
          <StatBand items={[
            { value: clock(Math.max(...points.map((p) => p.maxDuration))), label: t('Mejor tiempo', 'Best time') },
            ...(tracking === 'distance_time' ? [{ value: `${num(Math.max(...points.map((p) => p.maxDistance)))} km`, label: t('Más distancia', 'Longest distance') }] : []),
            { value: points.length, label: points.length === 1 ? t('sesión', 'session') : t('sesiones', 'sessions') },
          ]} />
          {points.length >= 2 && (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: tracking === 'distance_time' ? p.maxDistance : p.maxDuration / 60 }))} />
              <span className="small muted">{tracking === 'distance_time' ? t('Kilómetros por sesión', 'Kilometres per session') : t('Minutos de la serie más larga', 'Minutes of the longest set')}</span>
            </>
          )}
        </Card>
      )}
      {steps.length > 0 && (
        <Card title={t('Cómo se hace', 'How to do it')}>
          <ol className="ex-steps">
            {steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
          {tip && <p className="ex-tip"><strong>{t('Clave:', 'Key point:')}</strong> {tip}</p>}
        </Card>
      )}
      <Card title={t('Músculos', 'Muscles')}>
        <MuscleMap exercise={exercise} />
        <span className="small">
          <strong>{t('Principal', 'Primary')}:</strong> {muscleLabel(exercise.muscle)}
          {exercise.secondaryMuscles.length > 0 && <><br /><strong>{t('Secundarios', 'Secondary')}:</strong> {exercise.secondaryMuscles.map(muscleLabel).join(', ')}</>}
        </span>
      </Card>
      <Card title={t('Tu nota', 'Your note')}>
        <ExerciseNoteField exerciseId={exercise.id} />
      </Card>
      {points.length > 0 && tracking === 'weight_reps' && <RepRecordsCard exerciseId={exercise.id} sessions={sessions} unit={unit} />}
    </>
  )
}

/** Selector de varios ejercicios, en el orden en que se marcan. */
/** Selector de ejercicios del catálogo. Con `single`, al tocar uno se elige y se cierra. */
export function ExercisePicker({ onDone, onClose, single, title }: { onDone: (list: Exercise[]) => void; onClose: () => void; single?: boolean; title?: string }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter)
  const [selected, setSelected] = useState<Exercise[]>([])
  const [preview, setPreview] = useState<Exercise>()
  const usage = useUsage()
  // Los que ya haces, primero (sin buscar, del más reciente al más antiguo).
  const results = useMemo(() => {
    const list = rank(catalog.filter(filter, settings.favorites), filter.query, usage)
    if (filter.query.trim()) return list
    const last = (e: Exercise) => usage.get(e.id)?.last ?? 0
    return [...list].sort((a, b) => last(b) - last(a))
  }, [catalog, filter, settings.favorites, usage])
  const { shown, sentinel } = useProgressive(results, JSON.stringify(filter))
  const toggle = (e: Exercise) => {
    if (single) {
      onDone([e])
      return onClose()
    }
    setSelected((s) => (s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]))
  }
  // Ejercicio propio recién creado: se elige en cuanto el catálogo lo incluye.
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<string>()
  useEffect(() => {
    const e = created && catalog.get(created)
    if (!e) return
    setCreated(undefined)
    toggle(e)
  }, [catalog, created]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet title={title ?? t('Añadir ejercicios', 'Add exercises')} onClose={onClose} scrollKey={JSON.stringify(filter)}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={selected.length > 0 && (
        <button className="btn primary block" onClick={() => { onDone(selected); onClose() }}>
          {selected.length === 1 ? t('Añadir 1 ejercicio', 'Add 1 exercise') : t(`Añadir ${selected.length} ejercicios`, `Add ${selected.length} exercises`)}
        </button>
      )}>
      <div className="sheet-sticky">
        <FilterBar filter={filter} setFilter={setFilter} />
        <span className="small muted row" style={{ gap: 4 }}>
          <span className="grow">{plural(results.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises'])} · <Info size={12} style={{ verticalAlign: -1 }} /> {t('para ver cómo se hace', 'to see how it is done')}</span>
          <button className="link-btn small" style={{ color: 'var(--accent-text)' }} onClick={() => setCreating(true)}><Plus size={13} style={{ verticalAlign: -2 }} /> {t('Crear ejercicio', 'Create exercise')}</button>
        </span>
      </div>
      {creating && <CustomExerciseSheet initialName={filter.query} onClose={() => setCreating(false)} onSaved={setCreated} />}
      <div className="list">
        {shown.map((e) => {
          const index = selected.findIndex((x) => x.id === e.id)
          return (
            <div key={e.id} className="list-row" style={{ gap: 8, paddingRight: 10 }}>
              <button className="row grow" style={{ textAlign: 'left', gap: 10, minWidth: 0 }} onClick={() => toggle(e)}>
                <ExerciseRowContent exercise={e} favorite={settings.favorites.includes(e.id)} thumb={48} usage={usage.get(e.id)} unit={settings.unit} />
                {!single && <span className={`pick-circle ${index >= 0 ? 'active' : ''}`}>{index >= 0 ? index + 1 : ''}</span>}
              </button>
              <button className="set-check" style={{ color: 'var(--text-3)', width: 30 }} onClick={() => setPreview(e)} aria-label={t('Ver ejercicio', 'View exercise')}>
                <Info size={20} />
              </button>
            </div>
          )
        })}
      </div>
      {sentinel}
      {preview && (
        <Sheet title="" onClose={() => setPreview(undefined)} right={<button className="nav-btn bold" onClick={() => setPreview(undefined)}>{t('Cerrar', 'Close')}</button>}>
          <ExerciseDetailContent exercise={preview} />
        </Sheet>
      )}
    </Sheet>
  )
}

export function ExerciseSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const exercise = useCatalog().get(exerciseId)
  return (
    <Sheet title="" onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      {exercise ? <ExerciseDetailContent exercise={exercise} /> : <p className="muted">{t('Ejercicio no disponible.', 'Exercise not available.')}</p>}
    </Sheet>
  )
}

