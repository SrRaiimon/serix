import { num, shortDay } from '../lib/format'
import { t } from '../lib/i18n'

// Gráficas SVG sencillas: barras verticales, línea y barras horizontales.

const W = 320

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

export function BarChart({ data, height = 170, color = 'var(--chart-bar)', tick = num, average = false }: {
  data: { label: string; value: number }[]
  height?: number
  color?: string
  /** Formato de las cifras del eje (p. ej. «20 t»). */
  tick?: (v: number) => string
  /** Línea discontinua con la media de las semanas con datos. */
  average?: boolean
}) {
  const pad = { l: 4, r: 46, t: 8, b: 20 }
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const cw = W - pad.l - pad.r
  const ch = height - pad.t - pad.b
  const bw = cw / data.length
  const ticks = [0, 0.5, 1]
  return (
    // Para lectores de pantalla, los datos en texto (la gráfica no se puede «ver»).
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%" role="img"
      aria-label={data.map((d) => `${d.label}: ${num(d.value)}`).join(', ')}>
      {ticks.map((t) => {
        const y = pad.t + ch * (1 - t)
        return (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y} y2={y} />
            <text x={W - pad.r + 4} y={y + 3}>{tick(max * t)}</text>
          </g>
        )
      })}
      {average && (() => {
        const filled = data.filter((d) => d.value > 0)
        if (filled.length < 2) return null
        const mean = filled.reduce((s, d) => s + d.value, 0) / filled.length
        const y = pad.t + ch - (mean / max) * ch
        return <line className="avg-line" x1={pad.l} x2={W - pad.r} y1={y} y2={y} />
      })()}
      {data.map((d, i) => {
        const h = (d.value / max) * ch
        return (
          <g key={i}>
            {d.value === 0 && i === data.length - 1 && (
              // Semana en curso aún vacía: una marca naranja en la base indica dónde va.
              <>
                <rect x={pad.l + i * bw + bw * 0.29} y={pad.t + ch - 4} width={bw * 0.42} height={4} rx={2} fill="var(--accent)" />
                <text x={pad.l + i * bw + bw * 0.71} y={pad.t + ch - 10} textAnchor="end">{t('esta sem.', 'this wk')}</text>
              </>
            )}
            {d.value > 0 && (
              <rect x={pad.l + i * bw + bw * 0.29} y={pad.t + ch - h} width={bw * 0.42} height={h} rx={3} fill={i === data.length - 1 ? 'var(--accent)' : color} />
            )}
            {i % 2 === 0 && (
              <text x={pad.l + i * bw + bw / 2} y={height - 5} textAnchor="middle">{d.label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

export function LineChart({ points, height = 180, color = 'var(--ink)', zeroBased = false }: { points: { x: number; y: number }[]; height?: number; color?: string; zeroBased?: boolean }) {
  const pad = { l: 4, r: 40, t: 10, b: 20 }
  const ys = points.map((p) => p.y)
  let min = zeroBased ? 0 : Math.min(...ys)
  let max = Math.max(...ys)
  if (max === min) {
    max += 1
    min = Math.max(0, min - 1)
  }
  // Ejes con cifras redondas (90 / 110 / 130 en vez de 91 / 110,5 / 130).
  const span = max - min || Math.abs(max) || 1
  const unit = niceStep(span / 5)
  const lo = zeroBased ? 0 : Math.floor((min - span * 0.05) / unit) * unit
  min = min >= 0 ? Math.max(0, lo) : lo
  max = Math.ceil((max + span * 0.05) / unit) * unit
  const xs = points.map((p) => p.x)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs) === x0 ? x0 + 1 : Math.max(...xs)
  const cw = W - pad.l - pad.r
  const ch = height - pad.t - pad.b
  const px = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * cw
  const py = (y: number) => pad.t + ch - ((y - min) / (max - min)) * ch
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
  const first = points.reduce((a, b) => (b.x < a.x ? b : a), points[0])
  const last = points.reduce((a, b) => (b.x > a.x ? b : a), points[0])
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%" role="img"
      aria-label={first ? `${shortDay(first.x)}: ${num(first.y)} → ${shortDay(last.x)}: ${num(last.y)}` : undefined}>
      {[0, 0.5, 1].map((t) => {
        const v = min + (max - min) * t
        return (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={py(v)} y2={py(v)} />
            <text x={W - pad.r + 4} y={py(v) + 3}>{num(v)}</text>
          </g>
        )
      })}
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r={i === points.length - 1 ? 5 : points.length > 16 ? 0 : 3} fill={i === points.length - 1 ? 'var(--accent)' : color} />)}
      <text x={pad.l} y={height - 5}>{shortDay(x0)}</text>
      <text x={W - pad.r} y={height - 5} textAnchor="end">{shortDay(x1)}</text>
    </svg>
  )
}

export function HBarChart({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '112px 1fr 28px', alignItems: 'center', gap: 8 }}>
          <span className="small clamp-1">{item.label}</span>
          <div style={{ height: 16, borderRadius: 4, background: 'var(--fill)', overflow: 'hidden' }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--ink)' }} />
          </div>
          <span className="small muted" style={{ textAlign: 'right' }}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
