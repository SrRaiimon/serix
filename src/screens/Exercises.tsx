import { ChartLine, Info, ListOrdered, PersonStanding, Plus, Search, SlidersHorizontal, Star, StickyNote, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from '../components/charts'
import { MuscleMap } from '../components/MuscleMap'
import { ExerciseNoteField } from '../components/ExerciseNote'
import { ActionSheet, Card, Chip, Empty, LargeTitle, NavBar, Sheet, Tag, Thumb, Tile, useCatalog, useToast } from '../components/ui'
import { emptyFilter, type Exercise, type ExerciseFilter } from '../lib/catalog'
import { clock, fromKg, num, weight } from '../lib/format'
import { bodyPartLabel, bodyPartOrder, categoryKeys, categoryLabel, equipmentLabel, levelLabel, muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory } from '../lib/stats'
import { finishedSessions, update, useData } from '../lib/store'
import { defaultTargetSeconds, defaultTracking } from '../lib/tracking'
import { plural, t } from '../lib/i18n'

// Las figuras de movimiento pesan bastante: se cargan aparte, al abrir la ficha de un ejercicio.
const MoveFigure = lazy(() => import('../components/MoveFigure').then((m) => ({ default: m.MoveFigure })))

const PAGE = 50

/** Lista que va mostrando más elementos al llegar al final. */
function useProgressive<T>(items: T[], resetKey: string) {
  const [visible, setVisible] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => setVisible(PAGE), [resetKey])
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => v + PAGE)
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [items])
  return { shown: items.slice(0, visible), sentinel: visible < items.length ? <div ref={sentinel} style={{ height: 1 }} /> : null }
}

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
            placeholder={t('Buscar: press, sentadilla, polea…', 'Search: press, squat, cable…')}
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
          {filter.query && (
            <button onClick={() => setFilter({ ...filter, query: '' })} aria-label={t('Borrar', 'Clear')}><X size={18} /></button>
          )}
        </label>
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label={t('Filtros', 'Filters')} style={active ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined}>
          <SlidersHorizontal size={19} />
        </button>
      </div>
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

function ExerciseRowContent({ exercise, favorite, thumb = 56 }: { exercise: Exercise; favorite: boolean; thumb?: number }) {
  return (
    <>
      <Thumb exerciseId={exercise.id} size={thumb} />
      <span className="grow">
        <span className="bold clamp-2" style={{ fontSize: 15.5 }}>{exercise.name}</span>
        <span className="small muted clamp-1" style={{ display: 'block' }}>{muscleLabel(exercise.muscle)} · {equipmentLabel(exercise.equipment)}</span>
      </span>
      {favorite && <Star size={15} fill="var(--gold)" color="var(--gold)" />}
    </>
  )
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
  const results = useMemo(() => catalog.filter(filter, settings.favorites), [catalog, filter, settings.favorites])
  const { shown, sentinel } = useProgressive(results, JSON.stringify(filter))

  return (
    <div className="screen">
      <LargeTitle title={t('Ejercicios', 'Exercises')} />
      <FilterBar filter={filter} setFilter={setFilter} />
      <div className="list-header">{plural(results.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises'])}</div>
      {results.length === 0 ? (
        <Empty icon={Search} title={t('Sin resultados', 'No results')} message={t('Prueba con otra palabra o quita algún filtro.', 'Try another word or remove a filter.')} />
      ) : (
        <div className="list">
          {shown.map((e) => (
            <button key={e.id} className="list-row" onClick={() => navigate('exercises', e.id)}>
              <ExerciseRowContent exercise={e} favorite={settings.favorites.includes(e.id)} />
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
  const [toast, showToast] = useToast()
  if (!exercise) return <div className="screen"><NavBar showBack /><Empty icon={Info} title={t('Ejercicio no encontrado', 'Exercise not found')} message="" /></div>
  const fav = settings.favorites.includes(id)
  return (
    <>
      <NavBar showBack right={
        <>
          <button className="icon-btn" onClick={() => toggleFavorite(id)} aria-label={t('Favorito', 'Favourite')}>
            <Star size={19} fill={fav ? 'var(--gold)' : 'none'} color={fav ? 'var(--gold)' : 'var(--accent)'} />
          </button>
          <button className="icon-btn" onClick={() => setAddTo(true)} aria-label={t('Añadir a rutina', 'Add to routine')}><Plus size={20} /></button>
        </>
      } />
      <div className="screen with-nav">
        <ExerciseDetailContent exercise={exercise} />
      </div>
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

export function ExerciseDetailContent({ exercise }: { exercise: Exercise }) {
  const data = useData()
  const unit = data.settings.unit
  const points = useMemo(() => exerciseHistory(exercise.id, finishedSessions(data)), [exercise.id, data])
  // Según lo que se registró de verdad (el tipo se puede cambiar a mano en el entrenamiento).
  const timed = points.length > 0 && points.every((p) => p.maxWeight === 0) && points.some((p) => p.maxDuration > 0 || p.maxDistance > 0)
  const tracking = timed ? (points.some((p) => p.maxDistance > 0) ? 'distance_time' : 'time') : points.length ? 'weight_reps' : defaultTracking(exercise)
  return (
    <>
      <Suspense fallback={<div className="move-figure"><div className="move-figure-placeholder" /></div>}>
        <MoveFigure exercise={exercise} />
      </Suspense>
      <MuscleMap exercise={exercise} />
      <div>
        <h1 style={{ margin: '0 0 10px', fontSize: 26, lineHeight: 1.15 }}>{exercise.name}</h1>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <Tag accent>{muscleLabel(exercise.muscle)}</Tag>
          <Tag>{equipmentLabel(exercise.equipment)}</Tag>
          <Tag>{categoryLabel(exercise.category)}</Tag>
          <Tag>{bodyPartLabel(exercise.bodyPart)}</Tag>
          <Tag>{levelLabel(exercise.level)}</Tag>
        </div>
      </div>
      <Card title={t('Tu nota', 'Your note')} icon={StickyNote}>
        <ExerciseNoteField exerciseId={exercise.id} />
      </Card>
      {exercise.secondaryMuscles.length > 0 && (
        <Card title={t('Músculos secundarios', 'Secondary muscles')} icon={PersonStanding}>
          <span className="muted">{exercise.secondaryMuscles.map(muscleLabel).join(', ')}</span>
        </Card>
      )}
      {exercise.instructions.length > 0 && (
        <Card title={t('Cómo se hace', 'How to do it')} icon={ListOrdered}>
          {exercise.instructions.map((step, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="numbered">{i + 1}</span>
              <span style={{ fontSize: 15 }}>{step}</span>
            </div>
          ))}
        </Card>
      )}
      {points.length > 0 && tracking === 'weight_reps' && (
        <Card title={t('Tu historial', 'Your history')} icon={ChartLine}>
          <div className="grid-3">
            <Tile alt value={weight(Math.max(...points.map((p) => p.maxWeight)), unit)} label={t('Peso máximo', 'Max weight')} />
            <Tile alt value={weight(Math.max(...points.map((p) => p.e1rm)), unit)} label={t('1RM est.', 'Est. 1RM')} />
            <Tile alt value={points.length} label={t('Sesiones', 'Sessions')} />
          </div>
          {points.length >= 2 && (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: fromKg(p.e1rm, unit) }))} />
              <span className="small muted">{t(`1RM estimado (fórmula de Epley) en ${unit}`, `Estimated 1RM (Epley formula) in ${unit}`)}</span>
            </>
          )}
        </Card>
      )}
      {points.length > 0 && tracking !== 'weight_reps' && (
        <Card title={t('Tu historial', 'Your history')} icon={ChartLine}>
          <div className="grid-3">
            <Tile alt value={clock(Math.max(...points.map((p) => p.maxDuration)))} label={t('Mejor tiempo', 'Best time')} />
            {tracking === 'distance_time' && <Tile alt value={`${num(Math.max(...points.map((p) => p.maxDistance)))} km`} label={t('Más distancia', 'Longest distance')} />}
            <Tile alt value={points.length} label={t('Sesiones', 'Sessions')} />
          </div>
          {points.length >= 2 && (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: tracking === 'distance_time' ? p.maxDistance : p.maxDuration / 60 }))} />
              <span className="small muted">{tracking === 'distance_time' ? t('Kilómetros por sesión', 'Kilometres per session') : t('Minutos de la serie más larga', 'Minutes of the longest set')}</span>
            </>
          )}
        </Card>
      )}
    </>
  )
}

/** Selector de varios ejercicios, en el orden en que se marcan. */
export function ExercisePicker({ onDone, onClose }: { onDone: (list: Exercise[]) => void; onClose: () => void }) {
  const catalog = useCatalog()
  const { settings } = useData()
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter)
  const [selected, setSelected] = useState<Exercise[]>([])
  const [preview, setPreview] = useState<Exercise>()
  const results = useMemo(() => catalog.filter(filter, settings.favorites), [catalog, filter, settings.favorites])
  const { shown, sentinel } = useProgressive(results, JSON.stringify(filter))
  const toggle = (e: Exercise) =>
    setSelected((s) => (s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]))

  return (
    <Sheet title={t('Añadir ejercicios', 'Add exercises')} onClose={onClose} scrollKey={JSON.stringify(filter)}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      footer={selected.length > 0 && (
        <button className="btn primary block" onClick={() => { onDone(selected); onClose() }}>
          {selected.length === 1 ? t('Añadir 1 ejercicio', 'Add 1 exercise') : t(`Añadir ${selected.length} ejercicios`, `Add ${selected.length} exercises`)}
        </button>
      )}>
      <div className="sheet-sticky">
        <FilterBar filter={filter} setFilter={setFilter} />
        <span className="small muted">{plural(results.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises'])} · <Info size={12} style={{ verticalAlign: -1 }} /> {t('para ver cómo se hace', 'to see how it is done')}</span>
      </div>
      <div className="list">
        {shown.map((e) => {
          const index = selected.findIndex((x) => x.id === e.id)
          return (
            <div key={e.id} className="list-row" style={{ gap: 8, paddingRight: 10 }}>
              <button className="row grow" style={{ textAlign: 'left', gap: 10, minWidth: 0 }} onClick={() => toggle(e)}>
                <ExerciseRowContent exercise={e} favorite={settings.favorites.includes(e.id)} thumb={48} />
                <span className={`pick-circle ${index >= 0 ? 'active' : ''}`}>{index >= 0 ? index + 1 : ''}</span>
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

