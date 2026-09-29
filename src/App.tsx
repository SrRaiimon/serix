import { ChartLine, ChevronUp, ClipboardList, Dumbbell, House, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FigureGallery } from './components/MoveFigure'
import { CatalogContext, useTick } from './components/ui'
import { loadCatalog, type Catalog } from './lib/catalog'
import { migrateCatalog } from './lib/migrate'
import { autoProtect } from './lib/protect'
import { clock } from './lib/format'
import { currentTab, navigate, useRoute, type Tab } from './lib/router'
import { activeSession, loadData, useData } from './lib/store'
import { closeSummary, openWorkout, useWorkoutUI } from './lib/workout'
import { ExerciseDetailScreen, ExercisesScreen } from './screens/Exercises'
import { HomeScreen } from './screens/Home'
import { ImportScreen } from './screens/Import'
import { LegalScreen } from './screens/Legal'
import { OnboardingScreen } from './screens/Onboarding'
import { CalendarScreen, MeasurementsScreen, OneRepMaxScreen, PlatesScreen, ProfileScreen } from './screens/Profile'
import { ExerciseProgressScreen, ProgressScreen } from './screens/Progress'
import { RoutineDetailScreen, RoutinesScreen } from './screens/Routines'
import { SessionDetailScreen, SummarySheet } from './screens/Session'
import { WorkoutScreen } from './screens/Workout'

export default function App() {
  const [catalog, setCatalog] = useState<Catalog>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    Promise.all([loadCatalog(), loadData()])
      .then(([c]) => {
        migrateCatalog(c)
        setCatalog(c)
        void autoProtect()
      })
      .catch((e: unknown) => setError(`No se pudo cargar la app: ${String(e)}`))
  }, [])

  if (!catalog) {
    return (
      <div className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <Dumbbell size={56} />
        <p className="muted">{error ?? 'Cargando ejercicios…'}</p>
      </div>
    )
  }

  return (
    <CatalogContext.Provider value={catalog}>
      <Main />
    </CatalogContext.Provider>
  )
}

function Main() {
  const data = useData()
  const route = useRoute()
  const ui = useWorkoutUI()
  const active = activeSession(data)

  // Un enlace compartido se abre directamente, aunque sea la primera vez que se usa la app.
  if (route[0] === 'import' && route[1]) return <div className="app"><ImportScreen code={route[1]} /></div>
  // Galería de figuras para revisarlas durante el desarrollo (no existe en la versión publicada).
  if (import.meta.env.DEV && route[0] === 'dev-figuras') return <FigureGallery />
  if (!data.settings.onboarded) return <OnboardingScreen />

  const tab = currentTab(route)
  const summary = ui.summaryId ? data.sessions.find((s) => s.id === ui.summaryId) : undefined

  return (
    <div className={`app ${active && !ui.open ? 'has-active' : ''}`}>
      <Screen route={route} />
      {active && !ui.open && <ActiveBar name={active.name} start={active.start} />}
      <TabBar tab={tab} />
      {active && ui.open && <WorkoutScreen session={active} />}
      {summary && <SummarySheet session={summary} onClose={closeSummary} />}
    </div>
  )
}

function Screen({ route }: { route: string[] }) {
  const [tab, a, b] = route
  switch (tab) {
    case 'routines':
      return a ? <RoutineDetailScreen id={a} /> : <RoutinesScreen />
    case 'exercises':
      return a ? <ExerciseDetailScreen id={a} /> : <ExercisesScreen />
    case 'progress':
      if (a === 'session' && b) return <SessionDetailScreen id={b} />
      if (a === 'exercise' && b) return <ExerciseProgressScreen id={b} />
      return <ProgressScreen />
    case 'profile':
      if (a === 'measurements') return <MeasurementsScreen />
      if (a === 'calendar') return <CalendarScreen />
      if (a === '1rm') return <OneRepMaxScreen />
      if (a === 'plates') return <PlatesScreen />
      if (a === 'legal') return <LegalScreen />
      return <ProfileScreen />
    default:
      return <HomeScreen />
  }
}

const tabItems: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Inicio', icon: House },
  { id: 'routines', label: 'Rutinas', icon: ClipboardList },
  { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
  { id: 'progress', label: 'Progreso', icon: ChartLine },
  { id: 'profile', label: 'Perfil', icon: User },
]

function TabBar({ tab }: { tab: Tab }) {
  return (
    <nav className="tabbar">
      {tabItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => navigate(id)}>
          <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} />
          {label}
        </button>
      ))}
    </nav>
  )
}

function ActiveBar({ name, start }: { name: string; start: number }) {
  const now = useTick()
  return (
    <button className="active-bar" onClick={openWorkout}>
      <Dumbbell size={22} />
      <span className="grow">
        <strong className="clamp-1" style={{ display: 'block' }}>{name}</strong>
        <span className="small" style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
          En curso · {clock((now - start) / 1000)}
        </span>
      </span>
      <strong>Continuar</strong>
      <ChevronUp size={20} />
    </button>
  )
}
