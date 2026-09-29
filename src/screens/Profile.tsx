import { Calculator, CalendarDays, ChevronLeft, ChevronRight, Disc, Download, HardDrive, RotateCcw, Scale, ShieldCheck, Trash2, Upload, Volume2, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LineChart } from '../components/charts'
import { ActionSheet, Card, Empty, LargeTitle, NavBar, Row, Segmented, Sheet, useCatalog, useToast } from '../components/ui'
import { count, day, duration, relative, fromKg, monthYear, num, parseDecimal, rest, restOptions, shortDay, startOfDay, toKg, uid, volume, weight, type Unit } from '../lib/format'
import { navigate } from '../lib/router'
import { e1rm, sessionDuration, sessionVolume } from '../lib/stats'
import { MAX_BACKUP_BYTES, parseBackup } from '../lib/backup'
import { migrateCatalog } from '../lib/migrate'
import { exportBackup, requestProtection, storageState, type StorageState } from '../lib/protect'
import { testBeep } from '../lib/timer'
import { finishedSessions, replaceData, resetData, update, updateSettings, useData, type Measurement } from '../lib/store'
import { SessionRow } from './Session'

export function ProfileScreen() {
  const data = useData()
  const catalog = useCatalog()
  const { settings } = data
  const sessions = useMemo(() => finishedSessions(data), [data])
  const [confirmReset, setConfirmReset] = useState(false)
  const [toast, showToast] = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const lastWeight = [...data.measurements].sort((a, b) => b.date - a.date).find((m) => m.weight !== undefined)?.weight
  const initials = settings.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'Tú'

  const [storage, setStorage] = useState<StorageState>()
  useEffect(() => { void storageState().then(setStorage) }, [])
  const protect = async () => {
    const ok = await requestProtection()
    setStorage(await storageState())
    showToast(ok ? 'Datos protegidos' : 'El navegador no lo ha permitido; instala la app o exporta copias')
  }

  const importData = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) return showToast('El archivo es demasiado grande')
    try {
      const parsed = parseBackup(await file.text())
      if (!confirm(`Se sustituirán tus datos actuales por la copia (${count(parsed.sessions.length, 'entrenamiento', 'entrenamientos')}). ¿Continuar?`)) return
      replaceData(parsed)
      // Las copias hechas con el catálogo anterior se adaptan al actual.
      migrateCatalog(catalog)
      showToast('Copia restaurada')
    } catch {
      showToast('El archivo no es una copia válida')
    }
  }

  return (
    <div className="screen">
      <LargeTitle title="Perfil" />
      <Card>
        <div className="row">
          <div className="avatar">{initials}</div>
          <div className="grow">
            <strong style={{ fontSize: 20, display: 'block' }}>{settings.name || 'Tu perfil'}</strong>
            <span className="small muted" style={{ display: 'block' }}>
              {count(sessions.length, 'entrenamiento', 'entrenamientos')} · {duration(sessions.reduce((t, s) => t + sessionDuration(s), 0))}
            </span>
            <span className="small muted">{volume(sessions.reduce((t, s) => t + sessionVolume(s), 0), settings.unit)} levantados</span>
          </div>
        </div>
      </Card>

      <div className="list-header">Cuerpo y actividad</div>
      <div className="list">
        <Row icon={Scale} label="Medidas corporales" detail={lastWeight !== undefined ? weight(lastWeight, settings.unit) : undefined} onClick={() => navigate('profile', 'measurements')} />
        <Row icon={CalendarDays} label="Calendario" onClick={() => navigate('profile', 'calendar')} />
      </div>

      <div className="list-header">Herramientas</div>
      <div className="list">
        <Row icon={Calculator} label="Calculadora de 1RM" onClick={() => navigate('profile', '1rm')} />
        <Row icon={Disc} label="Calculadora de discos" onClick={() => navigate('profile', 'plates')} />
      </div>

      <div className="list-header">Programa</div>
      <div className="list">
        <Row icon={WandSparkles} label="Generar nuevo programa" className="accent" onClick={() => navigate('routines')} chevron={false} />
        <Row icon={RotateCcw} label="Repetir cuestionario inicial" className="accent" onClick={() => updateSettings({ onboarded: false })} chevron={false} />
      </div>

      <div className="list-header">Ajustes</div>
      <div className="list">
        <label className="list-row">
          <span>Nombre</span>
          <input className="grow" style={{ textAlign: 'right', color: 'var(--text-2)' }} placeholder="Tu nombre" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
        </label>
        <div className="list-row">
          <span className="grow">Unidad de peso</span>
          <div style={{ width: 120 }}>
            <Segmented value={settings.unit} onChange={(u: Unit) => updateSettings({ unit: u })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
          </div>
        </div>
        <label className="list-row">
          <span className="grow">Descanso por defecto</span>
          <select className="select" value={settings.defaultRest} onChange={(e) => updateSettings({ defaultRest: Number(e.target.value) })}>
            {restOptions.map((o) => <option key={o} value={o}>{rest(o)}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">Objetivo semanal</span>
          <select className="select" value={settings.weeklyGoal} onChange={(e) => updateSettings({ weeklyGoal: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{count(n, 'entreno', 'entrenos')}</option>)}
          </select>
        </label>
        <label className="list-row">
          <span className="grow">
            Pitido al terminar el descanso
            <span className="small muted" style={{ display: 'block' }}>En iPhone no suena con el modo silencio activado</span>
          </span>
          <input type="checkbox" className="toggle" checked={settings.restSound} onChange={(e) => updateSettings({ restSound: e.target.checked })} />
        </label>
        {settings.restSound && <Row icon={Volume2} label="Probar pitido" onClick={testBeep} chevron={false} />}
        <label className="list-row">
          <span className="grow">
            Anotar esfuerzo (RPE)
            <span className="small muted" style={{ display: 'block' }}>Al marcar cada serie, de 6 a 10</span>
          </span>
          <input type="checkbox" className="toggle" checked={settings.rpe} onChange={(e) => updateSettings({ rpe: e.target.checked })} />
        </label>
      </div>

      <div className="list-header">Tus datos</div>
      <div className="list">
        <Row icon={Download} label="Exportar copia de seguridad" detail={settings.lastBackupAt ? relative(settings.lastBackupAt) : 'Nunca'} onClick={exportBackup} chevron={false} />
        <Row icon={Upload} label="Importar copia de seguridad" onClick={() => fileInput.current?.click()} chevron={false} />
        {storage && storage !== 'unsupported' && (
          <Row icon={HardDrive} label="Protección contra borrado" detail={storage === 'protected' ? 'Activada' : 'Activar'}
            onClick={storage === 'protected' ? undefined : () => void protect()} chevron={false} />
        )}
        <Row icon={Trash2} label="Borrar todos los datos" className="danger" onClick={() => setConfirmReset(true)} chevron={false} />
      </div>
      <p className="list-footer">
        Tus datos se guardan solo en este dispositivo. La protección evita que el navegador los borre para liberar espacio, pero no sustituye a una copia: si borras la app o cambias de móvil, solo podrás recuperarlos con una copia exportada.
      </p>

      <div className="list">
        <Row icon={ShieldCheck} label="Legal y privacidad" onClick={() => navigate('profile', 'legal')} />
      </div>
      <p className="list-footer">Versión {__APP_VERSION__}</p>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importData(f); e.target.value = '' }} />

      {confirmReset && (
        <ActionSheet title="¿Borrar todos los datos?" message="Se eliminarán rutinas, historial y medidas. No se puede deshacer." onClose={() => setConfirmReset(false)}
          options={[{ label: 'Borrar todo', destructive: true, onSelect: () => { resetData(); showToast('Datos borrados') } }]} />
      )}
      {toast}
    </div>
  )
}

// MARK: Medidas

const measureFields: { key: keyof Omit<Measurement, 'id' | 'date'>; label: string; unit?: string }[] = [
  { key: 'weight', label: 'Peso' },
  { key: 'bodyFat', label: 'Grasa corporal', unit: '%' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'arm', label: 'Brazo', unit: 'cm' },
  { key: 'thigh', label: 'Muslo', unit: 'cm' },
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
      <NavBar showBack title="Medidas" right={<button className="nav-btn bold" onClick={() => setAdding(true)}>Añadir</button>} />
      <div className="screen with-nav">
        {list.length === 0 ? (
          <Empty icon={Scale} title="Sin medidas" message="Registra tu peso y medidas para ver cómo cambia tu cuerpo."
            action={<button className="btn primary" onClick={() => setAdding(true)}>Añadir medida</button>} />
        ) : (
          <>
            {weights.length >= 2 && (
              <Card title="Peso corporal" icon={Scale}>
                <LineChart points={weights.map((m) => ({ x: m.date, y: fromKg(m.weight!, unit) }))} />
                <span className="small muted bold">
                  {(() => {
                    const change = fromKg(weights[weights.length - 1].weight! - weights[0].weight!, unit)
                    return `${change >= 0 ? '+' : ''}${num(change)} ${unit} desde el ${shortDay(weights[0].date)}`
                  })()}
                </span>
              </Card>
            )}
            <div className="list-header">Registros</div>
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
          label: 'Eliminar registro', destructive: true,
          onSelect: () => update((d) => { d.measurements = d.measurements.filter((m) => m.id !== remove) }),
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
    <Sheet title="Nueva medida" onClose={onClose}
      left={<button className="nav-btn" onClick={onClose}>Cancelar</button>}
      right={<button className="nav-btn bold" disabled={empty} onClick={save}>Guardar</button>}>
      <div className="list">
        <label className="list-row">
          <span className="grow">Fecha</span>
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
      <NavBar showBack title="Calendario" />
      <div className="screen with-nav">
        <Card>
          <div className="row between">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior"><ChevronLeft size={20} /></button>
            <strong>{monthYear(month)}</strong>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente"><ChevronRight size={20} /></button>
          </div>
          <div className="calendar">
            {'LMXJVSD'.split('').map((l) => <span key={l} className="tiny muted bold">{l}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={`e${i}`} />
              const t = d.getTime()
              const trained = byDay.has(t)
              return (
                <button key={t} className={`day ${trained ? 'trained' : ''} ${t === today ? 'today' : ''} ${selected === t ? 'selected' : ''}`}
                  onClick={() => setSelected(trained ? t : undefined)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <span className="small muted" style={{ textAlign: 'center' }}>
            {count(trainedThisMonth, 'día entrenado', 'días entrenados')} este mes
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
    pct >= 95 ? '~2 reps' : pct >= 90 ? '~3-4 reps' : pct >= 85 ? '~5-6 reps' : pct >= 80 ? '~7-8 reps' : pct >= 75 ? '~9-10 reps' : pct >= 70 ? '~11-12 reps' : 'calentamiento / técnica'
  return (
    <>
      <NavBar showBack title="Calculadora de 1RM" />
      <div className="screen with-nav">
        <div className="list">
          <NumberField label="Peso levantado" value={w} onChange={setW} suffix={unit} />
          <div className="list-row">
            <span className="grow">Repeticiones</span>
            <button className="icon-btn" onClick={() => setReps(Math.max(1, reps - 1))}>−</button>
            <strong style={{ minWidth: 28, textAlign: 'center' }}>{reps}</strong>
            <button className="icon-btn" onClick={() => setReps(Math.min(20, reps + 1))}>+</button>
          </div>
        </div>
        <p className="list-footer">Fórmula de Epley. Es más fiable con series de 10 repeticiones o menos.</p>
        {value > 0 && (
          <>
            <Card>
              <span className="muted" style={{ textAlign: 'center' }}>1RM estimado</span>
              <span className="big-number" style={{ textAlign: 'center' }}>{num(value)} {unit}</span>
            </Card>
            <div className="list-header">Porcentajes de trabajo</div>
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
  const plates = unit === 'kg' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5]
  const bars = unit === 'kg' ? [20, 15, 10] : [45, 35, 25]
  const [target, setTarget] = useState('')
  const [bar, setBar] = useState(bars[0])
  const barWeight = bars.includes(bar) ? bar : bars[0]
  const total = parseDecimal(target) ?? 0
  let side = Math.max(0, (total - barWeight) / 2)
  const perSide: number[] = []
  for (const p of plates) {
    while (side + 0.0001 >= p) {
      perSide.push(p)
      side -= p
    }
  }
  const grouped = plates.map((p) => ({ plate: p, n: perSide.filter((x) => x === p).length })).filter((g) => g.n > 0)
  const colors = ['#e5383b', '#1e6fd9', '#f5b400', '#2fa84f', '#8e8e93', '#8e8e93', '#8e8e93']

  return (
    <>
      <NavBar showBack title="Calculadora de discos" />
      <div className="screen with-nav">
        <div className="list">
          <NumberField label="Peso objetivo" value={target} onChange={setTarget} suffix={unit} />
          <label className="list-row">
            <span className="grow">Barra</span>
            <select className="select" value={barWeight} onChange={(e) => setBar(Number(e.target.value))}>
              {bars.map((b) => <option key={b} value={b}>{num(b)} {unit}</option>)}
            </select>
          </label>
        </div>
        {total > barWeight && (
          <Card title="Discos por lado">
            <svg viewBox="0 0 320 110" width="100%">
              <rect x="0" y="50" width="70" height="10" rx="2" fill="#8e8e93" />
              <rect x="70" y="38" width="8" height="34" rx="2" fill="#8e8e93" />
              {perSide.map((p, i) => {
                const h = Math.max(28, (p / plates[0]) * 100)
                return <rect key={i} x={82 + i * 16} y={55 - h / 2} width={13} height={h} rx={3} fill={colors[plates.indexOf(p)]} />
              })}
              <rect x={82 + perSide.length * 16} y="50" width="30" height="10" rx="2" fill="#8e8e93" />
            </svg>
            {grouped.map((g) => (
              <div key={g.plate} className="row between">
                <span>{num(g.plate)} {unit}</span>
                <strong>× {g.n}</strong>
              </div>
            ))}
            {side > 0.01 && <span className="small" style={{ color: '#f08c00' }}>Faltan {num(side * 2)} {unit} que no se pueden cargar con los discos estándar.</span>}
          </Card>
        )}
        {total > 0 && total <= barWeight && <p className="muted">El peso objetivo debe ser mayor que la barra.</p>}
      </div>
    </>
  )
}

