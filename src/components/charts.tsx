import { useId } from 'react'
import { num, shortDay } from '../lib/format'

// Gráficas SVG sencillas: barras verticales, línea y barras horizontales.

const W = 320

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

export function BarChart({ data, height = 170, color = 'var(--accent)' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const gradient = useId()
  const pad = { l: 4, r: 36, t: 8, b: 20 }
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const cw = W - pad.l - pad.r
  const ch = height - pad.t - pad.b
  const bw = cw / data.length
  const ticks = [0, 0.5, 1]
  return (
    // Para lectores de pantalla, los datos en texto (la gráfica no se puede «ver»).
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} width="100%" role="img"
      aria-label={data.map((d) => `${d.label}: ${num(d.value)}`).join(', ')}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const y = pad.t + ch * (1 - t)
        return (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y} y2={y} />
            <text x={W - pad.r + 4} y={y + 3}>{num(max * t)}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * ch
        return (
          <g key={i}>
            {d.value > 0 && (
              <rect x={pad.l + i * bw + bw * 0.18} y={pad.t + ch - h} width={bw * 0.64} height={h} rx={3} fill={`url(#${gradient})`} />
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

export function LineChart({ points, height = 180, color = 'var(--accent)', zeroBased = false }: { points: { x: number; y: number }[]; height?: number; color?: string; zeroBased?: boolean }) {
  const pad = { l: 4, r: 40, t: 10, b: 20 }
  const ys = points.map((p) => p.y)
  let min = zeroBased ? 0 : Math.min(...ys)
  let max = Math.max(...ys)
  if (max === min) {
    max += 1
    min = Math.max(0, min - 1)
  }
  const span = max - min
  min -= zeroBased ? 0 : span * 0.1
  max += span * 0.1
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
      {points.map((p, i) => <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3.5} fill={color} />)}
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
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--accent)' }} />
          </div>
          <span className="small muted" style={{ textAlign: 'right' }}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
