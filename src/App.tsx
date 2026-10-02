import { ChartLine, ChevronUp, ClipboardList, Dumbbell, House, User } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CatalogContext, useTick } from './components/ui'
import { Catalog, loadCatalog, type CatalogData } from './lib/catalog'
import { lang, t } from './lib/i18n'
import { migrateCatalog, relabelExercises } from './lib/migrate'
import { autoProtect } from './lib/protect'
import { clock } from './lib/format'
import { currentTab, navigate, useRoute, type Tab } from './lib/router'
import { activeSession, getData, loadData, useData } from './lib/store'
import { closeSummary, nextRoutine, openWorkout, startEmpty, startRoutine, useWorkoutUI } from './lib/workout'
import { HomeScreen } from './screens/Home'
import { UndoToast } from './components/UndoToast'

// El resto de pantallas se descargan al abrirlas (el service worker las guarda todas para usarlas sin
// conexión), así la app arranca antes. Inicio va en el paquete principal porque es la primera.
const screens = {
  exercises: () => import('./screens/Exercises'),
  friends: () => import('./screens/Friends'),
  import: () => import('./screens/Import'),
  intervals: () => import('./screens/Intervals'),
  legal: () => import('./screens/Legal'),
  onboarding: () => import('./screens/Onboarding'),
  photos: () => import('./screens/Photos'),
  profile: () => import('./screens/Profile'),
  progress: () => import('./screens/Progress'),
  routines: () => import('./screens/Routines'),
  session: () => import('./screens/Session'),
  transfer: () => import('./screens/Transfer'),
  workout: () => import('./screens/Workout'),
}
const ExercisesScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExercisesScreen })))
const ExerciseDetailScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExerciseDetailScreen })))
const ImportScreen = lazy(() => screens.import().then((m) => ({ default: m.ImportScreen })))
const FriendsScreen = lazy(() => screens.friends().then((m) => ({ default: m.FriendsScreen })))
const FriendDetailScreen = lazy(() => screens.friends().then((m) => ({ default: m.FriendDetailScreen })))
const FriendImportScreen = lazy(() => screens.friends().then((m) => ({ default: m.FriendImportScreen })))
const IntervalScreen = lazy(() => screens.intervals().then((m) => ({ default: m.IntervalScreen })))
const LegalScreen = lazy(() => screens.legal().then((m) => ({ default: m.LegalScreen })))
const OnboardingScreen = lazy(() => screens.onboarding().then((m) => ({ default: m.OnboardingScreen })))
const PhotosScreen = lazy(() => screens.photos().then((m) => ({ default: m.PhotosScreen })))
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
const TransferScreen = lazy(() => screens.transfer().then((m) => ({ default: m.TransferScreen })))
const WorkoutScreen = lazy(() => screens.workout().then((m) => ({ default: m.WorkoutScreen })))

const FigureGallery = lazy(() => import('./components/MoveFigure').then((m) => ({ default: m.FigureGallery })))

export default function App() {
  const [raw, setRaw] = useState<CatalogData>()
  const [error, setError] = useState<string>()
  // Se lee para volver a pintar al cambiar de idioma (el idioma sale de los ajustes).
  // También los ejercicios propios, que se suman al catálogo.
  // Cada cambio de datos crea objetos nuevos, así que se compara su contenido: el catálogo solo se
  // rehace si cambian de verdad.
  const { customExercises } = useData()
  const customKey = JSON.stringify(customExercises)
  const language = lang()
  const catalog = useMemo(() => (raw ? new Catalog(raw.exercises, raw.legacy, JSON.parse(customKey)) : undefined), [raw, language, customKey])

  useEffect(() => {
    Promise.all([loadCatalog(), loadData()])
      .then(([c]) => {
        migrateCatalog(new Catalog(c.exercises, c.legacy))
        setRaw(c)
        void autoProtect()
      })
      .catch((e: unknown) => setError(t(`No se pudo cargar la app: ${String(e)}`, `The app could not load: ${String(e)}`)))
  }, [])
  // Nombres de ejercicios guardados al idioma actual.
  useEffect(() => { if (catalog) relabelExercises(catalog) }, [catalog])

  if (!catalog) {
    return (
      <div className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
        <Dumbbell size={56} />
        <p className="muted">{error ?? t('Cargando ejercicios…', 'Loading exercises…')}</p>
      </div>
    )
  }

  return (
    <CatalogContext.Provider value={catalog}>
      {/* Con otro idioma se vuelve a montar todo, así ningún texto se queda en el anterior. */}
      <Main key={language} />
    </CatalogContext.Provider>
  )
}

function Main() {
  const data = useData()
  const route = useRoute()
  const ui = useWorkoutUI()
  const active = activeSession(data)
  // Accesos directos del icono (manifest): #/go/free y #/go/next empiezan un entrenamiento.
  useEffect(() => {
    if (route[0] !== 'go') return
    const d = getData()
    if (route[1] === 'free') startEmpty()
    if (route[1] === 'next') {
      const routine = nextRoutine(d)
      if (routine) startRoutine(routine)
      else return navigate('routines')
    }
    navigate('home')
  }, [route])

  // Un enlace compartido se abre directamente, aunque sea la primera vez que se usa la app.
  if (route[0] === 'import' && route[1]) return <main className="app"><Suspense fallback={null}><ImportScreen code={route[1]} /></Suspense></main>
  if (route[0] === 'friend' && route[1]) return <main className="app"><Suspense fallback={null}><FriendImportScreen code={route[1]} /></Suspense></main>
  // Galería de figuras para revisarlas durante el desarrollo (no existe en la versión publicada).
  if (import.meta.env.DEV && route[0] === 'dev-figuras') return <Suspense fallback={null}><FigureGallery /></Suspense>
  // Pasar datos desde otro móvil también se puede hacer antes del cuestionario inicial.
  if (route[0] === 'transfer') return <main className="app"><Suspense fallback={null}><TransferScreen mode={route[1]} /></Suspense></main>
  if (!data.settings.onboarded) return <Suspense fallback={null}><OnboardingScreen /></Suspense>

  const tab = currentTab(route)
  const summary = ui.summaryId ? data.sessions.find((s) => s.id === ui.summaryId) : undefined

  return (
    <div className={`app ${active && !ui.open ? 'has-active' : ''}`}>
      <main>
        <Suspense fallback={<div className="screen" />}>
          <Screen route={route} />
        </Suspense>
      </main>
      {active && !ui.open && <ActiveBar name={active.name} start={active.start} />}
      <TabBar tab={tab} />
      <Suspense fallback={null}>
        {active && ui.open && <WorkoutScreen session={active} />}
        {summary && <SummarySheet session={summary} onClose={closeSummary} />}
      </Suspense>
      <UndoToast />
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
      if (a === 'photos') return <PhotosScreen />
      if (a === 'calendar') return <CalendarScreen />
      if (a === '1rm') return <OneRepMaxScreen />
      if (a === 'plates') return <PlatesScreen />
      if (a === 'legal') return <LegalScreen />
      if (a === 'friends') return b ? <FriendDetailScreen id={b} /> : <FriendsScreen />
      return <ProfileScreen />
    case 'timer':
      return <IntervalScreen />
    default:
      return <HomeScreen />
  }
}

const tabItems: { id: Tab; label: () => string; icon: typeof House }[] = [
  { id: 'home', label: () => t('Inicio', 'Home'), icon: House },
  { id: 'routines', label: () => t('Rutinas', 'Routines'), icon: ClipboardList },
  { id: 'exercises', label: () => t('Ejercicios', 'Exercises'), icon: Dumbbell },
  { id: 'progress', label: () => t('Progreso', 'Progress'), icon: ChartLine },
  { id: 'profile', label: () => t('Perfil', 'Profile'), icon: User },
]

function TabBar({ tab }: { tab: Tab }) {
  return (
    <nav className="tabbar">
      {tabItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => navigate(id)}>
          <Icon size={24} strokeWidth={tab === id ? 2.4 : 2} />
          {label()}
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
          {t('En curso', 'In progress')} · {clock((now - start) / 1000)}
        </span>
      </span>
      <strong>{t('Continuar', 'Resume')}</strong>
      <ChevronUp size={20} />
    </button>
  )
}
