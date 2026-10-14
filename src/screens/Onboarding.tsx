import { ArrowRightLeft, Barcode, Building2, ChartBar, ChartLine, ChevronLeft, ChevronRight, CircleCheck, Circle, Dumbbell, Flame, Heart, PersonStanding, RotateCcw, Sparkles, Target, Timer, Utensils, WandSparkles, Weight, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Chip, Segmented, StatBand, useCatalog } from '../components/ui'
import type { Unit } from '../lib/format'
import { equipmentInfo, equipmentProfiles, exerciseCount, generate, goalInfo, goals, levelInfo, levels, splitPreview, type GeneratedProgram, type GeneratorConfig } from '../lib/generator'
import { navigate } from '../lib/router'
import { getData, updateSettings, useData } from '../lib/store'
import { HealthNotice } from './Legal'
import { ProgramPreview, PullupBarRow, saveProgram } from './Routines'
import { lang, LANGS, t } from '../lib/i18n'

const GoalsSheet = lazy(() => import('./FoodGoals').then((m) => ({ default: m.GoalsSheet })))

const goalIcons: Record<string, LucideIcon> = { hypertrophy: Dumbbell, strength: Weight, fatLoss: Flame, general: Heart }
const equipmentIcons: Record<string, LucideIcon> = { gym: Building2, dumbbells: Dumbbell, kettlebell: Weight, bands: RotateCcw, bodyweight: PersonStanding }

const LAST = 5

/** Cuestionario inicial: objetivo, nivel, disponibilidad y material; genera el primer programa. */
export function OnboardingScreen() {
  const catalog = useCatalog()
  const { settings } = useData()
  const [step, setStep] = useState(0)
  // Hacia dónde se mueve el cuestionario: al volver atrás, el paso entra por la izquierda.
  const shown = useRef({ step: 0, back: false })
  if (shown.current.step !== step) shown.current = { step, back: step < shown.current.step }
  const back = shown.current.back
  // Tras cambiar una respuesta desde el resumen final, «Continuar» vuelve directo a él.
  const [returnToEnd, setReturnToEnd] = useState(false)
  useEffect(() => { if (step === LAST || step === 0) setReturnToEnd(false) }, [step])
  // Objetivo y nivel: al elegir se pasa solo a la siguiente pregunta (una pausa breve para ver la marca).
  const next = () => {
    // Un toque breve al elegir (en los móviles que lo permiten), y a la siguiente pregunta.
    navigator.vibrate?.(8)
    setTimeout(() => setStep((s) => (returnToEnd ? LAST : Math.min(LAST, s + 1))), 220)
  }
  const split = splitPreview({ goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment })
  const [program, setProgram] = useState<GeneratedProgram>()
  const [variation, setVariation] = useState(0)
  const config: GeneratorConfig = { goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment, pullupBar: settings.pullupBar }

  // Tras guardar el programa, una pregunta más: si quiere llevar también la comida.
  const [foodStep, setFoodStep] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const finish = (p?: GeneratedProgram) => {
    if (p) saveProgram(p)
    // A quien empieza de cero le basta lo básico: el modo sencillo oculta RPE y opciones avanzadas (se
    // cambia en Perfil). Solo la primera vez: al repetir el cuestionario no se toca lo que ya usa.
    const firstTime = settings.simpleMode === undefined && getData().sessions.length === 0
    // Quien empieza no tiene «novedades» que ver: ya lo estrena todo.
    updateSettings({ onboarded: true, seenVersion: __APP_VERSION__, ...(firstTime && settings.level === 'beginner' ? { simpleMode: true } : {}) })
  }

  if (foodStep) {
    return (
      <main className="app onb">
        <div className="screen onb-body" style={{ paddingTop: 32 }}>
          <div className="onb-hero">
            <span className="hero-ribbon" aria-hidden="true" />
            <span className="onb-hero-icon"><Utensils size={30} aria-hidden="true" /></span>
            <span className="small muted onb-step">{t('Programa guardado · Un último paso opcional', 'Program saved · One last optional step')}</span>
            <h1 className="onb-question">{t('¿Llevas también lo que comes?', 'Do you want to track your food too?')}</h1>
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
          <h1 className="title" style={{ margin: 0, font: 'inherit' }}>{t('Vista previa', 'Preview')}</h1>
          <div className="right">
            <button className="nav-btn" onClick={() => { setVariation(variation + 1); setProgram(generate(config, catalog, variation + 1)) }}><RotateCcw size={18} /> {t('Otra', 'Another')}</button>
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
  const trainingDays = settings.trainingDays?.length ? settings.trainingDays : (WEEK_PATTERN[settings.days] ?? [])
  const dayNames = [t('lunes', 'Monday'), t('martes', 'Tuesday'), t('miércoles', 'Wednesday'), t('jueves', 'Thursday'), t('viernes', 'Friday'), t('sábado', 'Saturday'), t('domingo', 'Sunday')]
  const toggleDay = (i: number) => {
    const next = trainingDays.includes(i) ? trainingDays.filter((d) => d !== i) : [...trainingDays, i].sort((a, b) => a - b)
    // Entre 2 y 6 días, como en la lista de números.
    if (next.length < 2 || next.length > 6) return
    navigator.vibrate?.(6)
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
      <div className={`screen onb-body ${back ? 'back' : ''}`} key={step}>
        {step === 0 && (
          <>
            <div className="onb-langs" role="group" aria-label="Idioma · Language">
              {LANGS.map((l) => <Chip key={l.id} label={l.name} active={lang() === l.id} onClick={() => updateSettings({ language: l.id })} />)}
            </div>
            <div className="onb-hero">
              <span className="hero-ribbon" aria-hidden="true" />
              <img className="onb-logo" src="icons/icon-192.png" width={72} height={72} alt="" />
              <h1 className="onb-title">{t('Tu entrenador de bolsillo', 'Your pocket coach')}</h1>
              <p className="onb-lead">
                {t('Casi 900 ejercicios con los músculos que trabaja cada uno, rutinas adaptadas a ti, registro de cada serie y estadísticas de tu progreso.', 'Almost 900 exercises with the muscles each one works, routines tailored to you, logging for every set and stats on your progress.')}
              </p>
            </div>
            <ul className="onb-features">
              <Feature icon={WandSparkles} text={t('Programa generado según tu objetivo y tu material', 'A program generated for your goal and equipment')} />
              <Feature icon={Timer} text={t('Temporizador de descanso y registro rápido de series', 'Rest timer and quick set logging')} />
              <Feature icon={ChartLine} text={t('Récords, volumen y progreso por ejercicio', 'Records, volume and progress per exercise')} />
            </ul>
            <span className="small muted onb-time">{t('Cuatro preguntas y listo: menos de un minuto.', 'Four questions and you are done: under a minute.')}</span>
            <button className="btn plain block" onClick={() => navigate('transfer', 'receive')}>
              <ArrowRightLeft size={18} /> {t('¿Vienes de otro móvil? Pasa tus datos', 'Coming from another phone? Move your data')}
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <Header step={step} title={t('¿Cuál es tu objetivo?', 'What is your goal?')} subtitle={t('Ajustaremos series, repeticiones y descansos.', 'We will adjust sets, reps and rest.')} />
            <Choices label={t('Objetivo', 'Goal')}>
              {goals.map((g) => (
                <Option key={g.id} icon={goalIcons[g.id]} title={g.label} detail={g.detail} active={settings.goal === g.id} onClick={() => { updateSettings({ goal: g.id }); next() }} />
              ))}
            </Choices>
          </>
        )}
        {step === 2 && (
          <>
            <Header step={step} title={t('¿Qué experiencia tienes?', 'How experienced are you?')} subtitle={t('Así calibramos el volumen de trabajo.', 'This is how we set your training volume.')} />
            <Choices label={t('Experiencia', 'Experience')}>
              {levels.map((l, i) => (
                <Option key={l.id} icon={ChartBar} bars={i + 1} title={l.label} detail={l.detail} active={settings.level === l.id} onClick={() => { updateSettings({ level: l.id }); next() }} />
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
              <NumberPicker label={t('Días por semana', 'Days per week')} values={[2, 3, 4, 5, 6]} value={settings.days} onChange={(days) => updateSettings({ days, trainingDays: undefined })} />
              <div className="onb-week" role="group" aria-label={t('Qué días entrenas', 'Which days you train')}>
                {weekLetters.map((letter, i) => (
                  <button key={i} className={trainingDays.includes(i) ? 'on' : ''} aria-pressed={trainingDays.includes(i)} onClick={() => toggleDay(i)}>
                    <span aria-hidden="true">{letter}</span><span className="sr-only">{dayNames[i]}</span>
                  </button>
                ))}
              </div>
              <span className="tiny muted">{settings.trainingDays?.length
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
              <p className="small onb-note">{t(`Unos ${exerciseCount(settings.minutes)} ejercicios por sesión, con calentamiento incluido.`, `About ${exerciseCount(settings.minutes)} exercises per session, warm-up included.`)}</p>
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
              { value: settings.minutes, label: t('min / sesión', 'min / session') },
              { value: exerciseCount(settings.minutes), label: t('ejercicios', 'exercises') },
            ]} />
            {/* El resumen se puede tocar: cada fila lleva a su pregunta (y al volver, aquí de nuevo). */}
            <div className="list">
              {([
                [1, t('Objetivo', 'Goal'), goalInfo(settings.goal).label],
                [2, t('Experiencia', 'Experience'), levelInfo(settings.level).label],
                [3, t('Semana', 'Week'), split.name],
                [4, t('Material', 'Equipment'), equipmentInfo(settings.equipment).label + (settings.equipment !== 'gym' && settings.pullupBar ? ` + ${t('barra', 'bar')}` : '')],
              ] as const).map(([target, label, value]) => (
                <button key={target} className="list-row" onClick={() => { setReturnToEnd(true); setStep(target) }} aria-label={`${label}: ${value}. ${t('Cambiar', 'Change')}`}>
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
                  value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
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
              <HealthNotice />
              <p className="small muted" style={{ margin: 0 }}>{t('Tus datos se guardan solo en tu móvil. Más detalles en Perfil → Legal y privacidad.', 'Your data is stored only on your phone. More details in Profile → Legal and privacy.')}</p>
            </div>
          </>
        )}
      </div>
      <Footer>
        <button className="btn primary block" onClick={() => {
          if (step < LAST) return setStep(returnToEnd && step > 0 ? LAST : step + 1)
          updateSettings({ weeklyGoal: settings.days })
          setVariation(0)
          setProgram(generate(config, catalog, 0))
        }}>
          {step === 0 ? t('Empezar', 'Start') : step === LAST ? t('Crear mi programa', 'Create my program') : returnToEnd ? t('Volver al resumen', 'Back to summary') : t('Continuar', 'Continue')}
        </button>
      </Footer>
    </main>
  )
}

/** Números grandes para elegir (días, minutos): como las cifras del resto de la app, en Archivo. */
function NumberPicker({ label, values, value, onChange }: { label: string; values: number[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="onb-numbers" role="radiogroup" aria-label={label}>
      {values.map((v) => (
        <button key={v} role="radio" aria-checked={v === value} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>{v}</button>
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

function Header({ title, subtitle, step }: { title: string; subtitle: string; step?: number }) {
  return (
    <div className="onb-head">
      {step !== undefined && <span className="small muted onb-step">{t(`Paso ${step} de ${LAST}`, `Step ${step} of ${LAST}`)}</span>}
      <h1 className="onb-question">{title}</h1>
      <p className="muted" style={{ margin: 0 }}>{subtitle}</p>
    </div>
  )
}

function Feature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <li><Icon size={20} color="var(--accent-text)" aria-hidden="true" style={{ flexShrink: 0 }} /><span>{text}</span></li>
}

function Option({ icon: Icon, title, detail, active, onClick, bars }: { icon: LucideIcon; title: string; detail?: string; active: boolean; onClick: () => void; bars?: number }) {
  return (
    <button className={`option-card onb-option ${active ? 'active' : ''}`} onClick={onClick} role="radio" aria-checked={active}>
      {/* Nivel: tres barras que se llenan (1, 2 o 3) en vez del mismo icono en las tres opciones. */}
      {bars !== undefined
        ? <span className="icon onb-bars" aria-hidden="true">{[1, 2, 3].map((b) => <i key={b} className={b <= bars ? 'on' : ''} style={{ height: 6 + b * 5 }} />)}</span>
        : <span className="icon"><Icon size={22} /></span>}
      <span className="grow">
        <strong style={{ display: 'block' }}>{title}</strong>
        {detail && <span className="small muted">{detail}</span>}
      </span>
      {active ? <CircleCheck size={24} color="var(--ink)" /> : <Circle size={24} color="var(--text-3)" />}
    </button>
  )
}

/** Opciones de una sola elección: el lector de pantalla las anuncia como grupo de radio («2 de 4, marcada»). */
function Choices({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="radiogroup" aria-label={label} style={{ display: 'grid', gap: 12 }}>{children}</div>
}
