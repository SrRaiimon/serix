import { ArrowRightLeft, Building2, ChartBar, ChartLine, ChevronLeft, CircleCheck, Circle, Dumbbell, Flame, Heart, PersonStanding, RotateCcw, Target, Timer, Utensils, WandSparkles, Weight, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Card, Chip, Segmented, useCatalog } from '../components/ui'
import type { Unit } from '../lib/format'
import { equipmentInfo, equipmentProfiles, generate, goalInfo, goals, levelInfo, levels, type GeneratedProgram, type GeneratorConfig } from '../lib/generator'
import { navigate } from '../lib/router'
import { getData, updateSettings, useData } from '../lib/store'
import { HealthNotice } from './Legal'
import { ProgramPreview, saveProgram } from './Routines'
import { lang, LANGS, t } from '../lib/i18n'

const GoalsSheet = lazy(() => import('./Food').then((m) => ({ default: m.GoalsSheet })))

const goalIcons: Record<string, LucideIcon> = { hypertrophy: Dumbbell, strength: Weight, fatLoss: Flame, general: Heart }
const equipmentIcons: Record<string, LucideIcon> = { gym: Building2, dumbbells: Dumbbell, kettlebell: Weight, bands: RotateCcw, bodyweight: PersonStanding }

const LAST = 5

/** Cuestionario inicial: objetivo, nivel, disponibilidad y material; genera el primer programa. */
export function OnboardingScreen() {
  const catalog = useCatalog()
  const { settings } = useData()
  const [step, setStep] = useState(0)
  const [program, setProgram] = useState<GeneratedProgram>()
  const [variation, setVariation] = useState(0)
  const config: GeneratorConfig = { goal: settings.goal, level: settings.level, days: settings.days, minutes: settings.minutes, equipment: settings.equipment }

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
      <main className="app">
        <div className="screen" style={{ paddingTop: 48, paddingBottom: 160 }}>
          <Utensils size={56} color="var(--accent-text)" />
          <Header title={t('¿Llevas también lo que comes?', 'Do you want to track your food too?')}
            subtitle={t('Con tu peso, altura y edad calculamos las calorías y la proteína que te tocan para tu objetivo. Luego apuntas lo que comes buscando el alimento o escaneando el código de barras.',
              'With your weight, height and age we work out the calories and protein you need for your goal. Then you log what you eat by searching or scanning the barcode.')} />
          <span className="small muted">{t('Es opcional: lo puedes activar cuando quieras en la pestaña Comidas.', 'It is optional: you can turn it on any time in the Food tab.')}</span>
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
          <div className="title">{t('Vista previa', 'Preview')}</div>
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

  return (
    <main className="app">
      <div className="nav-bar" style={{ background: 'transparent', borderBottom: 0, backdropFilter: 'none' }}>
        <div className="left">
          {step > 0 && <button className="nav-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={24} /> {t('Atrás', 'Back')}</button>}
        </div>
        <div />
        <div className="right"><button className="nav-btn" style={{ color: 'var(--text-2)' }} onClick={() => finish()}>{t('Saltar', 'Skip')}</button></div>
      </div>
      {step > 0 && (
        <div className="progress" style={{ margin: '0 16px' }}><div style={{ transform: `scaleX(${step / LAST})` }} /></div>
      )}
      <div className="screen" style={{ paddingTop: 16, paddingBottom: 120 }}>
        {step === 0 && (
          <>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
              {LANGS.map((l) => <Chip key={l.id} label={l.name} active={lang() === l.id} onClick={() => updateSettings({ language: l.id })} />)}
            </div>
            <Dumbbell size={64} color="var(--accent-text)" style={{ marginTop: 8 }} />
            <h1 style={{ fontSize: 34, margin: 0, lineHeight: 1.1 }}>{t('Tu entrenador de bolsillo', 'Your pocket coach')}</h1>
            <p className="muted" style={{ fontSize: 19, margin: 0 }}>
              {t('Casi 900 ejercicios con los músculos que trabaja cada uno, rutinas adaptadas a ti, registro de cada serie y estadísticas de tu progreso.', 'Almost 900 exercises with the muscles each one works, routines tailored to you, logging for every set and stats on your progress.')}
            </p>
            <Feature icon={WandSparkles} text={t('Programa generado según tu objetivo y tu material', 'A program generated for your goal and equipment')} />
            <Feature icon={Timer} text={t('Temporizador de descanso y registro rápido de series', 'Rest timer and quick set logging')} />
            <Feature icon={ChartLine} text={t('Récords, volumen y progreso por ejercicio', 'Records, volume and progress per exercise')} />
            <input className="field" style={{ background: 'var(--card)', padding: 14 }} placeholder={t('¿Cómo te llamas?', 'What is your name?')} autoComplete="given-name"
              value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
            <div className="card" style={{ gap: 6 }}>
              <HealthNotice />
              <p className="small muted" style={{ margin: 0 }}>{t('Tus datos se guardan solo en tu móvil. Más detalles en Perfil → Legal y privacidad.', 'Your data is stored only on your phone. More details in Profile → Legal and privacy.')}</p>
            </div>
            <button className="btn plain block" onClick={() => navigate('transfer', 'receive')}>
              <ArrowRightLeft size={18} /> {t('¿Vienes de otro móvil? Pasa tus datos', 'Coming from another phone? Move your data')}
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <Header title={t('¿Cuál es tu objetivo?', 'What is your goal?')} subtitle={t('Ajustaremos series, repeticiones y descansos.', 'We will adjust sets, reps and rest.')} />
            {goals.map((g) => (
              <Option key={g.id} icon={goalIcons[g.id]} title={g.label} detail={g.detail} active={settings.goal === g.id} onClick={() => updateSettings({ goal: g.id })} />
            ))}
          </>
        )}
        {step === 2 && (
          <>
            <Header title={t('¿Qué experiencia tienes?', 'How experienced are you?')} subtitle={t('Así calibramos el volumen de trabajo.', 'This is how we set your training volume.')} />
            {levels.map((l) => (
              <Option key={l.id} icon={ChartBar} title={l.label} detail={l.detail} active={settings.level === l.id} onClick={() => updateSettings({ level: l.id })} />
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <Header title={t('¿Cuánto tiempo tienes?', 'How much time do you have?')} subtitle={t('Elegiremos la división semanal que mejor encaje.', 'We will pick the weekly split that fits best.')} />
            <Card title={t('Días por semana', 'Days per week')}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={String(n)} active={settings.days === n} onClick={() => updateSettings({ days: n })} />)}
              </div>
            </Card>
            <Card title={t('Minutos por sesión', 'Minutes per session')}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {[30, 45, 60, 75, 90].map((n) => <Chip key={n} label={String(n)} active={settings.minutes === n} onClick={() => updateSettings({ minutes: n })} />)}
              </div>
            </Card>
          </>
        )}
        {step === 4 && (
          <>
            <Header title={t('¿Con qué material cuentas?', 'What equipment do you have?')} subtitle={t('Solo usaremos ejercicios que puedas hacer.', 'We will only use exercises you can do.')} />
            {equipmentProfiles.map((p) => (
              <Option key={p.id} icon={equipmentIcons[p.id]} title={p.label} active={settings.equipment === p.id} onClick={() => updateSettings({ equipment: p.id })} />
            ))}
          </>
        )}
        {step === 5 && (
          <>
            <Header title={t('Último detalle', 'One last thing')} subtitle={t('Puedes cambiarlo más adelante en Perfil.', 'You can change it later in Profile.')} />
            <Card title={t('Unidad de peso', 'Weight unit')}>
              <Segmented value={settings.unit} onChange={(u: Unit) => updateSettings({ unit: u })}
                options={[{ value: 'kg', label: t('Kilogramos (kg)', 'Kilograms (kg)') }, { value: 'lb', label: t('Libras (lb)', 'Pounds (lb)') }]} />
            </Card>
            <Card title={t('Tu plan', 'Your plan')}>
              <span className="muted">
                {goalInfo(settings.goal).label} · {levelInfo(settings.level).label}<br />
                {t(`${settings.days} días por semana de ${settings.minutes} min`, `${settings.days} days a week, ${settings.minutes} min each`)}<br />
                {equipmentInfo(settings.equipment).label}
              </span>
            </Card>
          </>
        )}
      </div>
      <Footer>
        <button className="btn primary block" onClick={() => {
          if (step < LAST) return setStep(step + 1)
          updateSettings({ weeklyGoal: settings.days })
          setVariation(0)
          setProgram(generate(config, catalog, 0))
        }}>
          {step === 0 ? t('Empezar', 'Start') : step === LAST ? t('Crear mi programa', 'Create my program') : t('Continuar', 'Continue')}
        </button>
      </Footer>
    </main>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(var(--safe-bottom) + 16px)', background: 'var(--bg)', borderTop: '1px solid var(--separator)' }}>
      <div style={{ maxWidth: 528, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 style={{ fontSize: 32, margin: '0 0 6px', lineHeight: 1.1 }}>{title}</h1>
      <p className="muted" style={{ margin: 0 }}>{subtitle}</p>
    </div>
  )
}

function Feature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="row"><Icon size={24} color="var(--accent-text)" style={{ flexShrink: 0 }} /><span>{text}</span></div>
  )
}

function Option({ icon: Icon, title, detail, active, onClick }: { icon: LucideIcon; title: string; detail?: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`option-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="icon"><Icon size={22} /></span>
      <span className="grow">
        <strong style={{ display: 'block' }}>{title}</strong>
        {detail && <span className="small muted">{detail}</span>}
      </span>
      {active ? <CircleCheck size={24} color="var(--accent-text)" /> : <Circle size={24} color="var(--text-3)" />}
    </button>
  )
}
