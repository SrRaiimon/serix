import { Anvil, ArrowRightLeft, Barcode, BicepsFlexed, Building2, ChartBar, ChartLine, ChevronLeft, ChevronRight, CircleCheck, Circle, Dumbbell, Flame, Heart, PersonStanding, RotateCcw, ShieldCheck, Sparkles, Target, Timer, Utensils, WandSparkles, Weight, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CatalogContext, Chip, Segmented, StatBand } from '../components/ui'
import { rest, type Unit } from '../lib/format'
import { dayMinutes, equipmentInfo, equipmentProfiles, exerciseCount, generate, goalInfo, goalPreview, goals, levelInfo, levels, splitPreview, type GeneratedProgram, type GeneratorConfig } from '../lib/generator'
import { navigate } from '../lib/router'
import { getData, updateSettings, useData } from '../lib/store'
import { ProgramPreview, PullupBarRow } from '../components/Program'
import { saveProgram } from '../lib/programs'
import { lang, LANGS, t } from '../lib/i18n'

const GoalsSheet = lazy(() => import('./FoodGoals').then((m) => ({ default: m.GoalsSheet })))
// El aviso de salud está en Legal (textos largos): solo se carga en el último paso, no con la bienvenida.
const HealthNotice = lazy(() => import('./Legal').then((m) => ({ default: m.HealthNotice })))

const goalIcons: Record<string, LucideIcon> = { hypertrophy: BicepsFlexed, strength: Anvil, fatLoss: Flame, general: Heart }
const equipmentIcons: Record<string, LucideIcon> = { gym: Building2, dumbbells: Dumbbell, kettlebell: Weight, bands: RotateCcw, bodyweight: PersonStanding }
// Iconos distintos a los del material (en la misma pantalla no deben repetirse dos opciones con el mismo dibujo).

const LAST = 5

/** Cuestionario inicial: objetivo, nivel, disponibilidad y material; genera el primer programa. */
export function OnboardingScreen() {
  // Puede no haber llegado aún (la bienvenida no lo espera, ver App): solo hace falta al crear el programa,
  // y para entonces ya está (tarda ~1 s; el cuestionario, bastante más).
  const catalog = useContext(CatalogContext)
  const { settings } = useData()
  // Si se cierra la app a mitad, se vuelve al paso en que ibas (las respuestas ya se guardan en los ajustes).
  const [step, setStepState] = useState(() => {
    try { return Math.min(LAST, Number(sessionStorage.getItem('onb-step')) || 0) } catch { return 0 }
  })
  const currentStep = useRef(step)
  const goingBack = useRef(false)
  const finishing = useRef(false)
  const finishAtStart = useRef<(() => void) | undefined>(undefined)
  const showStep = (n: number) => {
    currentStep.current = n
    setStepState(n)
    try { sessionStorage.setItem('onb-step', String(n)) } catch { /* sin almacenamiento: empieza desde el principio */ }
  }
  useEffect(() => {
    const n = currentStep.current
    // El paso cero ocupa la entrada original: Atrás desde él sigue saliendo como antes.
    // Al restaurar una sesión, reconstruir sus pasos; StrictMode encuentra ya la misma entrada.
    if (history.state?.serixOnb !== n) {
      history.replaceState({ serixOnb: 0 }, '')
      for (let i = 1; i <= n; i++) history.pushState({ serixOnb: i }, '')
    }
    const onPop = (e: PopStateEvent) => {
      const previous = e.state?.serixOnb
      if (!Number.isInteger(previous) || previous < 0 || previous > LAST) return
      goingBack.current = false
      if (finishAtStart.current) {
        if (previous === 0) finishAtStart.current()
        else history.go(-previous)
        return
      }
      if (previous !== currentStep.current) {
        clearTimeout(advance.current)
        showStep(previous)
        setProgram(undefined)
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const setStep = (to: number | ((s: number) => number)) => {
    if (goingBack.current || finishing.current) return
    const s = currentStep.current
    const n = Math.max(0, Math.min(LAST, typeof to === 'function' ? to(s) : to))
    if (n === s) return
    clearTimeout(advance.current)
    if (n < s) {
      // El botón y el gesto recorren las entradas existentes, sin duplicarlas al volver.
      goingBack.current = true
      history.go(n - s)
      return
    }
    // También al saltar al resumen: dejar los pasos intermedios para poder volver uno a uno.
    for (let i = s + 1; i <= n; i++) history.pushState({ serixOnb: i }, '')
    showStep(n)
  }
  // Hacia dónde se mueve el cuestionario: al volver atrás, el paso entra por la izquierda.
  const shown = useRef({ step: 0, back: false })
  if (shown.current.step !== step) shown.current = { step, back: step < shown.current.step }
  const back = shown.current.back
  // Al cambiar de paso, el foco va a la pregunta nueva (el lector de pantalla la anuncia).
  useEffect(() => { if (step > 0) document.querySelector<HTMLElement>('.onb-question')?.focus({ preventScroll: true }) }, [step])
  // Deslizar: a la izquierda, siguiente pregunta; a la derecha, la anterior.
  const touch = useRef<{ x: number; y: number } | undefined>(undefined)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = undefined
    if (!start || step === 0) return
    const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return
    if (dx > 0) setStep(step - 1)
    else if (step < LAST) setStep(returnToEnd ? LAST : step + 1)
  }
  // Tras cambiar una respuesta desde el resumen final, «Continuar» vuelve directo a él.
  const [returnToEnd, setReturnToEnd] = useState(false)
  useEffect(() => { if (step === LAST || step === 0) setReturnToEnd(false) }, [step])
  // Objetivo y nivel: al elegir se pasa solo a la siguiente pregunta (una pausa breve para ver la marca).
  // Un solo avance pendiente: si tocas dos opciones seguidas (cambias de idea) o vuelves atrás enseguida,
  // no se saltan preguntas.
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(advance.current), [])
  const next = () => {
    // Un toque breve al elegir (en los móviles que lo permiten), y a la siguiente pregunta.
    navigator.vibrate?.(8)
    clearTimeout(advance.current)
    const from = step
    advance.current = setTimeout(() => setStep((s) => (s !== from ? s : returnToEnd ? LAST : Math.min(LAST, s + 1))), 220)
  }
  // El programa que saldría: su primer día de adelanto en el resumen y los ejercicios por día de verdad, también en
  // el paso de los minutos (la cuenta por minutos decía 6 y la vista previa, con el mismo programa, 5).
  const draft = useMemo(() => (step >= 3 && catalog ? generate({ goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment, pullupBar: settings.pullupBar }, catalog, 0) : undefined),
    [step, settings.goal, settings.level, settings.days, settings.minutes, settings.equipment, settings.pullupBar, catalog])
  const firstDay = draft?.days[0]
  // Con días distintos, el rango («5–7»): la media decía 6 con días de 7.
  const counts = draft?.days.map((d) => d.exercises.length) ?? [exerciseCount(settings.minutes)]
  const perDay = Math.min(...counts) === Math.max(...counts) ? `${counts[0]}` : `${Math.min(...counts)}–${Math.max(...counts)}`
  // Lo que dura de verdad la sesión más larga: con un principiante, el tope de series la deja por debajo de lo elegido.
  const longest = draft ? Math.round(Math.max(...draft.days.map((d) => dayMinutes(d.exercises)))) : settings.minutes
  const split = splitPreview({ goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment })
  const [program, setProgram] = useState<GeneratedProgram>()
  const [variation, setVariation] = useState(0)
  const config: GeneratorConfig = { goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment, pullupBar: settings.pullupBar }

  // Aviso al tocar un día que dejaría la semana con menos de 2 o más de 6.
  // Con un número que cambia en cada intento: el mismo texto otra vez no se volvía a pintar y el lector no lo repetía.
  const [dayLimit, setDayLimitState] = useState<{ text: string; n: number }>()
  const setDayLimit = (text: string | undefined) => setDayLimitState((d) => (text ? { text, n: (d?.n ?? 0) + 1 } : undefined))
  // Días tocados sobre el reparto sugerido mientras aún no llegan a 2 (todavía no se guardan).
  const [picking, setPicking] = useState<number[]>()
  useEffect(() => setDayLimit(undefined), [step])
  // Tras guardar el programa, una pregunta más: si quiere llevar también la comida.
  const [foodStep, setFoodStep] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  // Al pasar a la vista previa o al paso de comidas, el foco va a su título (como entre preguntas).
  useEffect(() => { if (program || foodStep) document.querySelector<HTMLElement>('.onb-screen-title')?.focus({ preventScroll: true }) }, [!!program, foodStep])
  const finish = (p?: GeneratedProgram) => {
    if (finishing.current) return
    finishing.current = true
    clearTimeout(advance.current)
    const complete = () => {
      finishAtStart.current = undefined
      history.replaceState(null, '')
      // «Saltar» o terminar: la próxima vez el cuestionario empieza desde el principio.
      try { sessionStorage.removeItem('onb-step') } catch { /* sin almacenamiento */ }
      if (p) saveProgram(p)
      // A quien empieza de cero le basta lo básico: el modo sencillo oculta RPE y opciones avanzadas (se
      // cambia en Perfil). Solo la primera vez: al repetir el cuestionario no se toca lo que ya usa.
      const firstTime = settings.simpleMode === undefined && getData().sessions.length === 0
      // Quien empieza no tiene «novedades» que ver: ya lo estrena todo.
      updateSettings({ onboarded: true, seenVersion: __APP_VERSION__, ...(firstTime && settings.level === 'beginner' ? { simpleMode: true } : {}) })
    }
    finishAtStart.current = complete
    // Volver antes de desmontar: GoalsSheet sigue abierta y su limpieza ya no encuentra su entrada.
    // Si se cerró con Atrás, esa entrada ya se consumió y no se cuenta de nuevo.
    const steps = currentStep.current + (history.state?.serixDialog ? 1 : 0)
    if (!goingBack.current) {
      if (steps) history.go(-steps)
      else complete()
    }
  }

  if (foodStep) {
    return (
      <main className="app onb">
        <div className="screen onb-body" style={{ paddingTop: 32 }}>
          <div className="onb-hero">
            <span className="hero-ribbon" aria-hidden="true" />
            <span className="onb-hero-icon"><Utensils size={30} aria-hidden="true" /></span>
            <span className="small muted onb-step">{t('Programa guardado · Un último paso opcional', 'Program saved · One last optional step')}</span>
            <h1 className="onb-question onb-screen-title" tabIndex={-1}>{t('¿Quieres apuntar también lo que comes?', 'Do you want to track your food too?')}</h1>
            <p className="onb-lead">{t('Con tu peso, altura y edad calculamos las calorías y la proteína que te tocan para tu objetivo.', 'With your weight, height and age we work out the calories and protein you need for your goal.')}</p>
          </div>
          <ul className="onb-features">
            <Feature icon={Target} text={t('Calorías y proteína del día, que se ajustan cuando entrenas', 'Daily calories and protein that adjust when you train')} />
            <Feature icon={Barcode} text={t('Apunta buscando el alimento o escaneando el código de barras', 'Log by searching for the food or scanning the barcode')} />
            <Feature icon={Sparkles} text={t('Te propone un menú que cuadra con tu objetivo', 'Suggests a menu that fits your goal')} />
          </ul>
          <span className="small muted onb-time">{t('Es opcional: lo puedes activar cuando quieras en la pestaña Comidas.', 'It is optional: you can turn it on any time in the Food tab.')}</span>
        </div>
        <Footer>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn primary block" onClick={() => setGoalsOpen(true)}><Target size={18} /> {t('Sí, calcular mis calorías', 'Yes, work out my calories')}</button>
            <button className="btn plain block" onClick={() => finish()}>{t('Solo quiero entrenar', 'I just want to train')}</button>
          </div>
        </Footer>
        {goalsOpen && <Suspense fallback={null}><GoalsSheet onClose={() => finish()} /></Suspense>}
      </main>
    )
  }

  if (program) {
    return (
      <main className="app">
        <div className="nav-bar">
          <div className="left"><button className="nav-btn" onClick={() => setProgram(undefined)}><ChevronLeft size={24} /> {t('Atrás', 'Back')}</button></div>
          {/* El título solo para el lector de pantalla (recibe el foco): a la vista ya lo dice la tarjeta del programa,
              y así «Otra propuesta» cabe en una línea. */}
          <h1 className="sr-only onb-screen-title" tabIndex={-1}>{t('Vista previa', 'Preview')}</h1>
          <div />
          <div className="right">
            <button className="nav-btn onb-nav-alt" onClick={() => { if (!catalog) return; setVariation(variation + 1); setProgram(generate(config, catalog, variation + 1)) }}><RotateCcw size={18} /> {t('Otra propuesta', 'Another one')}</button>
          </div>
        </div>
        <div className="screen with-nav" style={{ paddingBottom: 120 }}>
          <ProgramPreview program={program} />
        </div>
        <Footer><button className="btn primary block" onClick={() => { saveProgram(program); setProgram(undefined); setFoodStep(true) }}>{t('Guardar programa', 'Save program')}</button></Footer>
      </main>
    )
  }

  // Días de la semana con entreno para el dibujo de «Tu semana» (L a D), según cuántos días elijas.
  const WEEK_PATTERN: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] }
  const weekLetters = t('LMXJVSD', 'MTWTFSS').split('')
  // Los días que has tocado (se guardan como tus días de entreno) o, si no, un reparto orientativo.
  // Fijados (los has tocado) en tinta; sugeridos, solo con borde: no deben parecer elegidos.
  const fixedDays = !!settings.trainingDays?.length || !!picking
  const trainingDays = picking ?? (settings.trainingDays?.length ? settings.trainingDays : (WEEK_PATTERN[settings.days] ?? []))
  const dayNames = [t('lunes', 'Monday'), t('martes', 'Tuesday'), t('miércoles', 'Wednesday'), t('jueves', 'Thursday'), t('viernes', 'Friday'), t('sábado', 'Saturday'), t('domingo', 'Sunday')]
  const toggleDay = (i: number) => {
    // Sobre el reparto sugerido, el primer toque empieza a elegir desde cero: quien toca L, X y V para
    // fijarlos quiere esos tres (antes el toque en L lo quitaba, porque el sugerido contaba como elegido).
    const base = fixedDays ? trainingDays : []
    const next = base.includes(i) ? base.filter((d) => d !== i) : [...base, i].sort((a, b) => a - b)
    navigator.vibrate?.(6)
    if (next.length < 2 && !settings.trainingDays?.length) {
      setPicking(next.length ? next : undefined)
      setDayLimit(next.length ? t('Elige al menos otro día.', 'Pick at least one more day.') : undefined)
      return
    }
    // Entre 2 y 6 días, como en la lista de números. Si no se puede, se dice (antes el toque no hacía nada).
    if (next.length < 2 || next.length > 6) {
      setDayLimit(next.length < 2 ? t('Como mínimo, 2 días por semana.', 'At least 2 days a week.') : t('Como máximo, 6 días: uno para descansar.', 'At most 6 days: keep one to rest.'))
      return
    }
    setDayLimit(undefined)
    setPicking(undefined)
    updateSettings({ days: next.length, trainingDays: next, weeklyGoal: next.length })
  }

  return (
    <main className="app onb">
      <div className="nav-bar onb-nav">
        <div className="left">
          {step > 0 && <button className="nav-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={24} /> {t('Atrás', 'Back')}</button>}
        </div>
        <div />
        <div className="right"><button className="nav-btn" style={{ color: 'var(--text-2)' }} onClick={() => finish()}>{t('Saltar', 'Skip')}</button></div>
      </div>
      {/* Un tramo por pregunta: los hechos en tinta y el actual en naranja (la cinta de «aquí estás»). */}
      {step > 0 && (
        <div className="onb-steps" role="progressbar" aria-label={t('Progreso del cuestionario', 'Questionnaire progress')}
          aria-valuemin={1} aria-valuemax={LAST} aria-valuenow={step} aria-valuetext={t(`Paso ${step} de ${LAST}`, `Step ${step} of ${LAST}`)}>
          {Array.from({ length: LAST }, (_, i) => <span key={i} className={i + 1 < step ? 'done' : i + 1 === step ? 'current' : ''} />)}
        </div>
      )}
      {/* `key`: cada paso entra con su animación al cambiar. */}
      <div className={`screen onb-body ${back ? 'back' : ''}`} key={step} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {step === 0 && (
          <>
            <div className="onb-langs" role="group" aria-label="Idioma · Language">
              {LANGS.map((l) => <Chip key={l.id} label={l.name} active={lang() === l.id} onClick={() => updateSettings({ language: l.id })} />)}
            </div>
            <div className="onb-hero">
              <span className="hero-ribbon" aria-hidden="true" />
              <img className="onb-logo" src="icons/serix.svg" width={72} height={72} alt="" />
              <h1 className="onb-title">{t('Tu entrenador de bolsillo', 'Your pocket coach')}</h1>
              <p className="onb-lead">
                {t('Más de 900 ejercicios con los músculos que trabaja cada uno, rutinas adaptadas a ti, registro de cada serie y estadísticas de tu progreso.', 'Over 900 exercises with the muscles each one works, routines tailored to you, logging for every set and stats on your progress.')}
              </p>
            </div>
            <ul className="onb-features">
              <Feature icon={WandSparkles} text={t('Programa generado según tu objetivo y tu material', 'A program generated for your goal and equipment')} />
              <Feature icon={Timer} text={t('Temporizador de descanso y registro rápido de series', 'Rest timer and quick set logging')} />
              <Feature icon={ChartLine} text={t('Récords, volumen y progreso por ejercicio', 'Records, volume and progress per exercise')} />
            </ul>
            <span className="small muted onb-time">{t('Cinco preguntas rápidas: menos de un minuto. Sin cuenta: todo se queda en tu móvil.', 'Five quick questions: under a minute. No account: everything stays on your phone.')}</span>
            {/* Enlace discreto: un botón más empujaba «¿Vienes de otro móvil?» bajo el botón de Empezar. */}
            <button className="link-btn small onb-privacy" onClick={() => navigate('legal')}>
              <ShieldCheck size={14} aria-hidden="true" /> {t('Leer la privacidad antes de empezar', 'Read the privacy notice first')}
            </button>
            <button className="btn plain block" onClick={() => navigate('transfer', 'receive')}>
              <ArrowRightLeft size={18} /> {t('¿Vienes de otro móvil? Pasa tus datos', 'Coming from another phone? Move your data')}
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <Header step={step} title={t('¿Cuál es tu objetivo?', 'What is your goal?')} subtitle={t('Ajustaremos series, repeticiones y descansos.', 'We will adjust sets, reps and rest.')} autoNext />
            <Choices label={t('Objetivo', 'Goal')}>
              {goals.map((g) => (
                <Option key={g.id} icon={goalIcons[g.id]} title={g.label} detail={g.detail} meta={goalMeta(g.id)} active={settings.goal === g.id} onClick={(e) => { updateSettings({ goal: g.id }); if (e.detail > 0) next() }} />
              ))}
            </Choices>
          </>
        )}
        {step === 2 && (
          <>
            <Header step={step} title={t('¿Qué experiencia tienes?', 'How experienced are you?')} subtitle={t('Así calibramos el volumen de trabajo.', 'This is how we set your training volume.')} autoNext />
            <Choices label={t('Experiencia', 'Experience')}>
              {levels.map((l, i) => (
                <Option key={l.id} icon={ChartBar} bars={i + 1} title={l.label} detail={l.detail} active={settings.level === l.id} onClick={(e) => { updateSettings({ level: l.id }); if (e.detail > 0) next() }} />
              ))}
            </Choices>
          </>
        )}
        {step === 3 && (
          <>
            <Header step={step} title={t('¿Cuánto tiempo tienes?', 'How much time do you have?')} subtitle={t('Elegiremos la división semanal que mejor encaje.', 'We will pick the weekly split that fits best.')} />
            <section className="onb-block">
              <h2 className="onb-label">{t('Días por semana', 'Days per week')}</h2>
              {/* Elegir el número deja un reparto orientativo (sin días fijos); tocar la semana fija tus días. */}
              <NumberPicker label={t('Días por semana', 'Days per week')} values={[2, 3, 4, 5, 6]} value={settings.days} onChange={(days) => { setPicking(undefined); updateSettings({ days, trainingDays: undefined }) }} />
              <div className="onb-week" role="group" aria-label={t('Qué días entrenas', 'Which days you train')}>
                {weekLetters.map((letter, i) => (
                  <button key={i} className={trainingDays.includes(i) ? (fixedDays ? 'on' : 'hint') : ''} aria-pressed={fixedDays && trainingDays.includes(i)} onClick={() => toggleDay(i)}>
                    <span aria-hidden="true">{letter}</span><span className="sr-only">{dayNames[i]}</span>
                  </button>
                ))}
              </div>
              <span className="tiny muted" role="status">{dayLimit ? <strong className="onb-day-limit" key={dayLimit.n}>{dayLimit.text}</strong> : fixedDays
                ? t('Tus días de entreno: Inicio te dirá cuándo toca. Se cambian en Perfil.', 'Your training days: Home will tell you when it is time. Change them in Profile.')
                : t('Toca los días que te vengan bien para fijarlos (opcional).', 'Tap the days that suit you to set them (optional).')}</span>
              <p className="small onb-note">
                <strong>{split.name}</strong>
                {' · '}
                {settings.level === 'beginner'
                  ? t('Para empezar, lo ideal son 3 o 4 días.', 'When starting out, 3 or 4 days is ideal.')
                  : t('Con 3-5 días se progresa bien; más, solo si descansas lo suficiente.', 'With 3-5 days you progress well; more only if you rest enough.')}
                {settings.level === 'beginner' && settings.days >= 5 && ` ${t('Si eliges más, el programa reparte el trabajo para no pasarte.', 'If you choose more, the program spreads the work so you do not overdo it.')}`}
              </p>
            </section>
            <section className="onb-block">
              <h2 className="onb-label">{t('Minutos por sesión', 'Minutes per session')}</h2>
              <NumberPicker label={t('Minutos por sesión', 'Minutes per session')} values={[30, 45, 60, 75, 90]} value={settings.minutes} onChange={(minutes) => updateSettings({ minutes })} />
              <p className="small onb-note">{t(`Unos ${perDay} ejercicios por sesión, con calentamiento incluido.`, `About ${perDay} exercises per session, warm-up included.`)}
                {settings.level === 'beginner' && longest < settings.minutes - 10 && ` ${t(`Para empezar, sesiones de unos ${longest} min: más series aún no suman.`, `To start with, sessions of about ${longest} min: more sets do not add anything yet.`)}`}</p>
            </section>
          </>
        )}
        {step === 4 && (
          <>
            <Header step={step} title={t('¿Con qué material cuentas?', 'What equipment do you have?')} subtitle={t('Solo usaremos ejercicios que puedas hacer.', 'We will only use exercises you can do.')} />
            <Choices label={t('Material', 'Equipment')}>
              {equipmentProfiles.map((p) => (
                <Option key={p.id} icon={equipmentIcons[p.id]} title={p.label} detail={p.detail} active={settings.equipment === p.id} onClick={() => updateSettings({ equipment: p.id })} />
              ))}
            </Choices>
            {settings.equipment !== 'gym' && <div className="list"><PullupBarRow value={!!settings.pullupBar} onChange={(v) => updateSettings({ pullupBar: v || undefined })} /></div>}
          </>
        )}
        {step === 5 && (
          <>
            <Header step={step} title={t('Tu plan', 'Your plan')} subtitle={t('Revísalo y toca cualquier fila para cambiarla.', 'Check it and tap any row to change it.')} />
            {/* Las cifras del plan, como en el resto de la app (Archivo grande en una banda). */}
            <StatBand items={[
              { value: settings.days, label: t('días / semana', 'days / week') },
              { value: longest < settings.minutes - 5 ? `~${longest}` : settings.minutes, label: t('min / sesión', 'min / session') },
              { value: perDay, label: t('ejercicios / día', 'exercises / day') },
            ]} />
            {/* Un adelanto del primer entreno: lo que te vas a encontrar al pulsar «Empezar». */}
            {firstDay && (
              <section className="onb-block onb-first">
                <h2 className="onb-label">{t('Tu primer entreno', 'Your first workout')}</h2>
                <strong className="onb-first-name">{firstDay.name.replace(/^[^·]*·\s*/, '')}</strong>
                <ol className="onb-first-list">
                  {firstDay.exercises.slice(0, 4).map((x) => <li key={x.exercise.id}><span className="grow">{x.exercise.name}</span><span className="muted">{x.sets} × {x.repsMin}-{x.repsMax}</span></li>)}
                </ol>
                {firstDay.exercises.length > 4 && <span className="small muted">{t(`y ${firstDay.exercises.length - 4} más`, `and ${firstDay.exercises.length - 4} more`)}</span>}
              </section>
            )}
            {/* El resumen se puede tocar: cada fila lleva a su pregunta (y al volver, aquí de nuevo). */}
            <div className="list">
              {([
                [1, t('Objetivo', 'Goal'), goalInfo(settings.goal).label],
                [2, t('Experiencia', 'Experience'), levelInfo(settings.level).label],
                [3, t('Semana', 'Week'), split.name],
                [4, t('Material', 'Equipment'), equipmentInfo(settings.equipment).label + (settings.equipment !== 'gym' && settings.pullupBar ? ` + ${t('barra', 'bar')}` : '')],
              ] as const).map(([target, label, value]) => (
                <button key={target} className="list-row" onClick={() => { setReturnToEnd(true); setStep(target) }}>
                  <span className="grow">{label}</span>
                  <span className="muted onb-value">{value}</span>
                  <ChevronRight size={18} className="chevron" aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="list-header">{t('Sobre ti', 'About you')}</div>
            <div className="list">
              <label className="list-row">
                <span>{t('Nombre', 'Name')}</span>
                <input className="grow" style={{ textAlign: 'right', color: 'var(--text-2)', minHeight: 44 }} placeholder={t('Opcional', 'Optional')} autoComplete="given-name"
                  maxLength={40} value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} onBlur={() => updateSettings({ name: settings.name.trim() })} />
              </label>
              <div className="list-row">
                <span className="grow">{t('Unidad de peso', 'Weight unit')}</span>
                <div style={{ width: 120 }}>
                  <Segmented value={settings.unit} onChange={(u: Unit) => updateSettings({ unit: u })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
                </div>
              </div>
            </div>
            {/* Antes de crear el programa, a la vista y no al pie de la bienvenida. */}
            <div className="card onb-notice">
              <Suspense fallback={null}><HealthNotice /></Suspense>
              <p className="small muted" style={{ margin: 0 }}>{t('Tus datos se guardan solo en tu móvil.', 'Your data is stored only on your phone.')} <button className="link-btn" onClick={() => navigate('legal')}>{t('Legal y privacidad', 'Legal and privacy')}</button></p>
            </div>
          </>
        )}
      </div>
      <Footer>
        <button className="btn primary block" disabled={step === LAST && !catalog} onClick={() => {
          if (step < LAST) return setStep(returnToEnd && step > 0 ? LAST : step + 1)
          if (!catalog) return
          updateSettings({ weeklyGoal: settings.days })
          try { sessionStorage.removeItem('onb-step') } catch { /* nada que borrar */ }
          setVariation(0)
          setProgram(generate(config, catalog, 0))
        }}>
          {step === 0 ? t('Empezar', 'Start') : step === LAST ? (catalog ? t('Crear mi programa', 'Create my program') : t('Cargando ejercicios…', 'Loading exercises…')) : returnToEnd ? t('Volver al resumen', 'Back to summary') : t('Continuar', 'Continue')}
        </button>
      </Footer>
    </main>
  )
}

/** Números grandes para elegir (días, minutos): como las cifras del resto de la app, en Archivo. */
function NumberPicker({ label, values, value, onChange }: { label: string; values: number[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="onb-numbers" role="group" aria-label={label}>
      {values.map((v) => (
        <button key={v} aria-pressed={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>{v}</button>
      ))}
    </div>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(var(--safe-bottom) + 16px)', background: 'var(--bg)', borderTop: '1px solid var(--separator)' }}>
      <div style={{ maxWidth: 528, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

/**
 * `autoNext`: al tocar una opción se pasa sola a la siguiente pregunta. Se dice antes (WCAG 3.2.2 lo permite si
 * se avisa): con teclado no pasa, pero con VoiceOver o TalkBack el doble toque es un toque más y no se distingue.
 */
function Header({ title, subtitle, step, autoNext }: { title: string; subtitle: string; step?: number; autoNext?: boolean }) {
  return (
    <div className="onb-head">
      {step !== undefined && <span className="small muted onb-step">{t(`Paso ${step} de ${LAST}`, `Step ${step} of ${LAST}`)}</span>}
      <h1 className="onb-question" tabIndex={-1}>{title}</h1>
      <p className="muted" style={{ margin: 0 }}>{subtitle}{autoNext && ` ${t('Al elegir, pasas a la siguiente pregunta.', 'Choosing one takes you to the next question.')}`}</p>
    </div>
  )
}

function Feature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <li><Icon size={20} color="var(--accent-text)" aria-hidden="true" style={{ flexShrink: 0 }} /><span>{text}</span></li>
}

/** Cómo serán los básicos con cada objetivo: lo que se nota al entrenar, no solo el nombre. */
function goalMeta(goal: GeneratorConfig['goal']): string[] {
  const p = goalPreview(goal)
  return [`${p.repsMin}-${p.repsMax} reps`, t(`descanso ${rest(p.rest)}`, `${rest(p.rest)} rest`), ...(p.cardio ? [t('+ cardio', '+ cardio')] : [])]
}

/**
 * Una opción de las preguntas de una sola elección. Al tocarla se pasa sola a la siguiente; con teclado
 * (Enter o Espacio: el clic llega con `detail` 0) solo se marca y se sigue con «Continuar», para que el
 * foco no salte a otra pregunta sin pedirlo (WCAG 3.2.2).
 */
function Option({ icon: Icon, title, detail, active, onClick, bars, meta }: { icon: LucideIcon; title: string; detail?: string; active: boolean; onClick: (e: React.MouseEvent) => void; bars?: number; meta?: string[] }) {
  return (
    <button className={`option-card onb-option ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      {/* Nivel: tres barras que se llenan (1, 2 o 3) en vez del mismo icono en las tres opciones. */}
      {bars !== undefined
        ? <span className="icon onb-bars" aria-hidden="true">{[1, 2, 3].map((b) => <i key={b} className={b <= bars ? 'on' : ''} style={{ height: 6 + b * 5 }} />)}</span>
        : <span className="icon"><Icon size={22} /></span>}
      <span className="grow">
        <strong style={{ display: 'block' }}>{title}</strong>
        {detail && <span className="small muted">{detail}</span>}
        {meta && <span className="onb-meta">{meta.map((m) => <span key={m}>{m}</span>)}</span>}
      </span>
      {active ? <CircleCheck size={24} color="var(--ink)" /> : <Circle size={24} color="var(--text-3)" />}
    </button>
  )
}

/** Opciones de una sola elección: botones con aria-pressed en un grupo con nombre (con Tab, sin flechas). */
function Choices({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="group" aria-label={label} style={{ display: 'grid', gap: 12 }}>{children}</div>
}
