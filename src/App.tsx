import { ChartLine, ChevronUp, ClipboardList, Dumbbell, House, User } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { CatalogContext, useTick } from './components/ui'
import { loadCatalog, type Catalog } from './lib/catalog'
import { migrateCatalog } from './lib/migrate'
import { autoProtect } from './lib/protect'
import { clock } from './lib/format'
import { currentTab, navigate, useRoute, type Tab } from './lib/router'
import { activeSession, loadData, useData } from './lib/store'
import { closeSummary, openWorkout, useWorkoutUI } from './lib/workout'
import { HomeScreen } from './screens/Home'

// El resto de pantallas se descargan al abrirlas (el service worker las guarda todas para usarlas sin
// conexión), así la app arranca antes. Inicio va en el paquete principal porque es la primera.
const screens = {
  exercises: () => import('./screens/Exercises'),
  import: () => import('./screens/Import'),
  legal: () => import('./screens/Legal'),
  onboarding: () => import('./screens/Onboarding'),
  profile: () => import('./screens/Profile'),
  progress: () => import('./screens/Progress'),
  routines: () => import('./screens/Routines'),
  session: () => import('./screens/Session'),
  workout: () => import('./screens/Workout'),
}
const ExercisesScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExercisesScreen })))
const ExerciseDetailScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExerciseDetailScreen })))
const ImportScreen = lazy(() => screens.import().then((m) => ({ default: m.ImportScreen })))
const LegalScreen = lazy(() => screens.legal().then((m) => ({ default: m.LegalScreen })))
const OnboardingScreen = lazy(() => screens.onboarding().then((m) => ({ default: m.OnboardingScreen })))
const ProfileScreen = lazy(() => screens.profile().then((m) => ({ default: m.ProfileScreen })))
const MeasurementsScreen = lazy(() => screens.profile().then((m) => ({ default: m.MeasurementsScreen })))
const CalendarScreen = lazy(() => screens.profile().then((m) => ({ default: m.CalendarScreen })))
const OneRepMaxScreen = lazy(() => screens.profile().then((m) => ({ default: m.OneRepMaxScreen })))
const PlatesScreen = lazy(() => screens.profile().then((m) => ({ default: m.PlatesScreen })))
const ProgressScreen = lazy(() => screens.progress().then((m) => ({ default: m.ProgressScreen })))
const ExerciseProgressScreen = lazy(() => screens.progress().then((m) => ({ default: m.ExerciseProgressScreen })))
const RoutinesScreen = lazy(() => screens.routines().then((m) => ({ default: m.RoutinesScreen })))
const RoutineDetailScreen = lazy(() => screens.routines().then((m) => ({ default: m.RoutineDetailScreen })))
const SessionDetailScreen = lazy(() => screens.session().then((m) => ({ default: m.SessionDetailScreen })))
const SummarySheet = lazy(() => screens.session().then((m) => ({ default: m.SummarySheet })))
const WorkoutScreen = lazy(() => screens.workout().then((m) => ({ default: m.WorkoutScreen })))

const FigureGallery = lazy(() => import('./components/MoveFigure').then((m) => ({ default: m.FigureGallery })))

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
  if (route[0] === 'import' && route[1]) return <div className="app"><Suspense fallback={null}><ImportScreen code={route[1]} /></Suspense></div>
  // Galería de figuras para revisarlas durante el desarrollo (no existe en la versión publicada).
  if (import.meta.env.DEV && route[0] === 'dev-figuras') return <Suspense fallback={null}><FigureGallery /></Suspense>
  if (!data.settings.onboarded) return <Suspense fallback={null}><OnboardingScreen /></Suspense>

  const tab = currentTab(route)
  const summary = ui.summaryId ? data.sessions.find((s) => s.id === ui.summaryId) : undefined

  return (
    <div className={`app ${active && !ui.open ? 'has-active' : ''}`}>
      <Suspense fallback={<div className="screen" />}>
        <Screen route={route} />
      </Suspense>
      {active && !ui.open && <ActiveBar name={active.name} start={active.start} />}
      <TabBar tab={tab} />
      <Suspense fallback={null}>
        {active && ui.open && <WorkoutScreen session={active} />}
        {summary && <SummarySheet session={summary} onClose={closeSummary} />}
      </Suspense>
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
