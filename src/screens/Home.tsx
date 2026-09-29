import { Calendar, ClipboardList, Clock, Dumbbell, Flame, Play, Share, Smartphone, Star, Weight, WandSparkles, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Progress, Tile, useTick } from '../components/ui'
import { addDays, clock, count, day, startOfDay, startOfWeek, volume } from '../lib/format'
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from '../lib/pwa'
import { navigate } from '../lib/router'
import { sessionVolume, streakWeeks } from '../lib/stats'
import { activeSession, finishedSessions, lastPerformed, routineMinutes, useData, type AppData, type Routine, type Session } from '../lib/store'
import { openWorkout, startEmpty, startRoutine } from '../lib/workout'
import { muscleSummary } from './Routines'
import { SessionRow } from './Session'

/** Siguiente rutina del programa activo: la que va después de la última realizada. */
function nextRoutine(d: AppData): Routine | undefined {
  const sorted = [...d.routines].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  const program = sorted.filter((r) => d.settings.activeProgram && r.programName === d.settings.activeProgram)
  const pool = (program.length ? program : sorted).filter((r) => r.exercises.length)
  if (!pool.length) return undefined
  let lastIndex = -1
  let lastTime = 0
  pool.forEach((r, i) => {
    const t = lastPerformed(d, r.id)
    if (t && t > lastTime) {
      lastTime = t
      lastIndex = i
    }
  })
  return pool[(lastIndex + 1) % pool.length]
}

export function HomeScreen() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const active = activeSession(data)
  const next = nextRoutine(data)
  const { name, weeklyGoal, unit } = data.settings
  const weekStart = startOfWeek(Date.now()).getTime()
  const thisWeek = sessions.filter((s) => s.start >= weekStart)
  const thisMonth = sessions.filter((s) => new Date(s.start).getMonth() === new Date().getMonth() && new Date(s.start).getFullYear() === new Date().getFullYear())

  return (
    <div className="screen">
      <header className="large-title">
        <div className="grow">
          <p className="subtitle">{day(Date.now())}</p>
          <h1>{name ? `Hola, ${name}` : '¡Hola!'}</h1>
        </div>
      </header>

      <InstallBanner />

      {active ? <ContinueCard session={active} /> : next ? <NextCard routine={next} /> : (
        <Card title="Crea tu primer programa" icon={WandSparkles}>
          <span className="muted small">Responde unas preguntas y te preparamos una rutina adaptada a tu objetivo y material.</span>
          <button className="btn primary" onClick={() => navigate('routines')}>Ir a Rutinas</button>
        </Card>
      )}

      <WeekCard sessions={thisWeek} goal={weeklyGoal} weekStart={weekStart} />

      <div className="grid-3">
        <Tile icon={Flame} tint="#ff9500" value={streakWeeks(sessions)} label="Racha (sem.)" />
        <Tile icon={Calendar} tint="var(--blue)" value={thisMonth.length} label="Este mes" />
        <Tile icon={Weight} tint="#bf5af2" value={volume(thisWeek.reduce((t, s) => t + sessionVolume(s), 0), unit)} label="Volumen sem." />
      </div>

      <div className="grid-3">
        <button className="quick" onClick={startEmpty}><Zap size={22} />Entreno libre</button>
        <button className="quick" onClick={() => navigate('exercises')}><Dumbbell size={22} />Ejercicios</button>
        <button className="quick" onClick={() => navigate('routines')}><ClipboardList size={22} />Rutinas</button>
      </div>

      {sessions.length > 0 && (
        <>
          <h2 className="section-title">Últimos entrenamientos</h2>
          <div className="list">
            {sessions.slice(0, 3).map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}
          </div>
          <button className="nav-btn" style={{ alignSelf: 'flex-start', fontWeight: 600 }} onClick={() => navigate('progress')}>Ver todo el historial</button>
        </>
      )}
    </div>
  )
}

function NextCard({ routine }: { routine: Routine }) {
  return (
    <section className="hero">
      <div className="row between">
        <span className="kicker">SIGUIENTE ENTRENAMIENTO</span>
        {routine.programName && <span className="small clamp-1" style={{ opacity: 0.9, maxWidth: '55%' }}>{routine.programName}</span>}
      </div>
      <h2>{routine.name}</h2>
      <span style={{ opacity: 0.92 }}>{muscleSummary(routine)}</span>
      <span className="small row" style={{ gap: 14, fontWeight: 600 }}>
        <span className="row" style={{ gap: 5 }}><Dumbbell size={15} /> {count(routine.exercises.length, 'ejercicio', 'ejercicios')}</span>
        <span className="row" style={{ gap: 5 }}><Clock size={15} /> ~{routineMinutes(routine)} min</span>
      </span>
      <button className="btn start" onClick={() => startRoutine(routine)}><Play size={19} fill="currentColor" /> Empezar</button>
    </section>
  )
}

function ContinueCard({ session }: { session: Session }) {
  const now = useTick()
  return (
    <Card title="Entrenamiento en curso" icon={Dumbbell}>
      <strong style={{ fontSize: 20 }}>{session.name}</strong>
      <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>Llevas {clock((now - session.start) / 1000)}</span>
      <button className="btn primary" onClick={openWorkout}>Continuar</button>
    </Card>
  )
}

function WeekCard({ sessions, goal, weekStart }: { sessions: Session[]; goal: number; weekStart: number }) {
  const trained = new Set(sessions.map((s) => startOfDay(s.start).getTime()))
  const today = startOfDay(Date.now()).getTime()
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStart), i))
  const reached = sessions.length >= goal
  return (
    <Card>
      <div className="row between">
        <h3>Esta semana</h3>
        <strong style={{ color: reached ? 'var(--green)' : 'var(--accent)' }}>{sessions.length} de {goal}</strong>
      </div>
      <Progress value={Math.min(sessions.length, goal)} total={goal} green={reached} />
      <div className="week">
        {days.map((d, i) => {
          const t = d.getTime()
          return (
            <div key={t}>
              <span className="tiny muted bold">{'LMXJVSD'[i]}</span>
              <div className={`dot ${trained.has(t) ? 'done' : ''} ${t === today ? 'today' : ''}`}>{trained.has(t) ? '✓' : d.getDate()}</div>
            </div>
          )
        })}
      </div>
      {reached && <span className="small bold row" style={{ color: 'var(--green)', gap: 6 }}><Star size={15} fill="currentColor" /> ¡Objetivo semanal cumplido!</span>}
    </Card>
  )
}

function InstallBanner() {
  const canPrompt = useCanPromptInstall()
  const [hidden, setHidden] = useState(() => localStorage.getItem('hideInstall') === '1')
  if (hidden || isStandalone() || (!canPrompt && !isIOS())) return null
  const dismiss = () => {
    localStorage.setItem('hideInstall', '1')
    setHidden(true)
  }
  return (
    <div className="install-banner">
      <Smartphone size={26} color="var(--accent)" />
      <span className="grow small">
        <strong style={{ display: 'block' }}>Instálala en tu móvil</strong>
        {canPrompt ? 'Se abrirá como una app, a pantalla completa y sin conexión.' : (
          <>Pulsa <Share size={13} style={{ verticalAlign: -2 }} /> <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</>
        )}
      </span>
      {canPrompt && <button className="btn small primary" onClick={() => void promptInstall()}>Instalar</button>}
      <button onClick={dismiss} aria-label="Cerrar" style={{ color: 'var(--text-2)' }}><X size={18} /></button>
    </div>
  )
}
