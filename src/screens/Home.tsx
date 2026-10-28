import { CalendarCheck, Camera, Check, Flame, Scale, ChevronRight, Compass, Users, Download, Dumbbell, HeartPulse, Play, Share, Smartphone, Star, Timer, Utensils, WandSparkles, X, Zap } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Card, Progress, useTick, useToast } from '../components/ui'
import { dayPlan, weekDone, weekdayIndex } from '../lib/schedule'
import { weekRecap } from '../lib/recap'
import { newsDue } from '../lib/newsDue'
import { photoDue, streakAtRisk, weighDue } from '../lib/reminders'
import { fillBodyweights } from '../lib/bodyweight'
import { addDays, clock, day, int, parseDecimal, relative, startOfDay, startOfWeek, toKg, tons, uid, weight } from '../lib/format'
import { dayGoalOptions, dayKey, dayTotals, goalsForDay, mealLabel } from '../lib/nutrition'
import { dueMeals } from '../lib/foodReminders'
import { isIOS, isStandalone, promptInstall, useCanPromptInstall } from '../lib/pwa'
import { navigate } from '../lib/router'
import { sessionVolume, streakWeeks } from '../lib/stats'
import { activeSession, finishedSessions, update, updateSettings, useData, type Routine, type Session } from '../lib/store'
import { nextRoutine, openWorkout, routineFacts, startEmpty, startRoutine } from '../lib/workout'
import { backupDue, exportBackup, snoozeBackup } from '../lib/protect'
import { muscleSummary } from '../lib/labels'
import { RECOVERING, useRecovery } from '../components/Recovery'
import { BlockStatus } from '../components/Block'
import { blockWeek } from '../lib/block'
import { SessionRow } from '../components/SessionRow'
import { forgottenGroups } from '../lib/forgotten'
import { MAIN_GROUPS } from '../lib/labels'
import { locale, plural, t } from '../lib/i18n'
import { shareReminderDue } from '../lib/friendReminder'

// El entrenador tira del generador y de las alternativas; las novedades, de la lista entera: se cargan
// después de pintar Inicio.
const CoachCard = lazy(() => import('../components/Coach').then((m) => ({ default: m.CoachCard })))
const NewsCard = lazy(() => import('../components/News').then((m) => ({ default: m.NewsCard })))


export function HomeScreen() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const active = activeSession(data)
  const next = nextRoutine(data)
  const { name, weeklyGoal, unit } = data.settings
  const weekStart = startOfWeek(Date.now()).getTime()
  const thisWeek = sessions.filter((s) => s.start >= weekStart)
  // Semanas del calendario (no 7 × 24 h): con el cambio de hora no cuadraban.
  const prevWeekStart = addDays(new Date(weekStart), -7).getTime()
  const lastWeek = sessions.filter((s) => s.start >= prevWeekStart && s.start < weekStart)
  const thisMonth = sessions.filter((s) => new Date(s.start).getMonth() === new Date().getMonth() && new Date(s.start).getFullYear() === new Date().getFullYear())
  const risk = streakAtRisk(sessions.map((s) => s.start), streakWeeks(sessions))
  const recapDue = useMemo(() => weekdayIndex(Date.now()) <= 1 && data.settings.recapSeen !== weekStart && !!weekRecap(data, addDays(new Date(weekStart), -7).getTime()), [data, weekStart])
  const notice = ([
    ['risk', !!risk],
    ['backup', backupDue(data, sessions.length)],
    ['news', newsDue(data.settings.seenVersion)],
    ['recap', recapDue],
    ['weigh', weighDue(data)],
    ['photo', photoDue(data)],
    ['friend', shareReminderDue(data)],
  ] as const).find(([, due]) => due)?.[0]

  return (
    <div className="screen">
      <header className="large-title">
        <div className="grow">
          <p className="subtitle">{day(Date.now())}</p>
          <h1>{name ? `${t('Hola', 'Hi')}, ${name}` : t('¡Hola!', 'Hi!')}</h1>
        </div>
      </header>

      <IosDataWarning />

      {/* Lo primero, lo que toca hoy: los avisos y novedades van debajo. */}
      {active ? <ContinueCard session={active} /> : next ? <NextCard routine={next} sessions={sessions} /> : guideVisible(data, sessions.length) ? null : (
        <Card title={data.routines.length ? t('Prepara tu próxima rutina', 'Set up your next routine') : t('Crea tu primer programa', 'Create your first program')} icon={WandSparkles}>
          <span className="muted small">{t('Responde unas preguntas y te preparamos una rutina adaptada a tu objetivo y material.', 'Answer a few questions and we will build a routine for your goal and equipment.')}</span>
          <button className="btn primary" onClick={() => navigate('routines')}>{t('Ir a Rutinas', 'Go to Routines')}</button>
        </Card>
      )}
      {/* Un solo aviso a la vez, el más urgente: antes se apilaban novedades, resumen, racha, copia…
          y lo útil (la semana, las comidas) quedaba a dos pantallas. Al cerrarlo sale el siguiente. */}
      {!active && (() => {
        switch (notice) {
          case 'risk': return (
            <Card title={t(`Tu racha de ${risk!.streak} semanas está en juego`, `Your ${risk!.streak}-week streak is at stake`)} icon={Flame}>
              <span className="small muted">{risk!.daysLeft === 1
                ? t('Esta semana aún no has entrenado: hoy es el último día para mantenerla. Aunque sea un entreno corto, cuenta.', 'You have not trained this week yet: today is the last day to keep it. Even a short workout counts.')
                : t('Esta semana aún no has entrenado: entrena hoy o mañana para mantenerla. Aunque sea un entreno corto, cuenta.', 'You have not trained this week yet: train today or tomorrow to keep it. Even a short workout counts.')}</span>
            </Card>
          )
          case 'backup': return <BackupCard lastBackupAt={data.settings.lastBackupAt} />
          case 'news': return <Suspense fallback={null}><NewsCard /></Suspense>
          case 'recap': return <WeekRecapCard weekStart={weekStart} />
          case 'weigh': return <WeighInCard />
          case 'photo': return <PhotoReminderCard />
          case 'friend': return <FriendReminderCard friends={data.friends.length} />
          default: return null
        }
      })()}
      {active && backupDue(data, sessions.length) && <BackupCard lastBackupAt={data.settings.lastBackupAt} />}

      {!active && blockWeek(data.settings.block) && <div className="card"><BlockStatus /></div>}


      {/* La guía va debajo del siguiente entreno: «Empezar» queda siempre a la vista. */}
      {!active && guideVisible(data, sessions.length) && <GuideCard next={next} />}

      {/* Las cifras (racha, mes, peso movido), en una línea al pie de la semana: antes eran otra banda de tarjetas. */}
      <WeekCard sessions={thisWeek} goal={weeklyGoal} weekStart={weekStart} planned={data.settings.trainingDays} facts={sessions.length > 0 ? [
        t(`${streakWeeks(sessions)} sem. de racha`, `${streakWeeks(sessions)}-week streak`),
        t(`${thisMonth.length} este mes`, `${thisMonth.length} this month`),
        // Lo de esta semana con dos entrenos o más. Con uno solo, su volumen ya sale en «Últimos entrenamientos», y sin
        // ninguno, el de la pasada sale en su resumen de arriba: en esos casos, lo movido este mes (la misma cifra dos
        // veces, si no). Sin resumen y sin entrenos, la semana pasada.
        thisWeek.length > 1
          ? t(`${tons(thisWeek.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} esta semana`, `${tons(thisWeek.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} this week`)
          : thisWeek.length === 1 || notice === 'recap'
            ? t(`${tons(thisMonth.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} este mes`, `${tons(thisMonth.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} this month`)
            : t(`${tons(lastWeek.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} la sem. pasada`, `${tons(lastWeek.reduce((n, x) => n + sessionVolume(x), 0), unit, true)} last week`),
      ] : undefined} />

      {/* El entrenador tira del generador y de las alternativas: se carga después de pintar Inicio. */}
      {!active && <Suspense fallback={null}><CoachCard /></Suspense>}

      <FoodTodayCard />

      {/* Las herramientas, en una rejilla de 2 × 2 (antes, cuatro filas con explicación: media pantalla). */}
      <div className="home-tools">
        {([
          [Zap, t('Entreno libre', 'Free workout'), t('Sin rutina', 'No routine'), startEmpty],
          [Flame, t('Entreno del día', 'Workout of the day'), t('Corto e intenso', 'Short and intense'), () => navigate('wod')],
          [Timer, t('Temporizador', 'Timer'), t('Intervalos y cronómetro', 'Intervals and stopwatch'), () => navigate('timer')],
          [Dumbbell, t('Ejercicios', 'Exercises'), t('Cómo se hacen', 'How to do them'), () => navigate('exercises')],
        ] as const).map(([Icon, title, detail, go]) => (
          <button key={title} className="home-tool" onClick={go}>
            <Icon size={20} aria-hidden="true" />
            <span className="bold">{title}</span>
            <span className="small muted">{detail}</span>
          </button>
        ))}
      </div>

      {sessions.length > 0 && (
        <>
          <h2 className="section-title">{t('Últimos entrenamientos', 'Recent workouts')}</h2>
          <div className="list">
            {sessions.slice(0, 2).map((s) => <SessionRow key={s.id} session={s} unit={unit} onClick={() => navigate('progress', 'session', s.id)} />)}
          </div>
          <button className="nav-btn" style={{ alignSelf: 'flex-start', fontWeight: 600 }} onClick={() => navigate('progress')}>{t('Ver todo el historial', 'See full history')}</button>
        </>
      )}

      {/* Instalar es un aviso más: solo cuando no hay otro, y solo al empezar. Desde el 4.º entreno habla el
          entrenador (COACH_MIN_SESSIONS) y dos avisos juntos sobran: instalar sigue en Perfil. */}
      {!notice && sessions.length < 4 && <InstallBanner />}
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
  // Compacta: la cifra en la línea del título y una sola línea debajo (antes, cifra grande, aviso del día, barra y
  // proteína: la tarjeta más alta de Inicio después del entreno).
  const shift = !goals?.proteinOnly && goals?.shift ? (goals.shift > 0
    ? t(`Día de entreno: +${int(goals.shift)} kcal`, `Training day: +${int(goals.shift)} kcal`)
    : weekDone(data) ? t(`Día de descanso: −${int(-goals.shift)} kcal`, `Rest day: −${int(-goals.shift)} kcal`)
      : t(`Sin entreno aún hoy: −${int(-goals.shift)} kcal (sube al entrenar)`, `No workout yet today: −${int(-goals.shift)} kcal (goes up when you train)`)) : ''
  const detail = goals?.proteinOnly
    ? (totals.p < goals.protein ? t(`Te quedan ${int(goals.protein - totals.p)} g`, `${int(goals.protein - totals.p)} g left`) : t('Objetivo cumplido', 'Goal reached'))
    // Sin nada apuntado, «Te quedan 2970 kcal» repetía la cifra de arriba: solo la proteína.
    : goals && totals.kcal === 0 ? t(`Proteína: ${int(goals.protein)} g`, `Protein: ${int(goals.protein)} g`) : goals ? [
      totals.kcal <= goals.kcal ? t(`Te quedan ${int(goals.kcal - totals.kcal)} kcal`, `${int(goals.kcal - totals.kcal)} kcal left`) : t(`${int(totals.kcal - goals.kcal)} kcal de más`, `${int(totals.kcal - goals.kcal)} kcal over`),
      totals.p < goals.protein ? t(`${int(goals.protein - totals.p)} g de proteína`, `${int(goals.protein - totals.p)} g of protein`) : t('proteína cumplida', 'protein reached'),
    ].join(totals.kcal <= goals.kcal && totals.p < goals.protein ? t(' y ', ' and ') : ' · ') : t(`Proteína ${int(totals.p)} g`, `Protein ${int(totals.p)} g`)
  return (
    <button className="card food-today" onClick={() => navigate('food')}>
      <span className="row" style={{ gap: 8 }}>
        <Utensils size={17} />
        <strong className="grow">{t('Comidas de hoy', 'Food today')}</strong>
        {goals?.proteinOnly
          ? <span><strong className="food-today-kcal">{int(totals.p)}</strong><span className="muted small"> / {int(goals.protein)} g</span></span>
          : <span><strong className="food-today-kcal">{int(totals.kcal)}</strong><span className="muted small">{goals ? ` / ${int(goals.kcal)} kcal` : ' kcal'}</span></span>}
        <ChevronRight size={18} className="chevron" />
      </span>
      {goals && <Progress value={goals.proteinOnly ? totals.p : totals.kcal} total={goals.proteinOnly ? goals.protein : goals.kcal} />}
      {/* Si hoy cuenta como día de entreno (o se acaba de empezar uno), se dice: si no, el objetivo cambia sin explicación. */}
      <span className="small muted">{[shift, detail].filter(Boolean).join(' · ')}</span>
      {due.length > 0 && <span className="small due">{t(`Falta apuntar: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`, `Not logged yet: ${due.map((m) => mealLabel(m).toLowerCase()).join(', ')}`)}</span>}
    </button>
  )
}

function NextCard({ routine, sessions }: { routine: Routine; sessions: Session[] }) {
  const data = useData()
  const duration = routineFacts(data, routine)
  // Grupos de la rutina (por su músculo principal) que todavía se están recuperando.
  const muscles = new Set(routine.exercises.map((e) => e.muscle))
  const tired = useRecovery(sessions).filter((g) => g.ready < RECOVERING && g.muscles.some((m) => muscles.has(m)))
  const plan = dayPlan(data.settings)
  const trainedToday = sessions.some((s) => startOfDay(s.start).getTime() === startOfDay(Date.now()).getTime())
  // Lo que se nota de un vistazo: días sin entrenar y el grupo que más tiempo llevas sin tocar.
  const daysOff = sessions.length ? Math.round((startOfDay(Date.now()).getTime() - startOfDay(Math.max(...sessions.map((s) => s.start))).getTime()) / 86400000) : undefined
  const forgotten = forgottenGroups(sessions)[0]
  // Con el objetivo de la semana ya cumplido, un entreno más es opcional: se dice y el botón pasa a secundario
  // (antes la semana decía «¡cumplido!» y aquí seguía «Empezar» como si tocara).
  const done = weekDone(data)
  // Ya entrenado hoy: el siguiente no toca hoy (antes salía «Empezar» en grande como si tocara otra vez).
  const optional = done || trainedToday || (!!plan && !plan.today)
  return (
    <section className="hero" aria-labelledby="next-workout">
      <span className="hero-ribbon" aria-hidden="true" />
      <span className="small clamp-2 hero-meta">
        <span className="sr-only">{t('Siguiente entrenamiento', 'Next workout')}: </span>
        {done ? t('Semana cumplida · este es opcional', 'Week done · this one is optional')
          : trainedToday ? (plan
            ? t(`Hoy ya has entrenado · el próximo, el ${plan.next.toLocaleDateString(locale(), { weekday: 'long' })}`, `You already trained today · next one on ${plan.next.toLocaleDateString(locale(), { weekday: 'long' })}`)
            : t('Hoy ya has entrenado · este es el siguiente', 'You already trained today · this is the next one'))
          : plan ? (plan.today ? t('Hoy toca entrenar', 'Today is a training day')
          : t(`Hoy descansas · el próximo, el ${plan.next.toLocaleDateString(locale(), { weekday: 'long' })}`, `Rest day · next one on ${plan.next.toLocaleDateString(locale(), { weekday: 'long' })}`))
          : routine.programName ?? t('Siguiente entrenamiento', 'Next workout')}
      </span>
      <h2 id="next-workout">{routine.name}</h2>
      <span className="muted">{muscleSummary(routine)}</span>
      <div className="hero-facts">
        <span className="hero-fact"><strong>{routine.exercises.length}</strong>{routine.exercises.length === 1 ? t('ejercicio', 'exercise') : t('ejercicios', 'exercises')}</span>
        {/* Si ya la has hecho, es tu duración real (la mediana de las últimas veces), no una estimación. */}
        <span className="hero-fact"><strong>~{duration.minutes}</strong>{duration.measured ? t('min · tu media', 'min · your avg') : t('minutos', 'minutes')}</span>
        <span className="hero-fact"><strong>{duration.sets}</strong>{duration.deload ? t('series · descarga', 'sets · deload') : t('series', 'sets')}</span>
      </div>
      {(daysOff !== undefined && daysOff >= 3) || forgotten ? (
        <span className="small hero-note">
          {[
            daysOff !== undefined && daysOff >= 3 ? t(`Último entreno hace ${daysOff} días`, `Last workout ${daysOff} days ago`) : '',
            forgotten ? t(`${t(...MAIN_GROUPS[forgotten.group][0])}: ${forgotten.days} días sin entrenarlo`, `${t(...MAIN_GROUPS[forgotten.group][0])}: ${forgotten.days} days untrained`) : '',
          ].filter(Boolean).join(' · ')}
        </span>
      ) : null}
      {/* En descarga ya se baja el peso: «algo menos de peso» sobraba. */}
      {tired.length > 0 && !duration.deload && (
        <span className="small row hero-warning">
          <HeartPulse size={15} style={{ flexShrink: 0 }} />
          <span>
            {t('Aún recuperándose', 'Still recovering')}: {tired.map((g) => `${g.label} (~${g.hoursLeft} h)`).join(', ')}.{' '}
            <span style={{ fontWeight: 400 }}>{t('Si entrenas, algo menos de peso en esos ejercicios.', 'If you train, go a little lighter on those exercises.')}</span>
          </span>
        </span>
      )}
      <button className={`btn ${optional ? 'secondary' : 'primary'} start`} onClick={() => startRoutine(routine)}><Play size={19} fill="currentColor" /> {optional ? t('Empezar igualmente', 'Start anyway') : t('Empezar', 'Start')}</button>
    </section>
  )
}

/** Los lunes y martes: cómo fue la semana pasada (entrenos, marcas, comida y peso). Se cierra hasta la próxima. */
function WeekRecapCard({ weekStart }: { weekStart: number }) {
  const data = useData()
  const recap = useMemo(() => weekRecap(data, addDays(new Date(weekStart), -7).getTime()), [data, weekStart])
  if (weekdayIndex(Date.now()) > 1 || data.settings.recapSeen === weekStart || !recap) return null
  const unit = data.settings.unit
  const lines = [
    recap.workouts >= recap.goal
      ? t(`${recap.workouts} de ${recap.goal} entrenos: objetivo cumplido.`, `${recap.workouts} of ${recap.goal} workouts: goal reached.`)
      : t(`${recap.workouts} de ${recap.goal} entrenos.`, `${recap.workouts} of ${recap.goal} workouts.`),
    ...(recap.volume > 0 ? [t(`${tons(recap.volume, unit)} movidos.`, `${tons(recap.volume, unit)} moved.`)] : []),
    ...(recap.records ? [recap.records === 1 ? t('1 marca superada.', '1 personal best.') : t(`${recap.records} marcas superadas.`, `${recap.records} personal bests.`)] : []),
    ...(recap.food ? [t(`Comida: ${recap.food.met} de 7 días en tu objetivo, ${int(recap.food.protein)} g de proteína de media.`, `Food: ${recap.food.met} of 7 days on target, ${int(recap.food.protein)} g of protein on average.`)] : []),
    ...(recap.weight ? [t(`Peso: ${weight(recap.weight.kg, unit)}`, `Weight: ${weight(recap.weight.kg, unit)}`)
      + (recap.weight.change !== undefined && Math.abs(recap.weight.change) >= 0.05 ? ` (${recap.weight.change > 0 ? '+' : '−'}${weight(Math.abs(recap.weight.change), unit)})` : '') + '.'] : []),
  ]
  return (
    <Card title={t('Tu semana pasada', 'Your last week')} icon={CalendarCheck}>
      <ul className="recap-list">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <button className="btn secondary" onClick={() => updateSettings({ recapSeen: weekStart })}>{t('Entendido', 'Got it')}</button>
    </Card>
  )
}

/** Pesarse una vez por semana, sin salir de Inicio. */
function WeighInCard() {
  const { settings, measurements } = useData()
  const unit = settings.unit
  const [text, setText] = useState('')
  const value = parseDecimal(text)
  const kg = value !== null ? toKg(value, unit) : null
  const valid = kg !== null && kg >= 30 && kg <= 300
  const last = [...measurements].filter((m) => m.weight !== undefined).sort((a, b) => b.date - a.date)[0]
  const save = () => {
    if (!valid) return
    update((d) => { d.measurements.push({ id: uid(), date: Date.now(), weight: kg }) })
    fillBodyweights()
  }
  return (
    <Card title={t('¿Cuánto pesas hoy?', 'What do you weigh today?')} icon={Scale}>
      <span className="small muted">
        {last ? t(`La última vez: ${weight(last.weight!, unit)}, ${relative(last.date).toLowerCase()}. `, `Last time: ${weight(last.weight!, unit)}, ${relative(last.date).toLowerCase()}. `) : ''}
        {t('Pésate una vez por semana, mejor en ayunas: así se ajustan tus calorías y tus marcas de dominadas.', 'Weigh yourself once a week, ideally before breakfast: it keeps your calories and pull-up records accurate.')}
      </span>
      <div className="row" style={{ gap: 8 }}>
        <input className="field grow" inputMode="decimal" placeholder={unit} aria-label={t('Peso de hoy', "Today's weight")} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" disabled={!valid} onClick={save}>{t('Guardar', 'Save')}</button>
        <button className="btn secondary" onClick={() => updateSettings({ weighSnooze: Date.now() + 3 * 86400000 })}>{t('Ahora no', 'Not now')}</button>
      </div>
    </Card>
  )
}

/** Cada 4 semanas, foto de progreso (solo si ya se hizo alguna). */
function PhotoReminderCard() {
  return (
    <Card title={t('Toca foto de progreso', 'Time for a progress photo')} icon={Camera}>
      <span className="small muted">{t('Hace 4 semanas de tus últimas fotos: es cuando más se nota el cambio. Misma luz y misma postura que la otra vez.', 'It has been 4 weeks since your last photos: that is when change shows most. Same light and pose as last time.')}</span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={() => navigate('profile', 'photos')}>{t('Hacer fotos', 'Take photos')}</button>
        <button className="btn secondary" onClick={() => updateSettings({ photoSnooze: Date.now() + 7 * 86400000 })}>{t('Ahora no', 'Not now')}</button>
      </div>
    </Card>
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

function WeekCard({ sessions, goal, weekStart, planned, facts }: { sessions: Session[]; goal: number; weekStart: number; planned?: number[]; facts?: string[] }) {
  const trained = new Set(sessions.map((s) => startOfDay(s.start).getTime()))
  const today = startOfDay(Date.now()).getTime()
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(weekStart), i))
  const reached = sessions.length >= goal
  return (
    <Card>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <h2 className="card-title">{t('Esta semana', 'This week')}</h2>
        {/* Para el lector de pantalla, en una frase: «3 / 3 entrenos» suelto no decía de qué. */}
        <span className="week-count"><span aria-hidden="true"><strong>{sessions.length}</strong> / {goal} {t('entrenos', 'workouts')}</span>
          <span className="sr-only">{t(`${sessions.length} de ${goal} entrenos esta semana`, `${sessions.length} of ${goal} workouts this week`)}</span></span>
      </div>
      {/* Cada día dice qué es: antes se oían «L», «19», «✓» sueltos. */}
      <div className="week" role="list">
        {days.map((d, i) => {
          const time = d.getTime()
          const state = trained.has(time) ? 'done' : time < today ? 'past' : time > today ? 'future' : ''
          const plan = planned?.includes(i) && !trained.has(time)
          const status = trained.has(time) ? t('entrenado', 'trained') : plan ? t('toca entrenar', 'training planned') : time < today ? t('sin entrenar', 'no workout') : ''
          return (
            <div key={time} role="listitem" aria-label={[time === today ? t('Hoy', 'Today') : '', day(d), status].filter(Boolean).join(', ')} className={plan ? 'planned' : undefined}>
              <span aria-hidden="true" className={`tiny bold ${time === today ? '' : 'muted'}`}>{time === today ? t('HOY', 'TODAY') : t('LMXJVSD', 'MTWTFSS')[i]}</span>
              <div aria-hidden="true" className={`dot ${state} ${time === today ? 'today' : ''}`}>{trained.has(time) ? '✓' : d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {reached && <span className="small bold row" style={{ color: 'var(--green-text)', gap: 6 }}><Star size={15} fill="currentColor" /> {t('¡Objetivo semanal cumplido!', 'Weekly goal reached!')}</span>}
      {facts && <span className="small muted">{facts.join(' · ')}</span>}
    </Card>
  )
}

/**
 * iPhone sin instalar: Safari borra los datos de una web que no se abre en 7 días (las añadidas a la
 * pantalla de inicio no). Va arriba y solo se aplaza unos días: perder el historial es lo peor que pasa.
 */
function IosDataWarning() {
  const key = 'iosWarnUntil'
  const read = () => { try { return Number(localStorage.getItem(key) ?? 0) } catch { return 0 } }
  const [until, setUntil] = useState(read)
  // Un navegador que sabe instalar la app (con su botón «Instalar») no es Safari de iPhone, aunque lo
  // parezca (un Mac táctil): salían los dos avisos a la vez, con instrucciones distintas.
  const canPrompt = useCanPromptInstall()
  if (!isIOS() || canPrompt || isStandalone() || Date.now() < until) return null
  const later = () => {
    const next = Date.now() + 3 * 86400000
    try { localStorage.setItem(key, String(next)) } catch { /* sin almacenamiento: se vuelve a ver */ }
    setUntil(next)
  }
  return (
    <div className="card ios-warning" role="alert">
      <strong>{t('Añádela a la pantalla de inicio', 'Add it to your Home Screen')}</strong>
      <span className="small">
        {t('En iPhone, si usas Serix desde Safari y pasas 7 días sin abrirla, Safari puede borrar tus entrenos y comidas. Instalada no pasa.', 'On iPhone, if you use Serix in Safari and do not open it for 7 days, Safari may delete your workouts and food. Installed, it does not.')}
      </span>
      <span className="small">{t('Pulsa', 'Tap')} <Share size={13} style={{ verticalAlign: -2 }} /> <b>{t('Compartir', 'Share')}</b> {t('y luego', 'and then')} <b>{t('Añadir a pantalla de inicio', 'Add to Home Screen')}</b>.</span>
      <button className="btn secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={later}>{t('Recordármelo luego', 'Remind me later')}</button>
    </div>
  )
}

function InstallBanner() {
  const canPrompt = useCanPromptInstall()
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('hideInstall') === '1' } catch { return false } })
  // En iPhone se encarga IosDataWarning (arriba y con el aviso de los datos).
  if (hidden || isStandalone() || !canPrompt) return null
  const dismiss = () => {
    try { localStorage.setItem('hideInstall', '1') } catch { /* se vuelve a ver la próxima vez */ }
    setHidden(true)
  }
  return (
    <div className="install-banner">
      <Smartphone size={26} color="var(--text-2)" />
      <span className="grow small">
        <strong style={{ display: 'block' }}>{t('Instálala en tu móvil', 'Install it on your phone')}</strong>
        {t('Se abrirá como una app, a pantalla completa y sin conexión, y tus datos quedan mejor protegidos.', 'It opens like an app, full screen and offline, and your data is better protected.')}
      </span>
      <button className="btn small secondary" onClick={() => void promptInstall()}>{t('Instalar', 'Install')}</button>
      <button className="hit" onClick={dismiss} aria-label={t('Cerrar', 'Close')} style={{ color: 'var(--text-2)' }}><X size={18} /></button>
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
        <button className="btn secondary grow" onClick={() => void import('../lib/friends').then(({ shareMine, copiedToast }) => shareMine().then((r) => r === 'copied' && showToast(copiedToast())))}>{t('Compartir', 'Share')}</button>
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
        {t(`Tus datos solo están en este móvil${lastBackupAt ? ` (última copia: ${day(lastBackupAt)})` : ''}. Guarda una copia en Drive, iCloud o tu correo por si cambias de móvil.`,
          `Your data is only on this phone${lastBackupAt ? ` (last backup: ${day(lastBackupAt)})` : ''}. Save a copy to Drive, iCloud or your email in case you switch phones.`)}
      </span>
      {/* Secundario: el botón naranja de Inicio es «Empezar» (dos naranjas se disputaban la acción principal). */}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn secondary grow" onClick={() => void exportBackup()}>{t('Guardar copia', 'Save backup')}</button>
        {/* Aplazar, como texto: con relleno pesaba más que «Guardar copia». */}
        <button className="link-btn backup-later" onClick={snoozeBackup}>{t('Más tarde', 'Later')}</button>
      </div>
    </Card>
  )
}
