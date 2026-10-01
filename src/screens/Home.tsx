import { Calendar, ClipboardList, Clock, Download, Dumbbell, Flame, Play, Share, Smartphone, Star, Weight, WandSparkles, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Progress, Tile, useTick } from '../components/ui'
import { addDays, clock, day, startOfDay, startOfWeek, volume } from '../lib/format'
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from '../lib/pwa'
import { navigate } from '../lib/router'
import { sessionVolume, streakWeeks } from '../lib/stats'
import { activeSession, finishedSessions, lastPerformed, routineMinutes, useData, type AppData, type Routine, type Session } from '../lib/store'
import { openWorkout, startEmpty, startRoutine } from '../lib/workout'
import { backupDue, exportBackup, snoozeBackup } from '../lib/protect'
import { muscleSummary } from '../lib/labels'
import { SessionRow } from '../components/SessionRow'
import { plural, t } from '../lib/i18n'

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
          <h1>{name ? `${t('Hola', 'Hi')}, ${name}` : t('¡Hola!', 'Hi!')}</h1>
        </div>
      </header>

      <InstallBanner />

      {backupDue(data, sessions.length) && <BackupCard lastBackupAt={data.settings.lastBackupAt} />}

      {active ? <ContinueCard session={active} /> : next ? <NextCard routine={next} /> : (
        <Card title={t('Crea tu primer programa', 'Create your first program')} icon={WandSparkles}>
          <span className="muted small">{t('Responde unas preguntas y te preparamos una rutina adaptada a tu objetivo y material.', 'Answer a few questions and we will build a routine for your goal and equipment.')}</span>
          <button className="btn primary" onClick={() => navigate('routines')}>{t('Ir a Rutinas', 'Go to Routines')}</button>
        </Card>
      )}

      <WeekCard sessions={thisWeek} goal={weeklyGoal} weekStart={weekStart} />

      <div className="grid-3">
        <Tile icon={Flame} tint="#ff9500" value={streakWeeks(sessions)} label={t('Racha (sem.)', 'Streak (wks)')} />
        <Tile icon={Calendar} tint="var(--blue)" value={thisMonth.length} label={t('Este mes', 'This month')} />
        <Tile icon={Weight} tint="#bf5af2" value={volume(thisWeek.reduce((t, s) => t + sessionVolume(s), 0), unit)} label={t('Volumen sem.', 'Weekly volume')} />
      </div>

      <div className="grid-3">
        <button className="quick" onClick={startEmpty}><Zap size={22} />{t('Entreno libre', 'Free workout')}</button>
        <button className="quick" onClick={() => navigate('exercises')}><Dumbbell size={22} />{t('Ejercicios', 'Exercises')}</button>
        <button className="quick" onClick={() => navigate('routines')}><ClipboardList size={22} />{t('Rutinas', 'Routines')}</button>
      </div>

      {sessions.length > 0 && (
        <>
          <h2 className="section-title">{t('Últimos entrenamientos', 'Recent workouts')}</h2>
          <div className="list">
            {sessions.slice(0, 3).map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}
          </div>
          <button className="nav-btn" style={{ alignSelf: 'flex-start', fontWeight: 600 }} onClick={() => navigate('progress')}>{t('Ver todo el historial', 'See full history')}</button>
        </>
      )}
    </div>
  )
}

function NextCard({ routine }: { routine: Routine }) {
  return (
    <section className="hero">
      <div className="row between">
        <span className="kicker">{t('SIGUIENTE ENTRENAMIENTO', 'NEXT WORKOUT')}</span>
        {routine.programName && <span className="small clamp-1" style={{ opacity: 0.9, maxWidth: '55%' }}>{routine.programName}</span>}
      </div>
      <h2>{routine.name}</h2>
      <span style={{ opacity: 0.92 }}>{muscleSummary(routine)}</span>
      <span className="small row" style={{ gap: 14, fontWeight: 600 }}>
        <span className="row" style={{ gap: 5 }}><Dumbbell size={15} /> {plural(routine.exercises.length, ['ejercicio', 'ejercicios'], ['exercise', 'exercises'])}</span>
        <span className="row" style={{ gap: 5 }}><Clock size={15} /> ~{routineMinutes(routine)} min</span>
      </span>
      <button className="btn start" onClick={() => startRoutine(routine)}><Play size={19} fill="currentColor" /> {t('Empezar', 'Start')}</button>
    </section>
  )
}

function ContinueCard({ session }: { session: Session }) {
  const now = useTick()
  return (
    <Card title={t('Entrenamiento en curso', 'Workout in progress')} icon={Dumbbell}>
      <strong style={{ fontSize: 20 }}>{session.name}</strong>
      <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{t('Llevas', 'Elapsed')} {clock((now - session.start) / 1000)}</span>
      <button className="btn primary" onClick={openWorkout}>{t('Continuar', 'Resume')}</button>
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
        <h2 className="card-title">{t('Esta semana', 'This week')}</h2>
        <strong style={{ color: reached ? 'var(--green-text)' : 'var(--accent-text)' }}>{t(`${sessions.length} de ${goal}`, `${sessions.length} of ${goal}`)}</strong>
      </div>
      <Progress value={Math.min(sessions.length, goal)} total={goal} green={reached} />
      <div className="week">
        {days.map((d, i) => {
          const time = d.getTime()
          return (
            <div key={time}>
              <span className="tiny muted bold">{t('LMXJVSD', 'MTWTFSS')[i]}</span>
              <div className={`dot ${trained.has(time) ? 'done' : ''} ${time === today ? 'today' : ''}`}>{trained.has(time) ? '✓' : d.getDate()}</div>
            </div>
          )
        })}
      </div>
      {reached && <span className="small bold row" style={{ color: 'var(--green-text)', gap: 6 }}><Star size={15} fill="currentColor" /> {t('¡Objetivo semanal cumplido!', 'Weekly goal reached!')}</span>}
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
      <Smartphone size={26} color="var(--accent-text)" />
      <span className="grow small">
        <strong style={{ display: 'block' }}>{t('Instálala en tu móvil', 'Install it on your phone')}</strong>
        {canPrompt ? t('Se abrirá como una app, a pantalla completa y sin conexión.', 'It opens like an app, full screen and offline.') : (
          <>{t('Pulsa', 'Tap')} <Share size={13} style={{ verticalAlign: -2 }} /> <b>{t('Compartir', 'Share')}</b> {t('y luego', 'and then')} <b>{t('Añadir a pantalla de inicio', 'Add to Home Screen')}</b>.</>
        )}
      </span>
      {canPrompt && <button className="btn small primary" onClick={() => void promptInstall()}>{t('Instalar', 'Install')}</button>}
      <button onClick={dismiss} aria-label={t('Cerrar', 'Close')} style={{ color: 'var(--text-2)' }}><X size={18} /></button>
    </div>
  )
}

/** Recordatorio de copia: los datos solo están en este móvil. */
function BackupCard({ lastBackupAt }: { lastBackupAt?: number }) {
  return (
    <Card title={t('Guarda una copia de tus datos', 'Back up your data')} icon={Download}>
      <span className="muted small">
        {t(`Tus entrenamientos solo están en este móvil${lastBackupAt ? ` y tu última copia es del ${day(lastBackupAt)}` : ''}. Exporta una copia y guárdala (en la nube, en tu correo…) por si cambias de móvil o se borra la app.`,
          `Your workouts are only on this phone${lastBackupAt ? ` and your last backup is from ${day(lastBackupAt)}` : ''}. Export a backup and keep it (in the cloud, in your email…) in case you switch phones or the app gets deleted.`)}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={exportBackup}>{t('Exportar copia', 'Export backup')}</button>
        <button className="btn secondary" onClick={snoozeBackup}>{t('Más tarde', 'Later')}</button>
      </div>
    </Card>
  )
}
