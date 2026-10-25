import { ChartLine, ChevronUp, ClipboardList, Dumbbell, House, User, Utensils } from 'lucide-react'
import { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { mealByTime, requestAdd, useFoodReminders } from './lib/foodReminders'
import { fillBodyweights, registerBodyweightExercises } from './lib/bodyweight'
import { CatalogContext, useTick } from './components/ui'
import { Catalog, loadCatalog, type CatalogData } from './lib/catalog'
import { dictReady, langKey, onDict, t } from './lib/i18n'
import { migrateCatalog, relabelExercises } from './lib/migrate'
import { autoProtect } from './lib/protect'
import { rememberEquipment } from './lib/progression'
import { clock } from './lib/format'
import { currentTab, navigate, useRoute, type Tab } from './lib/router'
import { activeSession, flush, getData, loadData, useData, useStorageProblem } from './lib/store'
import { closeSummary, nextRoutine, openWorkout, startEmpty, startRoutine, useWorkoutUI } from './lib/workout'
import { HomeScreen } from './screens/Home'
import { UndoToast } from './components/UndoToast'
import { ErrorBoundary } from './components/ErrorBoundary'

// Las pantallas se cargan al abrirlas: el service worker precarga las básicas y guarda las secundarias
// al visitarlas. Inicio va en el paquete principal porque es la primera.
const screens = {
  exercises: () => import('./screens/Exercises'),
  food: () => import('./screens/Food'),
  friends: () => import('./screens/Friends'),
  import: () => import('./screens/Import'),
  intervals: () => import('./screens/Intervals'),
  legal: () => import('./screens/Legal'),
  onboarding: () => import('./screens/Onboarding'),
  photos: () => import('./screens/Photos'),
  profile: () => import('./screens/Profile'),
  progress: () => import('./screens/Progress'),
  report: () => import('./screens/Report'),
  foodImport: () => import('./screens/FoodImport'),
  routines: () => import('./screens/Routines'),
  session: () => import('./screens/Session'),
  transfer: () => import('./screens/Transfer'),
  workout: () => import('./screens/Workout'),
  wod: () => import('./screens/Wod'),
}
const ExercisesScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExercisesScreen })))
const ExerciseDetailScreen = lazy(() => screens.exercises().then((m) => ({ default: m.ExerciseDetailScreen })))
const FoodScreen = lazy(() => screens.food().then((m) => ({ default: m.FoodScreen })))
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
const FoodImportScreen = lazy(() => screens.foodImport().then((m) => ({ default: m.FoodImportScreen })))
const ReportScreen = lazy(() => screens.report().then((m) => ({ default: m.ReportScreen })))
const ProgressScreen = lazy(() => screens.progress().then((m) => ({ default: m.ProgressScreen })))
const ExerciseProgressScreen = lazy(() => screens.progress().then((m) => ({ default: m.ExerciseProgressScreen })))
const RoutinesScreen = lazy(() => screens.routines().then((m) => ({ default: m.RoutinesScreen })))
const RoutineDetailScreen = lazy(() => screens.routines().then((m) => ({ default: m.RoutineDetailScreen })))
const WodScreen = lazy(() => screens.wod().then((m) => ({ default: m.WodScreen })))
const SessionDetailScreen = lazy(() => screens.session().then((m) => ({ default: m.SessionDetailScreen })))
const SummarySheet = lazy(() => screens.session().then((m) => ({ default: m.SummarySheet })))
const TransferScreen = lazy(() => screens.transfer().then((m) => ({ default: m.TransferScreen })))
const WorkoutScreen = lazy(() => screens.workout().then((m) => ({ default: m.WorkoutScreen })))

const FigureGallery = lazy(() => import('./components/MoveFigure').then((m) => ({ default: m.FigureGallery })))

export default function App() {
  const [raw, setRaw] = useState<CatalogData>()
  const [error, setError] = useState<string>()
  const [early, setEarly] = useState(false)
  // Se lee para volver a pintar al cambiar de idioma (el idioma sale de los ajustes).
  // También los ejercicios propios, que se suman al catálogo.
  // Cada cambio de datos crea objetos nuevos, así que se compara su contenido: el catálogo solo se
  // rehace si cambian de verdad.
  const { customExercises } = useData()
  const customKey = JSON.stringify(customExercises)
  // Cambia con el idioma y cuando llega su diccionario (francés y portugués se descargan aparte).
  const language = useSyncExternalStore(onDict, langKey)
  const catalog = useMemo(() => {
    if (!raw) return undefined
    const c = new Catalog(raw.exercises, raw.legacy, JSON.parse(customKey))
    // Para el «+» del lastre en todas las pantallas (bodyweight.ts), también en los ejercicios propios.
    registerBodyweightExercises(c.exercises.filter((e) => e.equipment === 'bodyweight').map((e) => e.id))
    return c
  }, [raw, language, customKey])

  useEffect(() => {
    const data = loadData()
    // Quien aún no ha hecho el cuestionario ve la bienvenida sin esperar al catálogo de ejercicios (~220 KB),
    // que sigue llegando por detrás: hasta el resumen final no hace falta. Con el diccionario ya listo, para
    // no enseñarla un momento en español a quien la usa en francés.
    data.then(dictReady).then(() => { if (!getData().settings.onboarded) setEarly(true) }).catch(() => { /* lo avisa el de abajo */ })
    // La primera visita (sin service worker todavía, todo por la red): primero el código de la bienvenida y
    // después el catálogo; a la vez se reparten la red y la bienvenida sale más tarde (medido con 4G lenta:
    // 1,97 s → 1,84 s). Con la app ya guardada todo sale de la caché: el catálogo, enseguida.
    const firstVisit = !navigator.serviceWorker?.controller
    const catalogReady = firstVisit
      ? data.then(() => (getData().settings.onboarded ? undefined : screens.onboarding().catch(() => undefined))).then(loadCatalog)
      : loadCatalog()
    Promise.all([catalogReady, data])
      .then(async ([c]) => {
        await dictReady()
        migrateCatalog(new Catalog(c.exercises, c.legacy))
        setRaw(c)
        void autoProtect()
        fillBodyweights()
      })
      .catch((e: unknown) => setError(t(`No se pudo cargar la app: ${String(e)}`, `The app could not load: ${String(e)}`)))
  }, [])
  // Nombres de ejercicios guardados al idioma actual.
  // Y su material, para que la progresión suba las mancuernas a pesos que existen.
  useEffect(() => {
    if (!catalog) return
    relabelExercises(catalog)
    rememberEquipment(catalog.exercises)
  }, [catalog])

  if (!catalog && (!early || error)) return <Loading error={error} />

  return (
    <CatalogContext.Provider value={catalog ?? null}>
      {/* Con otro idioma se vuelve a montar todo, así ningún texto se queda en el anterior. */}
      <ErrorBoundary resetKey={language}>
        <Main key={language} />
      </ErrorBoundary>
    </CatalogContext.Provider>
  )
}

function Loading({ error }: { error?: string }) {
  return (
    <div className="empty" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      <Dumbbell size={56} />
      <p className="muted">{error ?? t('Cargando ejercicios…', 'Loading exercises…')}</p>
    </div>
  )
}

function Main() {
  const data = useData()
  const catalog = useContext(CatalogContext)
  useFoodReminders(data.settings.foodReminders === true, data.nutrition.entries)
  const route = useRoute()
  const ui = useWorkoutUI()
  const active = activeSession(data)
  // Al cambiar de pantalla (una subpantalla, «Atrás», terminar el cuestionario…), si el foco se ha quedado en
  // el aire (el botón pulsado ya no existe: queda en body), va al título de la pantalla nueva y el lector de
  // pantalla dice dónde estás. Si sigue en algo (la pestaña de abajo que se acaba de tocar), no se mueve.
  // La pantalla puede tardar en pintarse (se carga aparte; en la primera visita, con el catálogo): se espera.
  const onboarded = !!data.settings.onboarded
  const place = `${onboarded}:${route.join('/')}`
  // Solo el primer pintado no cuenta (la app recién abierta): volver luego a esa misma pantalla, sí.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const start = Date.now()
    const lost = () => !document.activeElement || document.activeElement === document.body
    // El título visible: mientras la pantalla nueva se carga, la anterior sigue en el DOM pero oculta (Suspense)
    // y su h1 no admite el foco. Se insiste hasta que el foco está de verdad en el nuevo.
    const visible = () => [...document.querySelectorAll<HTMLElement>('main h1')].find((h) => h.getClientRects().length > 0 && getComputedStyle(h).visibility !== 'hidden' && !h.closest('[hidden]'))
    let target: HTMLElement | undefined
    const id = setInterval(() => {
      if (Date.now() - start > 10000 || (target && document.activeElement === target) || (!target && !lost())) return clearInterval(id)
      const h = visible()
      if (!h || (!lost() && document.activeElement !== target)) return
      if (!h.hasAttribute('tabindex')) h.tabIndex = -1
      target = h
      h.focus({ preventScroll: true })
    }, 50)
    return () => clearInterval(id)
  }, [place])
  // Accesos directos del icono (manifest): #/go/free y #/go/next empiezan un entrenamiento; #/go/food
  // abre el buscador de la comida que toca.
  useEffect(() => {
    if (route[0] !== 'go') return
    const d = getData()
    if (route[1] === 'food') {
      requestAdd(mealByTime())
      return navigate('food')
    }
    if (route[1] === 'wod') return navigate('wod')
    if (route[1] === 'free') startEmpty()
    if (route[1] === 'next') {
      const routine = nextRoutine(d)
      if (routine) startRoutine(routine)
      else return navigate('routines')
    }
    navigate('home')
  }, [route])

  // Sin catálogo todavía solo se puede enseñar el cuestionario (ver `early` en App): lo demás lo necesita.
  if (!catalog && (data.settings.onboarded || ['import', 'food-import', 'friend', 'transfer', 'go'].includes(route[0]))) return <Loading />
  // Un enlace compartido se abre directamente, aunque sea la primera vez que se usa la app.
  if (route[0] === 'import' && route[1]) return <main className="app"><Suspense fallback={null}><ImportScreen code={route[1]} /></Suspense></main>
  if (route[0] === 'food-import' && route[1]) return <main className="app"><Suspense fallback={null}><FoodImportScreen code={route[1]} /></Suspense></main>
  if (route[0] === 'friend' && route[1]) return <main className="app"><Suspense fallback={null}><FriendImportScreen code={route[1]} /></Suspense></main>
  // Galería de figuras para revisarlas durante el desarrollo (no existe en la versión publicada).
  if (import.meta.env.DEV && route[0] === 'dev-figuras') return <Suspense fallback={null}><FigureGallery /></Suspense>
  // Pasar datos desde otro móvil también se puede hacer antes del cuestionario inicial.
  if (route[0] === 'transfer') return <main className="app"><Suspense fallback={null}><TransferScreen mode={route[1]} /></Suspense></main>
  // La privacidad se puede leer antes de dar ningún dato (enlace desde la bienvenida).
  if (route[0] === 'legal') return <main className="app"><Suspense fallback={null}><LegalScreen /></Suspense></main>
  if (!data.settings.onboarded) return <Suspense fallback={null}><OnboardingScreen /></Suspense>

  const tab = currentTab(route)
  const summary = ui.summaryId ? data.sessions.find((s) => s.id === ui.summaryId) : undefined
  const behind = !!active && ui.open

  return (
    <div className={`app ${active && !ui.open ? 'has-active' : ''}`}>
      <StorageBanner />
      {/* Con el entreno abierto (a pantalla completa, encima), lo de detrás queda inerte: Tab y el lector no
          se van a Inicio ni a la barra de pestañas tapados. */}
      <main inert={behind}>
        <ErrorBoundary resetKey={route.join('/')}>
          <Suspense fallback={<div className="screen" />}>
            <Screen route={route} />
          </Suspense>
        </ErrorBoundary>
      </main>
      {active && !ui.open && <ActiveBar name={active.name} start={active.start} />}
      <TabBar tab={tab} inert={behind} />
      <ErrorBoundary resetKey={`${ui.open}-${ui.summaryId ?? ''}`}>
        <Suspense fallback={null}>
          {active && ui.open && <WorkoutScreen session={active} />}
          {summary && <SummarySheet session={summary} onClose={closeSummary} />}
        </Suspense>
      </ErrorBoundary>
      <UndoToast />
    </div>
  )
}

function Screen({ route }: { route: string[] }) {
  const [tab, a, b] = route
  switch (tab) {
    case 'routines':
      // #/routines/generate: Rutinas con el generador abierto (lo usa Perfil → Nuevo programa).
      return a && a !== 'generate' ? <RoutineDetailScreen id={a} /> : <RoutinesScreen generate={a === 'generate'} />
    case 'exercises':
      return a ? <ExerciseDetailScreen id={a} /> : <ExercisesScreen />
    case 'food':
      return <FoodScreen />
    case 'progress':
      if (a === 'session' && b) return <SessionDetailScreen id={b} />
      if (a === 'exercise' && b) return <ExerciseProgressScreen id={b} />
      if (a === 'report') return <ReportScreen />
      return <ProgressScreen />
    case 'profile':
      if (a === 'measurements') return <MeasurementsScreen />
      if (a === 'photos') return <PhotosScreen />
      if (a === 'calendar') return <CalendarScreen />
      if (a === '1rm') return <OneRepMaxScreen />
      if (a === 'plates') return <PlatesScreen />
      if (a === 'legal') return <LegalScreen />
      if (a === 'friends') return b ? <FriendDetailScreen id={b} /> : <FriendsScreen />
      if (a === 'general' || a === 'training' || a === 'alerts' || a === 'data') return <ProfileScreen section={a} />
      return <ProfileScreen />
    case 'wod':
      return <WodScreen />
    case 'timer':
      return <IntervalScreen key={`${a ?? ''}${b ?? ''}`} warmup={a === 'warmup' && (b === 'full' || b === 'upper' || b === 'legs') ? b : undefined}
        cooldown={a === 'cooldown' && (b === 'full' || b === 'upper' || b === 'legs') ? b : undefined} />
    default:
      return <HomeScreen />
  }
}

const tabItems: { id: Tab; label: () => string; icon: typeof House }[] = [
  { id: 'home', label: () => t('Inicio', 'Home'), icon: House },
  { id: 'routines', label: () => t('Rutinas', 'Routines'), icon: ClipboardList },
  { id: 'food', label: () => t('Comidas', 'Food'), icon: Utensils },
  { id: 'progress', label: () => t('Progreso', 'Progress'), icon: ChartLine },
  { id: 'profile', label: () => t('Perfil', 'Profile'), icon: User },
]

function TabBar({ tab, inert }: { tab: Tab; inert?: boolean }) {
  return (
    <nav className="tabbar" inert={inert}>
      {tabItems.map(({ id, label, icon: Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => navigate(id)} aria-current={tab === id ? 'page' : undefined}>
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

/** Aviso si no se pudieron leer o guardar los datos (ver StorageProblem en lib/store.ts). */
function StorageBanner() {
  const problem = useStorageProblem()
  if (!problem) return null
  const text = problem.kind === 'readError'
    ? t('No se han podido leer tus datos. Para no borrarlos, no se guardará nada hasta que recargues la app.', 'Your data could not be read. To avoid erasing it, nothing will be saved until you reload the app.')
    : problem.kind === 'newer'
      ? t('Tus datos son de una versión más nueva de Serix. Recarga la app para actualizarla; mientras tanto no se guardará nada.', 'Your data is from a newer version of Serix. Reload the app to update it; nothing will be saved until then.')
      : t('No se han podido guardar los últimos cambios (¿falta espacio en el móvil?). Libera espacio y vuelve a intentarlo.', 'The latest changes could not be saved (is your phone out of space?). Free up some space and try again.')
  return (
    <div className="storage-banner" role="alert">
      <span className="grow">{text}</span>
      {problem.kind === 'writeError'
        ? <button className="btn secondary btn-sm" onClick={flush}>{t('Reintentar', 'Try again')}</button>
        : <button className="btn secondary btn-sm" onClick={() => location.reload()}>{t('Recargar la app', 'Reload the app')}</button>}
    </div>
  )
}
