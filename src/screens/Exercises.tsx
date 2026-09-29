import { ChartLine, Info, ListOrdered, PersonStanding, Plus, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from '../components/charts'
import { MoveFigure } from '../components/MoveFigure'
import { MuscleMap } from '../components/MuscleMap'
import { ActionSheet, Card, Chip, Empty, LargeTitle, NavBar, Sheet, Tag, Thumb, Tile, useCatalog, useToast } from '../components/ui'
import { emptyFilter, type Exercise, type ExerciseFilter } from '../lib/catalog'
import { clock, fromKg, num, weight } from '../lib/format'
import { bodyPartLabel, bodyPartOrder, categoryKeys, categoryLabel, equipmentLabel, levelLabel, muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory } from '../lib/stats'
import { finishedSessions, update, useData } from '../lib/store'
import { defaultTargetSeconds, defaultTracking } from '../lib/tracking'

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
            placeholder="Buscar: press, sentadilla, polea…"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
          {filter.query && (
            <button onClick={() => setFilter({ ...filter, query: '' })} aria-label="Borrar"><X size={18} /></button>
          )}
        </label>
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Filtros" style={active ? { background: 'var(--accent)', color: '#fff' } : undefined}>
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <div className="chips">
        <Chip label="Todos" active={!filter.bodyPart} onClick={() => setFilter({ ...filter, bodyPart: undefined })} />
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
        <Sheet title="Filtros" onClose={() => setOpen(false)}
          left={<button className="nav-btn" onClick={() => setFilter({ ...emptyFilter, query: filter.query, bodyPart: filter.bodyPart })}>Quitar</button>}
          right={<button className="nav-btn bold" onClick={() => setOpen(false)}>Listo</button>}>
          <div className="list">
            <label className="list-row">
              <Star size={20} color="var(--gold)" />
              <span className="grow">Solo favoritos</span>
              <input type="checkbox" className="toggle" checked={filter.favoritesOnly}
                onChange={(e) => setFilter({ ...filter, favoritesOnly: e.target.checked })} />
            </label>
            <label className="list-row">
              <span className="grow">Músculo</span>
              <select className="select" value={filter.muscle ?? ''} onChange={(e) => setFilter({ ...filter, muscle: e.target.value || undefined })}>
                <option value="">Todos</option>
                {catalog.muscles.map((m) => <option key={m} value={m}>{muscleLabel(m)}</option>)}
              </select>
            </label>
            <label className="list-row">
              <span className="grow">Equipamiento</span>
              <select className="select" value={filter.equipment ?? ''} onChange={(e) => setFilter({ ...filter, equipment: e.target.value || undefined })}>
                <option value="">Todo</option>
                {catalog.equipments.map((m) => <option key={m} value={m}>{equipmentLabel(m)}</option>)}
              </select>
            </label>
            <label className="list-row">
              <span className="grow">Tipo</span>
              <select className="select" value={filter.category ?? ''} onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}>
                <option value="">Todos</option>
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
      <LargeTitle title="Ejercicios" />
      <FilterBar filter={filter} setFilter={setFilter} />
      <div className="list-header">{results.length === 1 ? '1 ejercicio' : `${results.length} ejercicios`}</div>
      {results.length === 0 ? (
        <Empty icon={Search} title="Sin resultados" message="Prueba con otra palabra o quita algún filtro." />
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
  if (!exercise) return <div className="screen"><NavBar showBack /><Empty icon={Info} title="Ejercicio no encontrado" message="" /></div>
  const fav = settings.favorites.includes(id)
  return (
    <>
      <NavBar showBack right={
        <>
          <button className="icon-btn" onClick={() => toggleFavorite(id)} aria-label="Favorito">
            <Star size={19} fill={fav ? 'var(--gold)' : 'none'} color={fav ? 'var(--gold)' : 'var(--accent)'} />
          </button>
          <button className="icon-btn" onClick={() => setAddTo(true)} aria-label="Añadir a rutina"><Plus size={20} /></button>
        </>
      } />
      <div className="screen with-nav">
        <ExerciseDetailContent exercise={exercise} />
      </div>
      {addTo && <AddToRoutine exercise={exercise} onClose={() => setAddTo(false)} onAdded={(name) => showToast(`Añadido a ${name}`)} />}
      {toast}
    </>
  )
}

function AddToRoutine({ exercise, onClose, onAdded }: { exercise: Exercise; onClose: () => void; onAdded: (name: string) => void }) {
  const { routines } = useData()
  if (!routines.length) {
    return <ActionSheet title="Aún no tienes rutinas" message="Crea una en la pestaña Rutinas." options={[{ label: 'Ir a Rutinas', onSelect: () => navigate('routines') }]} onClose={onClose} />
  }
  return (
    <ActionSheet title="Añadir a rutina" onClose={onClose} options={routines.map((r) => ({
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
      <MoveFigure exerciseId={exercise.id} label={exercise.name} />
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
      {exercise.secondaryMuscles.length > 0 && (
        <Card title="Músculos secundarios" icon={PersonStanding}>
          <span className="muted">{exercise.secondaryMuscles.map(muscleLabel).join(', ')}</span>
        </Card>
      )}
      {exercise.instructions.length > 0 && (
        <Card title="Cómo se hace" icon={ListOrdered}>
          {exercise.instructions.map((step, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="numbered">{i + 1}</span>
              <span style={{ fontSize: 15 }}>{step}</span>
            </div>
          ))}
        </Card>
      )}
      {points.length > 0 && tracking === 'weight_reps' && (
        <Card title="Tu historial" icon={ChartLine}>
          <div className="grid-3">
            <Tile alt value={weight(Math.max(...points.map((p) => p.maxWeight)), unit)} label="Peso máximo" />
            <Tile alt value={weight(Math.max(...points.map((p) => p.e1rm)), unit)} label="1RM est." />
            <Tile alt value={points.length} label="Sesiones" />
          </div>
          {points.length >= 2 && (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: fromKg(p.e1rm, unit) }))} />
              <span className="small muted">1RM estimado (fórmula de Epley) en {unit}</span>
            </>
          )}
        </Card>
      )}
      {points.length > 0 && tracking !== 'weight_reps' && (
        <Card title="Tu historial" icon={ChartLine}>
          <div className="grid-3">
            <Tile alt value={clock(Math.max(...points.map((p) => p.maxDuration)))} label="Mejor tiempo" />
            {tracking === 'distance_time' && <Tile alt value={`${num(Math.max(...points.map((p) => p.maxDistance)))} km`} label="Más distancia" />}
            <Tile alt value={points.length} label="Sesiones" />
          </div>
          {points.length >= 2 && (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: tracking === 'distance_time' ? p.maxDistance : p.maxDuration / 60 }))} />
              <span className="small muted">{tracking === 'distance_time' ? 'Kilómetros por sesión' : 'Minutos de la serie más larga'}</span>
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
    <Sheet title="Añadir ejercicios" onClose={onClose} scrollKey={JSON.stringify(filter)}
      left={<button className="nav-btn" onClick={onClose}>Cancelar</button>}
      footer={selected.length > 0 && (
        <button className="btn primary block" onClick={() => { onDone(selected); onClose() }}>
          {selected.length === 1 ? 'Añadir 1 ejercicio' : `Añadir ${selected.length} ejercicios`}
        </button>
      )}>
      <div className="sheet-sticky">
        <FilterBar filter={filter} setFilter={setFilter} />
        <span className="small muted">{results.length === 1 ? '1 ejercicio' : `${results.length} ejercicios`} · <Info size={12} style={{ verticalAlign: -1 }} /> para ver cómo se hace</span>
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
              <button className="set-check" style={{ color: 'var(--text-3)', width: 30 }} onClick={() => setPreview(e)} aria-label="Ver ejercicio">
                <Info size={20} />
              </button>
            </div>
          )
        })}
      </div>
      {sentinel}
      {preview && (
        <Sheet title="" onClose={() => setPreview(undefined)} right={<button className="nav-btn bold" onClick={() => setPreview(undefined)}>Cerrar</button>}>
          <ExerciseDetailContent exercise={preview} />
        </Sheet>
      )}
    </Sheet>
  )
}

export function ExerciseSheet({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const exercise = useCatalog().get(exerciseId)
  return (
    <Sheet title="" onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>Cerrar</button>}>
      {exercise ? <ExerciseDetailContent exercise={exercise} /> : <p className="muted">Ejercicio no disponible.</p>}
    </Sheet>
  )
}

