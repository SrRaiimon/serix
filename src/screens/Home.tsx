import { Check, ChevronRight, Compass, Users, Download, Dumbbell, HeartPulse, Play, Share, Smartphone, Star, Timer, Utensils, WandSparkles, X, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Progress, StatBand, useTick, useToast } from '../components/ui'
import { addDays, clock, day, int, startOfDay, startOfWeek, tons } from '../lib/format'
import { dayGoalOptions, dayKey, dayTotals, goalsForDay, mealLabel } from '../lib/nutrition'
import { dueMeals } from '../lib/foodReminders'
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from '../lib/pwa'
import { navigate } from '../lib/router'
import { sessionVolume, streakWeeks } from '../lib/stats'
import { activeSession, expectedMinutes, finishedSessions, updateSettings, useData, type Routine, type Session } from '../lib/store'
import { nextRoutine, openWorkout, startEmpty, startRoutine } from '../lib/workout'
import { backupDue, exportBackup, snoozeBackup } from '../lib/protect'
import { muscleSummary } from '../lib/labels'
import { RECOVERING, useRecovery } from '../components/Recovery'
import { BlockStatus } from '../components/Block'
import { blockWeek } from '../lib/block'
import { SessionRow } from '../components/SessionRow'
import { plural, t } from '../lib/i18n'
import { copiedToast, shareMine, shareReminderDue } from '../lib/friends'


export function HomeScreen() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const active = activeSession(data)
  const next = nextRoutine(data)
  const { name, weeklyGoal, unit } = data.settings
  const weekStart = startOfWeek(Date.now()).getTime()
  const thisWeek = sessions.filter((s) => s.start >= weekStart)
  const lastWeek = sessions.filter((s) => s.start >= weekStart - 7 * 86400000 && s.start < weekStart)
  const thisMonth = sessions.filter((s) => new Date(s.start).getMonth() === new Date().getMonth() && new Date(s.start).getFullYear() === new Date().getFullYear())

  return (
    <div className="screen">
      <header className="large-title">
        <div className="grow">
          <p className="subtitle">{day(Date.now())}</p>
          <h1>{name ? `${t('Hola', 'Hi')}, ${name}` : t('¡Hola!', 'Hi!')}</h1>
        </div>
      </header>

      {backupDue(data, sessions.length) && <BackupCard lastBackupAt={data.settings.lastBackupAt} />}

      {shareReminderDue(data) && <FriendReminderCard friends={data.friends.length} />}

      {!active && guideVisible(data, sessions.length) && <GuideCard next={next} />}

      {!active && blockWeek(data.settings.block) && <div className="card"><BlockStatus /></div>}

      {active ? <ContinueCard session={active} /> : next ? <NextCard routine={next} sessions={sessions} /> : guideVisible(data, sessions.length) ? null : (
        <Card title={t('Crea tu primer programa', 'Create your first program')} icon={WandSparkles}>
          <span className="muted small">{t('Responde unas preguntas y te preparamos una rutina adaptada a tu objetivo y material.', 'Answer a few questions and we will build a routine for your goal and equipment.')}</span>
          <button className="btn primary" onClick={() => navigate('routines')}>{t('Ir a Rutinas', 'Go to Routines')}</button>
        </Card>
      )}

      <WeekCard sessions={thisWeek} goal={weeklyGoal} weekStart={weekStart} />

      <FoodTodayCard />

      {sessions.length > 0 && (
        <StatBand items={[
          { value: streakWeeks(sessions), label: t('Racha (sem.)', 'Streak (wks)') },
          { value: thisMonth.length, label: t('Este mes', 'This month') },
          thisWeek.length > 0
            ? { value: tons(thisWeek.reduce((t, s) => t + sessionVolume(s), 0), unit), label: t('Peso movido', 'Weight moved') }
            : { value: tons(lastWeek.reduce((t, s) => t + sessionVolume(s), 0), unit), label: t('Sem. pasada', 'Last week') },
        ]} />
      )}

      <div className="list">
        {([
          [Zap, t('Entreno libre', 'Free workout'), t('Sin rutina: añades los ejercicios sobre la marcha', 'No routine: add exercises as you go'), startEmpty],
          [Timer, t('Temporizador', 'Timer'), t('Intervalos, Tabata, EMOM o cuenta atrás', 'Intervals, Tabata, EMOM or countdown'), () => navigate('timer')],
          [Dumbbell, t('Ejercicios', 'Exercises'), t('Cómo se hace cada uno y qué músculos trabaja', 'How to do each one and the muscles it works'), () => navigate('exercises')],
        ] as const).map(([Icon, title, detail, go]) => (
          <button key={title} className="list-row" onClick={go}>
            <Icon size={20} aria-hidden="true" />
            <span className="grow">
              <span className="bold" style={{ display: 'block', fontSize: 15 }}>{title}</span>
              <span className="small muted">{detail}</span>
            </span>
            <ChevronRight size={18} className="muted" aria-hidden="true" />
          </button>
        ))}
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

      <InstallBanner />
    </div>
  )
}

/** Lo comido hoy frente al objetivo (Comidas). Solo si hay objetivo o algo apuntado hoy. */
function FoodTodayCard() {
  const data = useData()
  const today = dayKey()
  const entries = data.nutrition.entries.filter((e) => e.day === today)
  const base = data.settings.nutrition
  const goals = base && goalsForDay(base, data.nutrition.entries, today, dayGoalOptions(data))
  if (!goals && !entries.length) return null
  const totals = dayTotals(entries)
  const due = data.settings.foodReminders ? dueMeals(data.nutrition.entries) : []
  return (
    <button className="card food-today" onClick={() => navigate('food')}>
      <span className="row" style={{ gap: 8 }}>
        <Utensils size={17} />
        <strong className="grow">{t('Comidas de hoy', 'Food today')}</strong>
        <ChevronRight size={18} className="chevron" />
      </span>
      {goals?.proteinOnly ? (
        <>
          <span>
            <strong className="food-today-kcal">{int(totals.p)}</strong>
            <span className="muted"> / {int(goals.protein)} g {t('de proteína', 'of protein')}</span>
          </span>
          <Progress value={totals.p} total={goals.protein} />
          <span className="small muted">{totals.p < goals.protein ? t(`Te quedan ${int(goals.protein - totals.p)} g`, `${int(goals.protein - totals.p)} g left`) : t('Objetivo cumplido', 'Goal reached')}</span>
        </>
      ) : (
        <>
          <span>
            <strong className="food-today-kcal">{int(totals.kcal)}</strong>
            <span className="muted">{goals ? ` / ${int(goals.kcal)} kcal` : ' kcal'}</span>
          </span>
          {goals && <Progress value={totals.kcal} total={goals.kcal} />}
          <span className="small muted">
            {goals ? [
              totals.kcal <= goals.kcal ? t(`Te quedan ${int(goals.kcal - totals.kcal)} kcal`, `${int(goals.kcal - totals.kcal)} kcal left`) : t(`${int(totals.kcal - goals.kcal)} kcal de más`, `${int(totals.kcal - goals.kcal)} kcal over`),
              totals.p < goals.protein ? t(`${int(goals.protein - totals.p)} g de proteína`, `${int(goals.protein - totals.p)} g of protein`) : t('proteína cumplida', 'protein reached'),
            ].join(totals.kcal <= goals.kcal && totals.p < goals.protein ? t(' y ', ' and ') : ' · ') : t(`Proteína ${int(totals.p)} g`, `Protein ${int(totals.p)} g`)}
          </span>
        </>
      )}
      {due.length > 0 && <span className="small due">{t(`Falta apuntar: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`, `Not logged yet: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`)}</span>}
    </button>
  )
}

function NextCard({ routine, sessions }: { routine: Routine; sessions: Session[] }) {
  const data = useData()
  // Grupos de la rutina (por su músculo principal) que todavía se están recuperando.
  const muscles = new Set(routine.exercises.map((e) => e.muscle))
  const tired = useRecovery(sessions).filter((g) => g.ready < RECOVERING && g.muscles.some((m) => muscles.has(m)))
  return (
    <section className="hero" aria-labelledby="next-workout">
      <span className="hero-ribbon" aria-hidden="true" />
      <span className="small clamp-1 hero-meta">
        <span className="sr-only">{t('Siguiente entrenamiento', 'Next workout')}: </span>
        {routine.programName ?? t('Siguiente entrenamiento', 'Next workout')}
      </span>
      <h2 id="next-workout">{routine.name}</h2>
      <span className="muted">{muscleSummary(routine)}</span>
      <div className="hero-facts">
        <span className="hero-fact"><strong>{routine.exercises.length}</strong>{routine.exercises.length === 1 ? t('ejercicio', 'exercise') : t('ejercicios', 'exercises')}</span>
        <span className="hero-fact"><strong>~{expectedMinutes(data, routine).minutes}</strong>{t('minutos', 'minutes')}</span>
        <span className="hero-fact"><strong>{routine.exercises.reduce((n, e) => n + e.sets, 0)}</strong>{t('series', 'sets')}</span>
      </div>
      {tired.length > 0 && (
        <span className="small row hero-warning">
          <HeartPulse size={15} style={{ flexShrink: 0 }} />
          <span>
            {t('Aún recuperándose', 'Still recovering')}: {tired.map((g) => `${g.label} (~${g.hoursLeft} h)`).join(', ')}.{' '}
            <span style={{ fontWeight: 400 }}>
              {t('Puedes entrenar: baja un poco el peso o haz una serie menos en', 'You can train: lower the weight a little or do one set less on')}{' '}
              {routine.exercises.filter((e) => tired.some((g) => g.muscles.includes(e.muscle))).map((e) => e.name).join(', ')}.
            </span>
          </span>
        </span>
      )}
      <button className="btn primary start" onClick={() => startRoutine(routine)}><Play size={19} fill="currentColor" /> {t('Empezar', 'Start')}</button>
    </section>
  )
}

function ContinueCard({ session }: { session: Session }) {
  const now = useTick()
  return (
    <Card title={t('Entrenamiento en curso', 'Workout in progress')} icon={Dumbbell}>
      <strong className="exercise-name" style={{ fontSize: 22 }}>{session.name}</strong>
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
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <h2 className="card-title">{t('Esta semana', 'This week')}</h2>
        <span className="week-count"><strong>{sessions.length}</strong> / {goal} {t('entrenos', 'workouts')}</span>
      </div>
      <div className="week">
        {days.map((d, i) => {
          const time = d.getTime()
          const state = trained.has(time) ? 'done' : time < today ? 'past' : time > today ? 'future' : ''
          return (
            <div key={time}>
              <span className={`tiny bold ${time === today ? '' : 'muted'}`}>{time === today ? t('HOY', 'TODAY') : t('LMXJVSD', 'MTWTFSS')[i]}</span>
              <div className={`dot ${state} ${time === today ? 'today' : ''}`}>{trained.has(time) ? '✓' : d.getDate()}</div>
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
      <Smartphone size={26} color="var(--text-2)" />
      <span className="grow small">
        <strong style={{ display: 'block' }}>{t('Instálala en tu móvil', 'Install it on your phone')}</strong>
        {canPrompt ? t('Se abrirá como una app, a pantalla completa y sin conexión.', 'It opens like an app, full screen and offline.') : (
          <>{t('Pulsa', 'Tap')} <Share size={13} style={{ verticalAlign: -2 }} /> <b>{t('Compartir', 'Share')}</b> {t('y luego', 'and then')} <b>{t('Añadir a pantalla de inicio', 'Add to Home Screen')}</b>.</>
        )}
      </span>
      {canPrompt && <button className="btn small secondary" onClick={() => void promptInstall()}>{t('Instalar', 'Install')}</button>}
      <button onClick={dismiss} aria-label={t('Cerrar', 'Close')} style={{ color: 'var(--text-2)' }}><X size={18} /></button>
    </div>
  )
}

/** Guía de primeros pasos: solo para quien empieza (menos de 3 entrenamientos) y hasta completarla. */
function guideVisible(d: ReturnType<typeof useData>, finished: number) {
  if (d.settings.guideHidden || finished >= 3) return false
  return !(d.routines.length > 0 && finished > 0 && d.settings.guideProgressSeen)
}

function GuideCard({ next }: { next?: Routine }) {
  const data = useData()
  const finished = finishedSessions(data).length
  const steps = [
    {
      done: data.routines.length > 0,
      title: t('Elige tu rutina', 'Pick your routine'),
      detail: t('Genera un programa con tus respuestas o crea el tuyo.', 'Generate a program from your answers or build your own.'),
      action: () => navigate('routines'),
    },
    {
      done: finished > 0,
      title: t('Haz tu primer entrenamiento', 'Do your first workout'),
      detail: t('Marca cada serie al terminarla: el descanso empieza solo y la próxima vez te propone el peso.', 'Tick each set when you finish it: the rest timer starts automatically and next time the app suggests the weight.'),
      action: () => (next ? startRoutine(next) : startEmpty()),
    },
    {
      done: data.settings.guideProgressSeen === true,
      title: t('Mira tu progreso', 'Check your progress'),
      detail: t('Récords, volumen por músculo, logros y gráficas de cada ejercicio.', 'Records, volume per muscle, achievements and charts for each exercise.'),
      action: () => navigate('progress'),
    },
  ]
  const current = steps.findIndex((s) => !s.done)
  return (
    <Card title={t('Primeros pasos', 'Getting started')} icon={Compass}>
      <ol className="guide">
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : i === current ? 'current' : ''}>
            <span className="guide-mark" aria-hidden="true">{s.done ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
            <span className="grow">
              <span className="bold">{s.title}</span>
              {i === current && <span className="small muted" style={{ display: 'block' }}>{s.detail}</span>}
            </span>
            {i === current && <button className="btn primary btn-sm" onClick={s.action}>{t('Ir', 'Go')}</button>}
            <span className="sr-only">{s.done ? t('Hecho', 'Done') : t('Pendiente', 'Pending')}</span>
          </li>
        ))}
      </ol>
      <button className="link-btn small muted" onClick={() => updateSettings({ guideHidden: true })}>{t('Ocultar la guía', 'Hide the guide')}</button>
    </Card>
  )
}

/** Recordatorio de los domingos (y lunes): compartir el resumen semanal con los amigos. */
function FriendReminderCard({ friends }: { friends: number }) {
  const [toast, showToast] = useToast()
  // Hasta el martes no vuelve a salir.
  const snooze = () => updateSettings({ friendReminderSnooze: addDays(startOfDay(Date.now()), new Date().getDay() === 0 ? 2 : 1).getTime() })
  return (
    <Card title={t('Comparte tu semana', 'Share your week')} icon={Users}>
      <span className="muted small">{t(`Manda tu resumen a tus amigos para que vean cómo vas en los retos (tienes ${plural(friends, ['amigo', 'amigos'], ['friend', 'friends'])}).`,
        `Send your summary to your friends so they can see how you're doing in the challenges (you have ${plural(friends, ['amigo', 'amigos'], ['friend', 'friends'])}).`)}</span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={() => void shareMine().then((r) => r === 'copied' && showToast(copiedToast()))}>{t('Compartir', 'Share')}</button>
        <button className="btn secondary" onClick={snooze}>{t('Ahora no', 'Not now')}</button>
      </div>
      {toast}
    </Card>
  )
}

/** Recordatorio de copia: los datos solo están en este móvil. */
function BackupCard({ lastBackupAt }: { lastBackupAt?: number }) {
  return (
    <Card title={t('Guarda una copia de tus datos', 'Back up your data')} icon={Download}>
      <span className="muted small">
        {t(`Tus entrenos y comidas solo están en este móvil${lastBackupAt ? ` y tu última copia es del ${day(lastBackupAt)}` : ''}. Guarda una copia en Drive, iCloud o tu correo por si cambias de móvil o se borra la app. Se hace en un momento.`,
          `Your workouts and food are only on this phone${lastBackupAt ? ` and your last backup is from ${day(lastBackupAt)}` : ''}. Save a copy to Drive, iCloud or your email in case you switch phones or the app gets deleted. It only takes a moment.`)}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={() => void exportBackup()}>{t('Guardar copia', 'Save backup')}</button>
        <button className="btn secondary" onClick={snoozeBackup}>{t('Más tarde', 'Later')}</button>
      </div>
    </Card>
  )
}
