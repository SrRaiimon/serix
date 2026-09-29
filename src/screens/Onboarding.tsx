import { Building2, ChartBar, ChartLine, ChevronLeft, CircleCheck, Circle, Dumbbell, Flame, Heart, PersonStanding, RotateCcw, Timer, WandSparkles, Weight, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Card, Chip, Segmented, useCatalog } from '../components/ui'
import type { Unit } from '../lib/format'
import { equipmentInfo, equipmentProfiles, generate, goalInfo, goals, levelInfo, levels, type GeneratedProgram, type GeneratorConfig } from '../lib/generator'
import { updateSettings, useData } from '../lib/store'
import { HealthNotice } from './Legal'
import { ProgramPreview, saveProgram } from './Routines'

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

  const finish = (p?: GeneratedProgram) => {
    if (p) saveProgram(p)
    updateSettings({ onboarded: true })
  }

  if (program) {
    return (
      <div className="app">
        <div className="nav-bar">
          <div className="left"><button className="nav-btn" onClick={() => setProgram(undefined)}><ChevronLeft size={24} /> Atrás</button></div>
          <div className="title">Vista previa</div>
          <div className="right">
            <button className="nav-btn" onClick={() => { setVariation(variation + 1); setProgram(generate(config, catalog, variation + 1)) }}><RotateCcw size={18} /> Otra</button>
          </div>
        </div>
        <div className="screen with-nav" style={{ paddingBottom: 120 }}>
          <ProgramPreview program={program} />
        </div>
        <Footer><button className="btn primary block" onClick={() => finish(program)}>Guardar programa</button></Footer>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="nav-bar" style={{ background: 'transparent', borderBottom: 0, backdropFilter: 'none' }}>
        <div className="left">
          {step > 0 && <button className="nav-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={24} /> Atrás</button>}
        </div>
        <div />
        <div className="right"><button className="nav-btn" style={{ color: 'var(--text-2)' }} onClick={() => finish()}>Saltar</button></div>
      </div>
      {step > 0 && (
        <div className="progress" style={{ margin: '0 16px' }}><div style={{ width: `${(step / LAST) * 100}%` }} /></div>
      )}
      <div className="screen" style={{ paddingTop: 16, paddingBottom: 120 }}>
        {step === 0 && (
          <>
            <Dumbbell size={64} color="var(--accent)" style={{ marginTop: 24 }} />
            <h1 style={{ fontSize: 34, margin: 0, lineHeight: 1.1 }}>Tu entrenador de bolsillo</h1>
            <p className="muted" style={{ fontSize: 19, margin: 0 }}>
              Casi 900 ejercicios con los músculos que trabaja cada uno, rutinas adaptadas a ti, registro de cada serie y estadísticas de tu progreso.
            </p>
            <Feature icon={WandSparkles} text="Programa generado según tu objetivo y tu material" />
            <Feature icon={Timer} text="Temporizador de descanso y registro rápido de series" />
            <Feature icon={ChartLine} text="Récords, volumen y progreso por ejercicio" />
            <input className="field" style={{ background: 'var(--card)', padding: 14 }} placeholder="¿Cómo te llamas?" autoComplete="given-name"
              value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
            <div className="card" style={{ gap: 6 }}>
              <HealthNotice />
              <p className="small muted" style={{ margin: 0 }}>Tus datos se guardan solo en tu móvil. Más detalles en Perfil → Legal y privacidad.</p>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <Header title="¿Cuál es tu objetivo?" subtitle="Ajustaremos series, repeticiones y descansos." />
            {goals.map((g) => (
              <Option key={g.id} icon={goalIcons[g.id]} title={g.label} detail={g.detail} active={settings.goal === g.id} onClick={() => updateSettings({ goal: g.id })} />
            ))}
          </>
        )}
        {step === 2 && (
          <>
            <Header title="¿Qué experiencia tienes?" subtitle="Así calibramos el volumen de trabajo." />
            {levels.map((l) => (
              <Option key={l.id} icon={ChartBar} title={l.label} detail={l.detail} active={settings.level === l.id} onClick={() => updateSettings({ level: l.id })} />
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <Header title="¿Cuánto tiempo tienes?" subtitle="Elegiremos la división semanal que mejor encaje." />
            <Card title="Días por semana">
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={String(n)} active={settings.days === n} onClick={() => updateSettings({ days: n })} />)}
              </div>
            </Card>
            <Card title="Minutos por sesión">
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {[30, 45, 60, 75, 90].map((n) => <Chip key={n} label={String(n)} active={settings.minutes === n} onClick={() => updateSettings({ minutes: n })} />)}
              </div>
            </Card>
          </>
        )}
        {step === 4 && (
          <>
            <Header title="¿Con qué material cuentas?" subtitle="Solo usaremos ejercicios que puedas hacer." />
            {equipmentProfiles.map((p) => (
              <Option key={p.id} icon={equipmentIcons[p.id]} title={p.label} active={settings.equipment === p.id} onClick={() => updateSettings({ equipment: p.id })} />
            ))}
          </>
        )}
        {step === 5 && (
          <>
            <Header title="Último detalle" subtitle="Puedes cambiarlo más adelante en Perfil." />
            <Card title="Unidad de peso">
              <Segmented value={settings.unit} onChange={(u: Unit) => updateSettings({ unit: u })}
                options={[{ value: 'kg', label: 'Kilogramos (kg)' }, { value: 'lb', label: 'Libras (lb)' }]} />
            </Card>
            <Card title="Tu plan">
              <span className="muted">
                {goalInfo(settings.goal).label} · {levelInfo(settings.level).label}<br />
                {settings.days} días por semana de {settings.minutes} min<br />
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
          {step === 0 ? 'Empezar' : step === LAST ? 'Crear mi programa' : 'Continuar'}
        </button>
      </Footer>
    </div>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(var(--safe-bottom) + 16px)', background: 'linear-gradient(transparent, var(--bg) 30%)' }}>
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
    <div className="row"><Icon size={24} color="var(--accent)" style={{ flexShrink: 0 }} /><span>{text}</span></div>
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
      {active ? <CircleCheck size={24} color="var(--accent)" /> : <Circle size={24} color="var(--text-3)" />}
    </button>
  )
}
