import { ArrowRightLeft, BellRing, Camera, Users, Calculator, FileUp, Table, CalendarDays, ChevronLeft, ChevronRight, Disc, Download, HardDrive, RotateCcw, Scale, ShieldCheck, Trash2, Upload, Volume2, WandSparkles } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LineChart } from '../components/charts'
import { ActionSheet, Card, Empty, LargeTitle, NavBar, Row, Segmented, Sheet, useCatalog, useToast } from '../components/ui'
import { day, duration, relative, fromKg, monthYear, num, parseDecimal, rest, restOptions, shortDay, startOfDay, toKg, uid, volume, weight, type Unit } from '../lib/format'
import { navigate } from '../lib/router'
import { e1rm, sessionDuration, sessionVolume } from '../lib/stats'
import { MAX_BACKUP_BYTES, parseBackup } from '../lib/backup'
import { downloadCsv } from '../lib/exportCsv'
import { migrateCatalog } from '../lib/migrate'
import { exportBackup, requestProtection, storageState, type StorageState } from '../lib/protect'
import { restEndAt, startRest, testBeep } from '../lib/timer'
import { lockScreenSupported, requestLockScreenPermission, startLockScreenTest, useLockScreenTest, type LockScreenTest } from '../lib/lockScreen'
import { speak, voiceSupported } from '../lib/voice'
import { isIOS } from '../lib/pwa'
import { finishedSessions, replaceData, resetData, rpeOn, update, updateSettings, useData, withUndo, type Measurement } from '../lib/store'
import { PlateInventory, PlatesView } from './Plates'

const ImportCsvSheet = lazy(() => import('./ImportCsv').then((m) => ({ default: m.ImportCsvSheet })))
import { SessionRow } from '../components/SessionRow'
import { plural, t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'

export function ProfileScreen() {
  const data = useData()
  const catalog = useCatalog()
  const { settings } = data
  const sessions = useMemo(() => finishedSessions(data), [data])
  const [confirmReset, setConfirmReset] = useState(false)
  const [toast, showToast] = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const csvInput = useRef<HTMLInputElement>(null)
  const [csv, setCsv] = useState<string>()
  const lastWeight = [...data.measurements].sort((a, b) => b.date - a.date).find((m) => m.weight !== undefined)?.weight
  const initials = settings.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || t('Tú', 'You')

  const [storage, setStorage] = useState<StorageState>()
  useEffect(() => { void storageState().then(setStorage) }, [])
  const protect = async () => {
    const ok = await requestProtection()
    setStorage(await storageState())
    showToast(ok ? t('Datos protegidos', 'Data protected') : t('El navegador no lo ha permitido; instala la app o exporta copias', 'The browser did not allow it; install the app or export backups'))
  }

  const importData = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) return showToast(t('El archivo es demasiado grande', 'The file is too large'))
    try {
      const parsed = parseBackup(await file.text())
      if (!confirm(t(`Se sustituirán tus datos actuales por la copia (${plural(parsed.sessions.length, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}). ¿Continuar?`, `Your current data will be replaced by the backup (${plural(parsed.sessions.length, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}). Continue?`))) return
      replaceData(parsed)
      // Las copias hechas con el catálogo anterior se adaptan al actual.
      migrateCatalog(catalog)
      showToast(t('Copia restaurada', 'Backup restored'))
    } catch {
      showToast(t('El archivo no es una copia válida', 'The file is not a valid backup'))
    }
  }

  return (
    <div className="screen">
      <LargeTitle title={t('Perfil', 'Profile')} />
      <Card>
        <div className="row">
          <div className="avatar">{initials}</div>
          <div className="grow">
            <strong style={{ fontSize: 20, display: 'block' }}>{settings.name || t('Tu perfil', 'Your profile')}</strong>
            <span className="small muted" style={{ display: 'block' }}>
              {plural(sessions.length, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])} · {duration(sessions.reduce((t, s) => t + sessionDuration(s), 0))}
            </span>
            <span className="small muted">{volume(sessions.reduce((t, s) => t + sessionVolume(s), 0), settings.unit)} {t('levantados', 'lifted')}</span>
          </div>
        </div>
      </Card>

      <div className="list-header">{t('Cuerpo y actividad', 'Body and activity')}</div>
      <div className="list">
        <Row icon={Scale} label={t('Medidas corporales', 'Body measurements')} detail={lastWeight !== undefined ? weight(lastWeight, settings.unit) : undefined} onClick={() => navigate('profile', 'measurements')} />
        <Row icon={Camera} label={t('Fotos de progreso', 'Progress photos')} onClick={() => navigate('profile', 'photos')} />
        <Row icon={CalendarDays} label={t('Calendario', 'Calendar')} onClick={() => navigate('profile', 'calendar')} />
        <Row icon={Users} label={t('Retos con amigos', 'Friend challenges')} detail={data.friends.length || undefined} onClick={() => navigate('profile', 'friends')} />
      </div>

      <div className="list-header">{t('Herramientas', 'Tools')}</div>
      <div className="list">
        <Row icon={Calculator} label={t('Calculadora de 1RM', '1RM calculator')} onClick={() => navigate('profile', '1rm')} />
        <Row icon={Disc} label={t('Calculadora de discos', 'Plate calculator')} onClick={() => navigate('profile', 'plates')} />
      </div>

      <div className="list-header">{t('Programa', 'Program')}</div>
      <div className="list">
        <Row icon={WandSparkles} label={t('Generar nuevo programa', 'Generate a new program')} className="accent" onClick={() => navigate('routines')} chevron={false} />
        <Row icon={RotateCcw} label={t('Repetir cuestionario inicial', 'Redo the initial questionnaire')} className="accent" onClick={() => updateSettings({ onboarded: false })} chevron={false} />
      </div>

      <div className="list-header">{t('Ajustes', 'Settings')}</div>
      <div className="list">
        <label className="list-row">
          <span>{t('Nombre', 'Name')}</span>
          <input className="grow" style={{ textAlign: 'right', color: 'var(--text-2)' }} placeholder={t('Tu nombre', 'Your name')} value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
        </label>
        <div className="list-row">
          <span className="grow">{t('Unidad de peso', 'Weight unit')}</span>
          <div style={{ width: 120 }}>
            <Segmented value={settings.unit} onChange={(u: Unit) => updateSettings({ unit: u })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
          </div>
        </div>
        <label className="list-row">
          <span className="grow">{t('Tema', 'Theme')}</span>
          <select className="select" value={settings.theme ?? ''} onChange={(e) => updateSettings({ theme: (e.target.value || undefined) as Theme | undefined })}>
            <option value="">{t('Automático', 'Automatic')}</option>
            <option value="light">{t('Claro', 'Light')}</option>
            <option value="dark">{t('Oscuro', 'Dark')}</option>
          </select>
        </label>
        <label className="list-row">
          <span className="grow">Idioma · Language</span>
          <select className="select" value={settings.language ?? ''} onChange={(e) => updateSettings({ language: (e.target.value || undefined) as Lang | undefined })}>
            <option value="">{t('Automático', 'Automatic')}</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="list-row">
          <span className="grow">{t('Descanso por defecto', 'Default rest')}</span>
          <select className="select" value={settings.defaultRest} onChange={(e) => updateSettings({ defaultRest: Number(e.target.value) })}>
            {restOptions.map((o) => <option key={o} value={o}>{rest(o)}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">{t('Objetivo semanal', 'Weekly goal')}</span>
          <select className="select" value={settings.weeklyGoal} onChange={(e) => updateSettings({ weeklyGoal: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{plural(n, ['entreno', 'entrenos'], ['workout', 'workouts'])}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">
            {t('Pitido al terminar el descanso', 'Beep when rest ends')}
            <span className="small muted" style={{ display: 'block' }}>{t('En iPhone no suena con el modo silencio activado', 'On iPhone it does not sound in silent mode')}</span>
          </span>
          <input type="checkbox" className="toggle" checked={settings.restSound} onChange={(e) => updateSettings({ restSound: e.target.checked })} />
        </label>
        {settings.restSound && <Row icon={Volume2} label={t('Probar pitido', 'Test beep')} onClick={testBeep} chevron={false} />}
        {voiceSupported() && (
          <label className="list-row">
            <span className="grow">
              {t('Avisos por voz', 'Voice cues')}
              <span className="small muted" style={{ display: 'block' }}>
                {t('«Quedan 10 segundos», «Siguiente: press de banca, serie 3 de 4»… y los tramos de los temporizadores.', '"10 seconds left", "Next: bench press, set 3 of 4"… and the interval timer phases.')}
              </span>
            </span>
            <input type="checkbox" className="toggle" checked={settings.voice === true} onChange={(e) => {
              updateSettings({ voice: e.target.checked || undefined })
              if (e.target.checked) speak(t('Avisos por voz activados', 'Voice cues on'), true)
            }} />
          </label>
        )}
        {lockScreenSupported() && !isIOS() && (
          <label className="list-row">
            <span className="grow">
              {t('Aviso con el móvil bloqueado', 'Alert with the phone locked')}
              <span className="small muted" style={{ display: 'block' }}>
                {t('Durante el descanso verás la cuenta atrás en la pantalla bloqueada y al terminar te llegará una notificación. Gasta un poco más de batería.',
                  'During rest you will see the countdown on the lock screen and get a notification when it ends. It uses a little more battery.')}
              </span>
            </span>
            <input type="checkbox" className="toggle" checked={settings.lockScreenAlert === true} onChange={async (e) => {
              if (!e.target.checked) return updateSettings({ lockScreenAlert: undefined })
              if (await requestLockScreenPermission()) updateSettings({ lockScreenAlert: true })
              else showToast(t('Sin permiso de notificaciones: actívalo en los ajustes del navegador para esta web', 'No notification permission: allow it in the browser settings for this site'))
            }} />
          </label>
        )}
        {settings.lockScreenAlert && lockScreenSupported() && (
          <>
            <Row icon={BellRing} label={t('Probar: descanso de 10 s', 'Test: 10 s rest')} chevron={false} onClick={() => {
              if (Notification.permission !== 'granted') return showToast(t('Sin permiso de notificaciones: actívalo en los ajustes del navegador para esta web', 'No notification permission: allow it in the browser settings for this site'))
              startRest(10)
              const endAt = restEndAt()
              if (endAt) startLockScreenTest(endAt)
              showToast(t('Bloquea el móvil ya: en 10 segundos te llegará el aviso', 'Lock your phone now: the alert will arrive in 10 seconds'))
            }} />
            <LockScreenTestResult />
          </>
        )}
        <label className="list-row">
          <span className="grow">
            {t('Modo sencillo', 'Simple mode')}
            <span className="small muted" style={{ display: 'block' }}>{t('Oculta el RPE, los tipos de serie, los bloques y otras opciones avanzadas', 'Hides RPE, set types, blocks and other advanced options')}</span>
          </span>
          <input type="checkbox" className="toggle" checked={settings.simpleMode === true} onChange={(e) => updateSettings({ simpleMode: e.target.checked })} />
        </label>
        {!settings.simpleMode && <label className="list-row">
          <span className="grow">
            {t('Anotar esfuerzo (RPE)', 'Log effort (RPE)')}
            <span className="small muted" style={{ display: 'block' }}>{t('Al marcar cada serie, de 6 a 10', 'When ticking each set, from 6 to 10')}</span>
          </span>
          <input type="checkbox" className="toggle" checked={settings.rpe} onChange={(e) => updateSettings({ rpe: e.target.checked })} />
        </label>}
        {rpeOn(settings) && (
          <label className="list-row">
            <span className="grow">
              {t('Descanso según el esfuerzo', 'Rest based on effort')}
              <span className="small muted" style={{ display: 'block' }}>{t('RPE 9: +15 s · RPE 9,5–10 o al fallo: +30 s · RPE 7 o menos: −15 s', 'RPE 9: +15 s · RPE 9.5–10 or to failure: +30 s · RPE 7 or less: −15 s')}</span>
            </span>
            <input type="checkbox" className="toggle" checked={!settings.effortRestOff} onChange={(e) => updateSettings({ effortRestOff: e.target.checked ? undefined : true })} />
          </label>
        )}
      </div>

      <div className="list-header">{t('Tus datos', 'Your data')}</div>
      <div className="list">
        <Row icon={Download} label={t('Exportar copia de seguridad', 'Export backup')} detail={settings.lastBackupAt ? relative(settings.lastBackupAt) : t('Nunca', 'Never')} onClick={exportBackup} chevron={false} />
        <Row icon={Upload} label={t('Importar copia de seguridad', 'Import backup')} onClick={() => fileInput.current?.click()} chevron={false} />
        <Row icon={FileUp} label={t('Importar desde Strong o Hevy', 'Import from Strong or Hevy')} onClick={() => csvInput.current?.click()} chevron={false} />
        <Row icon={Table} label={t('Exportar a hoja de cálculo (CSV)', 'Export to spreadsheet (CSV)')} chevron={false}
          onClick={sessions.length ? () => downloadCsv(sessions, settings.unit) : () => showToast(t('Aún no hay entrenamientos que exportar', 'There are no workouts to export yet'))} />
        <Row icon={ArrowRightLeft} label={t('Pasar a otro móvil', 'Move to another phone')} onClick={() => navigate('transfer')} />
        {storage && storage !== 'unsupported' && (
          <Row icon={HardDrive} label={t('Protección contra borrado', 'Protection against deletion')} detail={storage === 'protected' ? t('Activada', 'On') : t('Activar', 'Turn on')}
            onClick={storage === 'protected' ? undefined : () => void protect()} chevron={false} />
        )}
        <Row icon={Trash2} label={t('Borrar todos los datos', 'Delete all data')} className="danger" onClick={() => setConfirmReset(true)} chevron={false} />
      </div>
      <p className="list-footer">
        {t('Tus datos se guardan solo en este dispositivo. La protección evita que el navegador los borre para liberar espacio, pero no sustituye a una copia: si borras la app, solo podrás recuperarlos con una copia exportada. Para cambiar de móvil, usa «Pasar a otro móvil».',
          'Your data is stored only on this device. Protection stops the browser from deleting it to free up space, but it is no substitute for a backup: if you delete the app, you can only recover it from an exported backup. To switch phones, use “Move to another phone”.')}
      </p>

      <div className="list">
        <Row icon={ShieldCheck} label={t('Legal y privacidad', 'Legal and privacy')} onClick={() => navigate('profile', 'legal')} />
      </div>
      <p className="list-footer">{t('Versión', 'Version')} {__APP_VERSION__}</p>
      <input ref={csvInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        if (f.size > MAX_BACKUP_BYTES) return showToast(t('El archivo es demasiado grande', 'The file is too large'))
        void f.text().then(setCsv)
      }} />
      {csv !== undefined && <Suspense fallback={null}><ImportCsvSheet text={csv} onClose={() => setCsv(undefined)} onDone={() => {}} /></Suspense>}
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importData(f); e.target.value = '' }} />

      {confirmReset && (
        <ActionSheet title={t('¿Borrar todos los datos?', 'Delete all data?')} message={t('Se eliminarán rutinas, historial y medidas. Las fotos de progreso se conservan (se borran desde su pantalla).', 'Routines, history and measurements will be deleted. Progress photos are kept (delete them from their own screen).')} onClose={() => setConfirmReset(false)}
          options={[{ label: t('Borrar todo', 'Delete everything'), destructive: true, onSelect: () => withUndo(t('Datos borrados', 'Data deleted'), resetData) }]} />
      )}
      {toast}
    </div>
  )
}

// MARK: Medidas

/** Resultado de la prueba del aviso con el móvil bloqueado, al volver a la app. */
function LockScreenTestResult() {
  const test = useLockScreenTest()
  const [, setNow] = useState(0)
  // Se vuelve a pintar al volver a la app (el resultado se ve entonces).
  useEffect(() => {
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  if (!test || Date.now() < test.endAt + 1500 || test.pageAt === undefined) return null
  return <div className="list-row small" role="status" style={{ display: 'block' }}>{testVerdict(test)}</div>
}

function testVerdict(test: LockScreenTest): ReactNode {
  const late = (at: number) => Math.max(0, Math.round((at - test.endAt) / 1000))
  const tips = t('En Samsung: Ajustes → Aplicaciones → Chrome (o Samsung Internet) → Batería → «Sin restricciones». Y en Ajustes → Batería → Límites de uso en segundo plano, quítalo de «Aplicaciones en suspensión» y «en suspensión profunda». Comprueba también que las notificaciones del navegador están permitidas.',
    'On Samsung: Settings → Apps → Chrome (or Samsung Internet) → Battery → "Unrestricted". And in Settings → Battery → Background usage limits, remove it from "Sleeping apps" and "Deep sleeping apps". Also check that notifications are allowed for the browser.')
  if (!test.pageHidden && test.notifiedAt === undefined) {
    return t('El descanso terminó con la app a la vista: bloquea el móvil justo después de tocar «Probar» y vuelve a intentarlo.', 'The rest ended with the app on screen: lock the phone right after tapping "Test" and try again.')
  }
  if (test.notifiedAt !== undefined && late(test.notifiedAt) <= 3) {
    return <>✓ {t('La notificación salió a su hora.', 'The notification fired on time.')} {late(test.pageAt!) > 3 ? t('(La cuenta atrás de la pantalla bloqueada se paró: el aviso lo dio el plan B.)', '(The lock-screen countdown stopped: the backup path sent the alert.)') : ''} {t('Si no la viste, revisa que las notificaciones del navegador estén permitidas y se muestren en la pantalla bloqueada.', 'If you did not see it, check that browser notifications are allowed and shown on the lock screen.')}</>
  }
  const delay = late(test.notifiedAt ?? test.pageAt!)
  return <>{t(`El móvil congeló la app al bloquearlo: el aviso salió con ${delay} s de retraso (al volver a abrirla).`, `The phone froze the app when locked: the alert came ${delay} s late (when you reopened it).`)} {tips}</>
}

const measureFields: { key: keyof Omit<Measurement, 'id' | 'date'>; label: string; unit?: string }[] = [
  { key: 'weight', get label() { return t('Peso', 'Weight') } },
  { key: 'bodyFat', get label() { return t('Grasa corporal', 'Body fat') }, unit: '%' },
  { key: 'waist', get label() { return t('Cintura', 'Waist') }, unit: 'cm' },
  { key: 'chest', get label() { return t('Pecho', 'Chest') }, unit: 'cm' },
  { key: 'arm', get label() { return t('Brazo', 'Arm') }, unit: 'cm' },
  { key: 'thigh', get label() { return t('Muslo', 'Thigh') }, unit: 'cm' },
]

function measurementSummary(m: Measurement, unit: Unit) {
  return measureFields
    .filter((f) => m[f.key] !== undefined)
    .map((f) => `${f.label} ${f.key === 'weight' ? weight(m.weight!, unit) : `${num(m[f.key]!)} ${f.unit}`}`)
    .join(' · ')
}

export function MeasurementsScreen() {
  const data = useData()
  const unit = data.settings.unit
  const list = [...data.measurements].sort((a, b) => b.date - a.date)
  const weights = list.filter((m) => m.weight !== undefined).reverse()
  const [adding, setAdding] = useState(false)
  const [remove, setRemove] = useState<string>()

  return (
    <>
      <NavBar showBack title={t('Medidas', 'Measurements')} right={<button className="nav-btn bold" onClick={() => setAdding(true)}>{t('Añadir', 'Add')}</button>} />
      <div className="screen with-nav">
        {list.length === 0 ? (
          <Empty icon={Scale} title={t('Sin medidas', 'No measurements')} message={t('Registra tu peso y medidas para ver cómo cambia tu cuerpo.', 'Log your weight and measurements to see how your body changes.')}
            action={<button className="btn primary" onClick={() => setAdding(true)}>{t('Añadir medida', 'Add measurement')}</button>} />
        ) : (
          <>
            {weights.length >= 2 && (
              <Card title={t('Peso corporal', 'Body weight')} icon={Scale}>
                <LineChart points={weights.map((m) => ({ x: m.date, y: fromKg(m.weight!, unit) }))} />
                <span className="small muted bold">
                  {(() => {
                    const change = fromKg(weights[weights.length - 1].weight! - weights[0].weight!, unit)
                    return `${change >= 0 ? '+' : ''}${num(change)} ${unit} ${t('desde el', 'since')} ${shortDay(weights[0].date)}`
                  })()}
                </span>
              </Card>
            )}
            <div className="list-header">{t('Registros', 'Entries')}</div>
            <div className="list">
              {list.map((m) => (
                <button key={m.id} className="list-row" onClick={() => setRemove(m.id)}>
                  <span className="grow">
                    <span className="bold" style={{ display: 'block' }}>{day(m.date)}</span>
                    <span className="small muted">{measurementSummary(m, unit)}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {adding && <MeasurementEditor unit={unit} onClose={() => setAdding(false)} />}
      {remove && (
        <ActionSheet onClose={() => setRemove(undefined)} options={[{
          label: t('Eliminar registro', 'Delete entry'), destructive: true,
          onSelect: () => withUndo(t('Medida eliminada', 'Measurement deleted'), () => update((d) => { d.measurements = d.measurements.filter((m) => m.id !== remove) })),
        }]} />
      )}
    </>
  )
}

function MeasurementEditor({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [values, setValues] = useState<Record<string, string>>({})
  const parsed = Object.fromEntries(measureFields.map((f) => [f.key, parseDecimal(values[f.key] ?? '')]))
  const empty = Object.values(parsed).every((v) => v === null)

  const save = () => {
    update((d) => {
      const m: Measurement = { id: uid(), date: new Date(`${date}T12:00:00`).getTime() }
      for (const f of measureFields) {
        const v = parsed[f.key]
        if (v !== null) m[f.key] = f.key === 'weight' ? toKg(v, unit) : v
      }
      d.measurements.push(m)
    })
    onClose()
  }

  return (
    <Sheet title={t('Nueva medida', 'New measurement')} onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}
      right={<button className="nav-btn bold" disabled={empty} onClick={save}>{t('Guardar', 'Save')}</button>}>
      <div className="list">
        <label className="list-row">
          <span className="grow">{t('Fecha', 'Date')}</span>
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="list">
        {measureFields.map((f) => (
          <label key={f.key} className="list-row">
            <span className="grow">{f.label}</span>
            <input inputMode="decimal" placeholder="—" style={{ textAlign: 'right', width: 90 }} value={values[f.key] ?? ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            <span className="muted" style={{ width: 28 }}>{f.unit ?? unit}</span>
          </label>
        ))}
      </div>
    </Sheet>
  )
}

// MARK: Calendario

export function CalendarScreen() {
  const data = useData()
  const sessions = useMemo(() => finishedSessions(data), [data])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState<number>()
  const byDay = new Map<number, typeof sessions>()
  for (const s of sessions) {
    const k = startOfDay(s.start).getTime()
    byDay.set(k, [...(byDay.get(k) ?? []), s])
  }
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leading = (month.getDay() + 6) % 7
  const cells: (Date | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
  const trainedThisMonth = cells.filter((d) => d && byDay.has(d.getTime())).length
  const today = startOfDay(Date.now()).getTime()
  const shift = (n: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
    setSelected(undefined)
  }

  return (
    <>
      <NavBar showBack title={t('Calendario', 'Calendar')} />
      <div className="screen with-nav">
        <Card>
          <div className="row between">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label={t('Mes anterior', 'Previous month')}><ChevronLeft size={20} /></button>
            <strong>{monthYear(month)}</strong>
            <button className="icon-btn" onClick={() => shift(1)} aria-label={t('Mes siguiente', 'Next month')}><ChevronRight size={20} /></button>
          </div>
          <div className="calendar">
            {t('LMXJVSD', 'MTWTFSS').split('').map((l, i) => <span key={i} className="tiny muted bold">{l}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const time = d.getTime()
              const trained = byDay.has(time)
              return (
                <button key={time} className={`day ${trained ? 'trained' : ''} ${time === today ? 'today' : ''} ${selected === time ? 'selected' : ''}`}
                  onClick={() => setSelected(trained ? time : undefined)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <span className="small muted" style={{ textAlign: 'center' }}>
            {t(`${plural(trainedThisMonth, ['día entrenado', 'días entrenados'], ['', ''])} este mes`, `${plural(trainedThisMonth, ['', ''], ['day', 'days'])} trained this month`)}
          </span>
        </Card>
        {selected !== undefined && byDay.get(selected) && (
          <>
            <div className="list-header">{day(selected)}</div>
            <div className="list">
              {byDay.get(selected)!.map((s) => <SessionRow key={s.id} session={s} unit={data.settings.unit} onClick={() => navigate('progress', 'session', s.id)} />)}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// MARK: Herramientas

function NumberField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: ReactNode }) {
  return (
    <label className="list-row">
      <span className="grow">{label}</span>
      <input inputMode="decimal" placeholder="0" style={{ textAlign: 'right', width: 100, fontSize: 17 }} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="muted">{suffix}</span>
    </label>
  )
}

export function OneRepMaxScreen() {
  const { unit } = useData().settings
  const [w, setW] = useState('')
  const [reps, setReps] = useState(5)
  const value = e1rm(parseDecimal(w) ?? 0, reps)
  const step = unit === 'kg' ? 2.5 : 5
  const hint = (pct: number) =>
    pct >= 95 ? '~2 reps' : pct >= 90 ? '~3-4 reps' : pct >= 85 ? '~5-6 reps' : pct >= 80 ? '~7-8 reps' : pct >= 75 ? '~9-10 reps' : pct >= 70 ? '~11-12 reps' : t('calentamiento / técnica', 'warm-up / technique')
  return (
    <>
      <NavBar showBack title={t('Calculadora de 1RM', '1RM calculator')} />
      <div className="screen with-nav">
        <div className="list">
          <NumberField label={t('Peso levantado', 'Weight lifted')} value={w} onChange={setW} suffix={unit} />
          <div className="list-row">
            <span className="grow">{t('Repeticiones', 'Reps')}</span>
            <button className="icon-btn" onClick={() => setReps(Math.max(1, reps - 1))}>−</button>
            <strong style={{ minWidth: 28, textAlign: 'center' }}>{reps}</strong>
            <button className="icon-btn" onClick={() => setReps(Math.min(20, reps + 1))}>+</button>
          </div>
        </div>
        <p className="list-footer">{t('Fórmula de Epley. Es más fiable con series de 10 repeticiones o menos.', 'Epley formula. It is most reliable with sets of 10 reps or fewer.')}</p>
        {value > 0 && (
          <>
            <Card>
              <span className="muted" style={{ textAlign: 'center' }}>{t('1RM estimado', 'Estimated 1RM')}</span>
              <span className="big-number" style={{ textAlign: 'center' }}>{num(value)} {unit}</span>
            </Card>
            <div className="list-header">{t('Porcentajes de trabajo', 'Working percentages')}</div>
            <div className="list">
              {[95, 90, 85, 80, 75, 70, 65, 60, 50].map((pct) => (
                <div key={pct} className="list-row">
                  <strong style={{ width: 52 }}>{pct} %</strong>
                  <span className="grow small muted">{hint(pct)}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{num(Math.round((value * pct) / 100 / step) * step)} {unit}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export function PlatesScreen() {
  const { unit } = useData().settings
  const [target, setTarget] = useState('')
  const total = parseDecimal(target) ?? 0
  return (
    <>
      <NavBar showBack title={t('Calculadora de discos', 'Plate calculator')} />
      <div className="screen with-nav">
        <div className="list">
          <NumberField label={t('Peso objetivo', 'Target weight')} value={target} onChange={setTarget} suffix={unit} />
        </div>
        {total > 0 && <Card title={t('Discos por lado', 'Plates per side')}><PlatesView weightKg={toKg(total, unit)} showTotal={false} /></Card>}
        <PlateInventory />
      </div>
    </>
  )
}

