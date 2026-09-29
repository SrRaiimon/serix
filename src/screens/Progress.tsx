import { ArrowDownRight, ArrowUpRight, Calendar, ChartColumn, ChartLine, Clock, Dumbbell, Info, PersonStanding, Trophy, Weight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarChart, HBarChart, LineChart } from '../components/charts'
import { MuscleHeatMap } from '../components/MuscleMap'
import { Card, Empty, LargeTitle, NavBar, Segmented, Thumb, Tile, useCatalog } from '../components/ui'
import { duration, fromKg, monthYear, num, shortDay, volume, weight, weightValue } from '../lib/format'
import { muscleLabel } from '../lib/labels'
import { navigate } from '../lib/router'
import { exerciseHistory, muscleLoad, records, sessionDuration, setsByMuscle, weekly } from '../lib/stats'
import { finishedSessions, useData, type Session } from '../lib/store'
import type { Unit } from '../lib/format'
import { ExerciseSheet } from './Exercises'
import { SessionRow } from './Session'

type Section = 'summary' | 'history' | 'records'
let savedSection: Section = 'summary'

export function ProgressScreen() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const [section, setSectionState] = useState<Section>(savedSection)
  const setSection = (s: Section) => {
    savedSection = s
    setSectionState(s)
  }
  const unit = data.settings.unit

  return (
    <div className="screen">
      <LargeTitle title="Progreso" />
      {sessions.length === 0 ? (
        <Empty icon={ChartLine} title="Sin datos todavía" message="Completa tu primer entrenamiento y aquí verás tu volumen, récords y progreso por ejercicio." />
      ) : (
        <>
          <Segmented value={section} onChange={setSection} options={[
            { value: 'summary', label: 'Resumen' },
            { value: 'history', label: 'Historial' },
            { value: 'records', label: 'Récords' },
          ]} />
          {section === 'summary' && <Summary sessions={sessions} unit={unit} />}
          {section === 'history' && <History sessions={sessions} unit={unit} />}
          {section === 'records' && <Records sessions={sessions} unit={unit} />}
        </>
      )}
    </div>
  )
}

// Grupos principales que se revisan en el mapa de calor semanal.
const MAIN_GROUPS: [string, string[]][] = [
  ['Pecho', ['pectorals']], ['Espalda', ['lats', 'upper-back']], ['Hombros', ['delts']], ['Bíceps', ['biceps']],
  ['Tríceps', ['triceps']], ['Cuádriceps', ['quads']], ['Isquiotibiales', ['hamstrings']], ['Glúteos', ['glutes']], ['Abdomen', ['abs']],
]

function WeeklyMuscles({ sessions }: { sessions: Session[] }) {
  const catalog = useCatalog()
  const load = useMemo(
    () => muscleLoad(sessions, Date.now() - 7 * 86400000, (id) => catalog.get(id)?.secondaryMuscles ?? []),
    [sessions, catalog],
  )
  const trained = Object.values(load).some((v) => v > 0)
  const missing = MAIN_GROUPS.filter(([, keys]) => keys.every((k) => (load[k] ?? 0) < 1)).map(([label]) => label)
  return (
    <Card title="Músculos esta semana" icon={PersonStanding}>
      <MuscleHeatMap load={load} />
      <span className="small muted">
        {!trained
          ? 'No has entrenado en los últimos 7 días.'
          : missing.length
            ? `Sin trabajar en los últimos 7 días: ${missing.join(', ')}.`
            : 'Has trabajado todos los grupos principales en los últimos 7 días.'}
      </span>
    </Card>
  )
}

function Summary({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const weeks = weekly(sessions, 12)
  const thisWeek = weeks[weeks.length - 1]
  const muscles = setsByMuscle(sessions, Date.now() - 30 * 86400000)
  const totalTime = sessions.reduce((t, s) => t + sessionDuration(s), 0)
  return (
    <>
      <div className="grid-2">
        <Tile icon={Calendar} value={thisWeek.sessions} label="Entrenos esta semana" />
        <Tile icon={Weight} value={volume(thisWeek.volume, unit)} label="Volumen esta semana" />
        <Tile icon={Dumbbell} value={sessions.length} label="Entrenos totales" />
        <Tile icon={Clock} value={duration(totalTime)} label="Tiempo total" />
      </div>
      <WeeklyMuscles sessions={sessions} />
      <Card title="Volumen semanal" icon={ChartColumn}>
        <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: fromKg(w.volume, unit) }))} />
        <span className="small muted">Últimas 12 semanas · {unit} levantados (peso × repeticiones)</span>
      </Card>
      <Card title="Entrenamientos por semana" icon={Calendar}>
        <BarChart data={weeks.map((w) => ({ label: shortDay(w.start), value: w.sessions }))} height={130} color="var(--blue)" />
      </Card>
      {muscles.length > 0 && (
        <Card title="Series por músculo (30 días)" icon={PersonStanding}>
          <HBarChart items={muscles.map((m) => ({ label: muscleLabel(m.muscle), value: m.sets }))} />
          <span className="small muted">Para ganar músculo se suelen recomendar 10-20 series semanales por grupo.</span>
        </Card>
      )}
    </>
  )
}

function History({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const months = new Map<string, Session[]>()
  for (const s of sessions) {
    const key = monthYear(s.start)
    months.set(key, [...(months.get(key) ?? []), s])
  }
  return (
    <>
      {[...months].map(([month, list]) => (
        <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="list-header">{month} · {list.length}</div>
          <div className="list">
            {list.map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}
          </div>
        </div>
      ))}
    </>
  )
}

function Records({ sessions, unit }: { sessions: Session[]; unit: Unit }) {
  const list = records(sessions)
  if (!list.length) return <Empty icon={Trophy} title="Sin récords" message="Los récords aparecen al registrar series con peso." />
  return (
    <>
      <div className="list">
        {list.map((r) => (
          <button key={r.exerciseId} className="list-row" onClick={() => navigate('progress', 'exercise', r.exerciseId)}>
            <Thumb exerciseId={r.exerciseId} size={44} />
            <span className="grow">
              <span className="bold clamp-2" style={{ fontSize: 15 }}>{r.name}</span>
              <span className="small muted">{weight(r.weight, unit)} × {r.reps} · {shortDay(r.date)}</span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span className="bold" style={{ display: 'block' }}>{weightValue(r.e1rm, unit)}</span>
              <span className="tiny muted">1RM est.</span>
            </span>
          </button>
        ))}
      </div>
      <p className="list-footer">Mejor serie de cada ejercicio según el 1RM estimado (fórmula de Epley). Toca uno para ver su evolución.</p>
    </>
  )
}

type Metric = 'e1rm' | 'weight' | 'volume'

export function ExerciseProgressScreen({ id }: { id: string }) {
  const data = useData()
  const unit = data.settings.unit
  const sessions = useMemo(() => finishedSessions(data), [data])
  const points = useMemo(() => exerciseHistory(id, sessions), [id, sessions])
  const name = sessions.flatMap((s) => s.exercises).find((e) => e.exerciseId === id)?.name ?? 'Ejercicio'
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [detail, setDetail] = useState(false)
  const value = (p: (typeof points)[number]) => fromKg(metric === 'e1rm' ? p.e1rm : metric === 'weight' ? p.maxWeight : p.volume, unit)
  const first = points[0]
  const last = points[points.length - 1]
  const change = points.length >= 2 ? value(last) - value(first) : 0

  return (
    <>
      <NavBar showBack title={name} right={<button className="icon-btn" onClick={() => setDetail(true)} aria-label="Técnica"><Info size={19} /></button>} />
      <div className="screen with-nav">
        <Segmented value={metric} onChange={setMetric} options={[
          { value: 'e1rm', label: '1RM est.' },
          { value: 'weight', label: 'Peso máx.' },
          { value: 'volume', label: 'Volumen' },
        ]} />
        <Card>
          {points.length >= 2 ? (
            <>
              <LineChart points={points.map((p) => ({ x: p.date, y: value(p) }))} />
              <span className="bold row" style={{ gap: 6, color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {change >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                {change >= 0 ? '+' : ''}{num(change)} {unit} desde el {shortDay(first.date)}
              </span>
            </>
          ) : (
            <span className="muted">Necesitas al menos dos sesiones de este ejercicio para ver la gráfica.</span>
          )}
        </Card>
        <div className="list-header">Sesiones</div>
        <div className="list">
          {[...points].reverse().map((p) => (
            <div key={p.date} className="list-row">
              <span className="grow">{shortDay(p.date)}</span>
              <span className="small muted">máx. {weight(p.maxWeight, unit)}</span>
              <span className="bold" style={{ minWidth: 70, textAlign: 'right' }}>{weightValue(p.e1rm, unit)} <span className="tiny muted">1RM</span></span>
            </div>
          ))}
        </div>
      </div>
      {detail && <ExerciseSheet exerciseId={id} onClose={() => setDetail(false)} />}
    </>
  )
}
