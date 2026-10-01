import { Chip, Sheet } from '../components/ui'
import { editable, fromKg, toKg, weight, type Unit } from '../lib/format'
import { BARS, loadBar } from '../lib/plates'
import { updateSettings, useData } from '../lib/store'
import { t } from '../lib/i18n'

// Hoja con los discos que hay que poner en cada lado de la barra para un peso.

// Colores de competición (fáciles de reconocer en el gimnasio) y tamaño relativo de cada disco.
// Texto oscuro sobre los discos claros (amarillo, blanco y plata) y claro sobre los demás.
const LIGHT = new Set(['#e8b923', '#e9eaee', '#b7bcc6'])
const LOOK: Record<string, { fill: string; h: number; w: number }> = {
  'kg25': { fill: '#d64541', h: 88, w: 15 }, 'kg20': { fill: '#2f6fd6', h: 88, w: 13 }, 'kg15': { fill: '#e8b923', h: 80, w: 12 },
  'kg10': { fill: '#2e9e5b', h: 70, w: 11 }, 'kg5': { fill: '#e9eaee', h: 52, w: 9 }, 'kg2.5': { fill: '#d64541', h: 42, w: 8 }, 'kg1.25': { fill: '#b7bcc6', h: 34, w: 7 },
  'lb45': { fill: '#2f6fd6', h: 88, w: 15 }, 'lb35': { fill: '#e8b923', h: 80, w: 13 }, 'lb25': { fill: '#2e9e5b', h: 70, w: 12 },
  'lb10': { fill: '#e9eaee', h: 52, w: 9 }, 'lb5': { fill: '#d64541', h: 42, w: 8 }, 'lb2.5': { fill: '#b7bcc6', h: 34, w: 7 },
}

/** Barra con los discos de cada lado para un peso (en kg), con selector de barra. */
export function PlatesView({ weightKg, showTotal = true }: { weightKg: number; showTotal?: boolean }) {
  const data = useData()
  const unit: Unit = data.settings.unit
  const bars = BARS[unit]
  const saved = data.settings.barKg !== undefined ? fromKg(data.settings.barKg, unit) : undefined
  // La barra guardada, o la más parecida de la unidad actual (si se cambió de kg a lb).
  const bar = saved === undefined ? bars[0] : bars.reduce((a, b) => (Math.abs(b - saved) < Math.abs(a - saved) ? b : a))
  const load = loadBar(weightKg, bar, unit)
  const light = fromKg(weightKg, unit) < bar - 1e-6
  const u = unit

  // Dibujo de media barra: la parte central a la izquierda y los discos hacia fuera.
  let x = 118
  const plates = load.perSide.map((p, i) => {
    const look = LOOK[`${unit}${p}`]
    const rect = <rect key={i} x={x} y={60 - look.h / 2} width={look.w} height={look.h} rx={3} fill={look.fill} stroke="rgba(0,0,0,.25)" strokeWidth={1} />
    x += look.w + 2
    return rect
  })

  return (
      <div className="plates">
        {showTotal && <div className="plates-total">{weight(weightKg, unit)}</div>}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {bars.map((b) => (
            <Chip key={b} label={t(`Barra de ${editable(b)} ${u}`, `${editable(b)} ${u} bar`)} active={b === bar} onClick={() => updateSettings({ barKg: toKg(b, unit) })} />
          ))}
        </div>
        <svg viewBox="0 0 320 120" className="plates-svg" role="img"
          aria-label={load.perSide.length ? `${t('Por lado', 'Per side')}: ${load.perSide.map(editable).join(', ')} ${u}` : t('Solo la barra', 'Just the bar')}>
          <rect x={0} y={55} width={112} height={10} rx={3} className="plates-bar" />
          <rect x={106} y={46} width={10} height={28} rx={2} className="plates-bar" />
          <rect x={116} y={56} width={200} height={8} rx={3} className="plates-bar" />
          {plates}
        </svg>
        {light ? (
          <p className="plates-note">{t(`Pesa menos que la barra sola (${editable(bar)} ${u}).`, `It weighs less than the empty bar (${editable(bar)} ${u}).`)}</p>
        ) : load.perSide.length ? (
          <p className="plates-list">
            {load.perSide.map((p, i) => <span key={i} className="plates-chip" style={{ background: LOOK[`${unit}${p}`].fill, color: LIGHT.has(LOOK[`${unit}${p}`].fill) ? '#111' : '#fff' }}>{editable(p)}</span>)}
            <span className="muted"> {u} {t('en cada lado', 'on each side')}</span>
          </p>
        ) : (
          <p className="plates-note">{t('Solo la barra.', 'Just the bar.')}</p>
        )}
        {!light && load.missing > 0 && (
          <p className="plates-note">
            {t(`Con estos discos llegas a ${editable(load.total)} ${u}: faltan ${editable(load.missing)} ${u}, que no se pueden repartir por igual.`, `With these plates you reach ${editable(load.total)} ${u}: ${editable(load.missing)} ${u} short, which cannot be split evenly.`)}
          </p>
        )}
      </div>
  )
}

export function PlatesSheet({ weightKg, onClose }: { weightKg: number; onClose: () => void }) {
  return (
    <Sheet title={t('Discos por lado', 'Plates per side')} onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>{t('Listo', 'Done')}</button>}>
      <PlatesView weightKg={weightKg} />
    </Sheet>
  )
}
