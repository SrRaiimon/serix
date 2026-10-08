import { Play, Snail } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useCatalog } from './ui'
import { FIGURES, FLOOR, type Figure, type Part, type Pose, type Prop } from '../lib/figures'
import { barFrontEnds, fitViewBox, place, poseAt, propAnchor, shadowX, step, type Joints, type Pt } from '../lib/figureEngine'
import { t as tr } from '../lib/i18n'

// Figura de movimiento propia (dibujo original generado con código): un maniquí de perfil o de
// frente que pasa de la posición inicial a la final. Cada postura son ángulos de articulación y la
// figura se calcula con cinemática directa, así que la animación interpola ángulos, no imágenes.

const W = { torso: [20, 28], thigh: [19, 14], shin: [14, 9], upper: [13, 10], fore: [10, 7] } as const

/** Segmento afilado con extremos redondeados. */
function Limb({ a, b, wa, wb, className, fill, filter }: { a: Pt; b: Pt; wa: number; wb: number; className?: string; fill?: string; filter?: string }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const p = (pt: Pt, w: number, s: number) => `${(pt[0] + (nx * w * s) / 2).toFixed(1)},${(pt[1] + (ny * w * s) / 2).toFixed(1)}`
  return (
    <g className={className} fill={fill} filter={filter}>
      <polygon points={`${p(a, wa, 1)} ${p(b, wb, 1)} ${p(b, wb, -1)} ${p(a, wa, -1)}`} />
      <circle cx={a[0]} cy={a[1]} r={wa / 2} />
      <circle cx={b[0]} cy={b[1]} r={wb / 2} />
    </g>
  )
}

/** Panel de músculo sobre la silueta: algo más estrecho y corto, para que se vea la separación. */
function Panel({ a, b, wa, wb, fill, filter, inset = 3 }: { a: Pt; b: Pt; wa: number; wb: number; fill: string; filter?: string; inset?: number }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const k = Math.min(inset / len, 0.3)
  const a2: Pt = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
  const b2: Pt = [b[0] - (b[0] - a[0]) * k, b[1] - (b[1] - a[1]) * k]
  return <Limb a={a2} b={b2} wa={Math.max(2, wa - 3.5)} wb={Math.max(2, wb - 3.5)} fill={fill} filter={filter} />
}

function PropShape({ prop, j, pose, ids }: { prop: Prop; j: Joints; pose: Pose; ids: string }) {
  const metal = `url(#${ids}metal)`
  const dark = `url(#${ids}dark)`
  const { x, y, angle } = propAnchor(prop, j, pose)
  switch (prop.type) {
    case 'plate':
      return (
        <g>
          <circle cx={x} cy={y} r={prop.size ?? 32} fill={metal} />
          <circle cx={x} cy={y} r={(prop.size ?? 32) * 0.55} className="fig-gear-ring" />
          <circle cx={x} cy={y} r={4.5} fill={dark} />
        </g>
      )
    case 'dumbbell':
      return (
        <g fill={dark}>
          <rect x={x - 13} y={y - 2.5} width={26} height={5} rx={2.5} />
          <rect x={x - 17} y={y - 9} width={8} height={18} rx={3} />
          <rect x={x + 9} y={y - 9} width={8} height={18} rx={3} />
        </g>
      )
    case 'kettlebell':
      // Colgando de la mano o, en los press, apoyada por encima de ella.
      return prop.up ? (
        <g fill={dark}>
          <circle cx={x} cy={y - 11} r={10} />
          <path d={`M${x - 6},${y - 4} Q${x - 7},${y + 5} ${x},${y + 5} Q${x + 7},${y + 5} ${x + 6},${y - 4}`} className="fig-gear-stroke" />
        </g>
      ) : (
        <g fill={dark}>
          <circle cx={x} cy={y + 13} r={10} />
          <path d={`M${x - 6},${y + 6} Q${x - 7},${y - 3} ${x},${y - 3} Q${x + 7},${y - 3} ${x + 6},${y + 6}`} className="fig-gear-stroke" />
        </g>
      )
    case 'bench': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      // Con el tablero inclinado (gira sobre su extremo derecho), cada pata llega hasta él.
      const tilt = ((prop.tilt ?? 0) * Math.PI) / 180
      const leg = (x: number) => {
        const d = x - x1
        return { x: x1 + d * Math.cos(tilt), y: top + d * Math.sin(tilt) + 6 }
      }
      const legs = [leg(x0 + 15), leg(x1 - 15)]
      return (
        <g>
          {legs.map((l, i) => <rect key={i} x={l.x - 3} y={l.y} width={6} height={Math.max(0, FLOOR - l.y)} fill={dark} />)}
          <rect x={x0} y={top} width={x1 - x0} height={11} rx={5} fill={metal} transform={prop.tilt ? `rotate(${prop.tilt} ${x1} ${top})` : undefined} />
        </g>
      )
    }
    case 'box': {
      const [x0, x1] = prop.span!
      return <rect x={x0} y={prop.y} width={x1 - x0} height={FLOOR - prop.y!} rx={5} fill={metal} />
    }
    case 'bar': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      return (
        <g>
          <rect x={x1 - 6} y={top} width={6} height={FLOOR - top} fill={metal} />
          <rect x={x0} y={top - 3} width={x1 - x0} height={6} rx={3} fill={dark} />
        </g>
      )
    }
    case 'cable':
      return (
        <g>
          <line x1={prop.point![0]} y1={prop.point![1]} x2={x} y2={y} className="fig-cable" />
          <circle cx={prop.point![0]} cy={prop.point![1]} r={6} fill={dark} />
        </g>
      )
    case 'band': {
      const [ax, ay] = prop.to ? j[prop.to] : prop.point!
      return <line x1={ax} y1={ay} x2={x} y2={y} className="fig-band" />
    }
    case 'pad':
      return prop.size === 0 ? null : <circle cx={x} cy={y} r={prop.size ?? 8} fill={dark} />
    case 'platform': {
      // Pegada a la suela: el pie mide unos 5 de grosor desde el tobillo y la plataforma, 3,5 de medio trazo.
      const [ex, ey] = step([x, y], angle, 8)
      const a = step([ex, ey], angle - 90, 30)
      const b = step([ex, ey], angle + 90, 30)
      return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="fig-platform" />
    }
    case 'seat': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      const back = prop.back
      return (
        <g>
          <rect x={(x0 + x1) / 2 - 3} y={top + 6} width={6} height={FLOOR - top - 6} fill={dark} />
          {back && <rect x={back[0]} y={back[1]} width={10} height={back[2]} rx={4} fill={metal} transform={back[3] ? `rotate(${back[3]} ${back[0] + 5} ${back[1] + back[2]})` : undefined} />}
          <rect x={x0} y={top} width={x1 - x0} height={10} rx={4} fill={metal} />
        </g>
      )
    }
    case 'rest': {
      // Respaldo que sigue al cuerpo: línea gruesa paralela al tronco, un poco por detrás.
      const shift = (pt: Pt) => step(pt, angle, prop.offset ?? 0)
      const a = shift(j[prop.at!])
      const b = step(shift(j[prop.to!]), pose.torso, 12)
      return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="fig-rest" />
    }
    case 'ball':
      // Fitball, balón medicinal o rodillo de espuma.
      return (
        <g>
          <circle cx={x} cy={y} r={prop.size ?? 10} fill={metal} />
          <circle cx={x} cy={y} r={(prop.size ?? 10) * 0.7} className="fig-gear-ring" />
        </g>
      )
    case 'grip':
      return <rect x={x - 18} y={y - 3} width={36} height={6} rx={3} fill={dark} />
    case 'barFront': {
      const { x0, x1, y: by } = barFrontEnds(j)
      return (
        <g>
          <rect x={x0} y={by - 2.5} width={x1 - x0} height={5} rx={2.5} fill={dark} />
          <rect x={x0 - 2} y={by - 24} width={11} height={48} rx={3} fill={metal} />
          <rect x={x1 - 9} y={by - 24} width={11} height={48} rx={3} fill={metal} />
        </g>
      )
    }
  }
}

// Zonas del muñeco que se pueden resaltar y los músculos del catálogo que las activan.
type Zone = 'thigh' | 'hip' | 'shin' | 'chest' | 'belly' | 'deltoid' | 'upperArm' | 'forearm' | 'neck'
const ZONES: Record<string, Zone[]> = {
  quads: ['thigh'], hamstrings: ['thigh'], adductors: ['thigh'], abductors: ['thigh', 'hip'], glutes: ['hip'],
  calves: ['shin'], pectorals: ['chest'], lats: ['chest'], 'upper-back': ['chest'], traps: ['chest', 'neck'],
  abs: ['belly'], spine: ['belly'], delts: ['deltoid'], biceps: ['upperArm'], triceps: ['upperArm'], forearms: ['forearm'], neck: ['neck'],
}
// Si no se conocen los músculos del ejercicio, se usan las zonas generales de la figura.
const PART_ZONES: Record<Part, Zone[]> = {
  legs: ['thigh'], calves: ['shin'], glutes: ['hip'], back: ['chest'], chest: ['chest'], core: ['belly'],
  shoulders: ['deltoid'], arms: ['upperArm'], forearms: ['forearm'],
}

export interface Muscles { muscle: string; secondaryMuscles: string[] }

function zonesFor(figure: Figure, muscles?: Muscles) {
  const primary = new Set<Zone>()
  const secondary = new Set<Zone>()
  if (muscles) {
    for (const z of ZONES[muscles.muscle] ?? []) primary.add(z)
    for (const m of muscles.secondaryMuscles) for (const z of ZONES[m] ?? []) if (!primary.has(z)) secondary.add(z)
  }
  if (!primary.size) for (const part of figure.work) for (const z of PART_ZONES[part]) primary.add(z)
  return { primary, secondary }
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

export function Scene({ figure, pose, ids, muscles }: { figure: Figure; pose: Pose; ids: string; muscles?: Muscles }) {
  const j = place(figure, pose)
  const { primary, secondary } = zonesFor(figure, muscles)
  const glow = `url(#${ids}g)`
  const fill = (zone: Zone, far = false) =>
    primary.has(zone) ? `url(#${ids}p${far ? 'f' : ''})` : secondary.has(zone) ? `url(#${ids}s${far ? 'f' : ''})` : `url(#${ids}m${far ? 'f' : ''})`
  const filter = (zone: Zone) => (primary.has(zone) ? glow : undefined)
  const isFront = figure.view === 'front'
  const pelvis: Pt = isFront ? [(j.hip[0] + j.hip2[0]) / 2, j.hip[1]] : j.hip
  const neck: Pt = isFront ? [(j.shoulder[0] + j.shoulder2[0]) / 2, j.shoulder[1] - 4] : j.shoulder
  const waist = lerp(pelvis, neck, 0.46)
  const tw = isFront ? [28, 42] : W.torso
  const torsoMid = tw[0] + (tw[1] - tw[0]) * 0.46
  const head = j.head
  const neckTop = lerp(neck, head, 0.55)
  const sx = shadowX(figure, j)

  // Extremidad completa: silueta y dos paneles (segmento superior e inferior).
  const limb = (from: Pt, mid: Pt, to: Pt, w1: readonly number[], w2: readonly number[], z1: Zone, z2: Zone, far: boolean) => (
    <g>
      <Limb a={from} b={mid} wa={w1[0] + 2.5} wb={w1[1] + 2.5} className="fig-body" />
      <Limb a={mid} b={to} wa={w2[0] + 2.5} wb={w2[1] + 2.5} className="fig-body" />
      <Panel a={from} b={mid} wa={w1[0]} wb={w1[1]} fill={fill(z1, far)} filter={far ? undefined : filter(z1)} />
      <Panel a={mid} b={to} wa={w2[0]} wb={w2[1]} fill={fill(z2, far)} filter={far ? undefined : filter(z2)} />
    </g>
  )
  const narrow = (w: readonly number[], d: number) => [w[0] - d, w[1] - d] as const

  return (
    <g>
      <ellipse cx={sx} cy={FLOOR + 3} rx={figure.shadow ?? 62} ry={5} className="fig-shadow" />
      {figure.props.filter((p) => !p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} ids={ids} />)}
      {/* Lado lejano */}
      {limb(j.hip2, j.knee2, j.ankle2, narrow(W.thigh, 2), narrow(W.shin, 2), 'thigh', 'shin', true)}
      <Limb a={j.ankle2} b={j.toe2} wa={9} wb={6} className="fig-body" />
      {limb(j.shoulder2, j.elbow2, j.wrist2, narrow(W.upper, 2), narrow(W.fore, 2), 'upperArm', 'forearm', true)}
      {/* Tronco, cadera, cuello y cabeza */}
      <Limb a={pelvis} b={neck} wa={tw[0] + 3} wb={tw[1] + 3} className="fig-body" />
      <Panel a={pelvis} b={waist} wa={tw[0]} wb={torsoMid} fill={fill('belly')} filter={filter('belly')} inset={2} />
      <Panel a={waist} b={neck} wa={torsoMid} wb={tw[1]} fill={fill('chest')} filter={filter('chest')} inset={2} />
      {(isFront ? [j.hip, j.hip2] : [j.hip]).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={11.5} className="fig-body" />
          <circle cx={x} cy={y} r={9.5} fill={fill('hip')} filter={filter('hip')} />
        </g>
      ))}
      <Limb a={neck} b={neckTop} wa={11} wb={10} className="fig-body" />
      <Panel a={neck} b={neckTop} wa={9} wb={8} fill={fill('neck')} filter={filter('neck')} inset={1} />
      <circle cx={head[0]} cy={head[1]} r={12.5} className="fig-body" />
      <circle cx={head[0]} cy={head[1]} r={10.8} fill={`url(#${ids}m)`} />
      {/* Lado cercano */}
      {limb(j.hip, j.knee, j.ankle, W.thigh, W.shin, 'thigh', 'shin', false)}
      <Limb a={j.ankle} b={j.toe} wa={10} wb={7} className="fig-body" />
      {limb(j.shoulder, j.elbow, j.wrist, W.upper, W.fore, 'upperArm', 'forearm', false)}
      {/* De frente se ven los dos hombros; de perfil, solo el cercano. */}
      {(isFront ? [j.shoulder, j.shoulder2] : [j.shoulder]).map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={9} className="fig-body" />
          <circle cx={x} cy={y} r={7.2} fill={fill('deltoid')} filter={filter('deltoid')} />
        </g>
      ))}
      <circle cx={j.wrist[0]} cy={j.wrist[1]} r={4.5} className="fig-body" />
      {figure.props.filter((p) => p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} ids={ids} />)}
    </g>
  )
}

/** Degradados (mismos colores que el mapa muscular) y brillo del músculo principal. */
export function FigureDefs({ id }: { id: string }) {
  const grad = (key: string, stops: [string, string, number?][]) => (
    <linearGradient id={`${id}${key}`} x1="0" y1="0" x2="1" y2="1">
      {stops.map(([offset, cls, opacity], i) => <stop key={i} offset={offset} className={cls} stopOpacity={opacity} />)}
    </linearGradient>
  )
  return (
    <defs>
      {grad('m', [['0', 'mm-stop-m1'], ['1', 'mm-stop-m2']])}
      {grad('mf', [['0', 'mm-stop-m1', 0.55], ['1', 'mm-stop-m2', 0.55]])}
      {grad('p', [['0', 'fig-stop-p1'], ['0.55', 'fig-stop-p2'], ['1', 'fig-stop-p3']])}
      {grad('pf', [['0', 'fig-stop-p1', 0.7], ['1', 'fig-stop-p3', 0.7]])}
      {grad('s', [['0', 'fig-stop-s1', 0.85], ['1', 'fig-stop-s2', 0.7]])}
      {grad('sf', [['0', 'fig-stop-s1', 0.55], ['1', 'fig-stop-s2', 0.45]])}
      {grad('metal', [['0', 'fig-stop-metal1'], ['1', 'fig-stop-metal2']])}
      {grad('dark', [['0', 'fig-stop-dark1'], ['1', 'fig-stop-dark2']])}
      <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.6" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2

export function hasFigure(exerciseId: string) {
  return exerciseId in FIGURES
}

/** Figura animada del ejercicio (si hay una para él). */
export function MoveFigure({ exercise }: { exercise: Muscles & { id: string; name: string } }) {
  const figure = FIGURES[exercise.id]
  const ids = useId().replace(/:/g, '')
  const [t, setT] = useState(0)
  // Tocar la figura la pausa; el botón alterna entre velocidad normal y cámara lenta.
  const [paused, setPaused] = useState(false)
  const [slow, setSlow] = useState(false)
  const control = useRef({ paused, slow })
  control.current = { paused, slow }
  useEffect(() => {
    if (!figure) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Sin animación continua: alterna las dos posturas cada segundo y medio.
      const timer = setInterval(() => !control.current.paused && setT((v) => (v < 0.5 ? 1 : 0)), 1500)
      return () => clearInterval(timer)
    }
    let frame = 0
    let last = performance.now()
    let phase = 0
    const period = figure.period ?? 2600
    const tick = (now: number) => {
      const { paused, slow } = control.current
      if (!paused) phase = (phase + (now - last) / (period * (slow ? 2.5 : 1))) % 1
      last = now
      // Ida y vuelta con una breve pausa en cada extremo.
      const raw = phase < 0.5 ? phase * 2 : 2 - phase * 2
      setT(ease(Math.min(1, Math.max(0, (raw - 0.08) / 0.84))))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [figure])
  if (!figure) return null
  return (
    <div className="move-figure">
      <button className="move-figure-stage" onClick={() => setPaused((p) => !p)}
        aria-label={paused ? tr('Reanudar la animación', 'Resume the animation') : tr('Pausar la animación', 'Pause the animation')} aria-pressed={paused}>
        <svg viewBox={fitViewBox(figure)} role="img" aria-label={`Movimiento: ${exercise.name}`}>
          <FigureDefs id={ids} />
          <Scene figure={figure} pose={poseAt(figure, t)} ids={ids} muscles={exercise} />
        </svg>
        {paused && <span className="move-figure-paused"><Play size={22} fill="currentColor" /></span>}
      </button>
      <button className={`move-figure-speed ${slow ? 'active' : ''}`} onClick={() => setSlow((v) => !v)} aria-pressed={slow}
        aria-label={slow ? tr('Velocidad normal', 'Normal speed') : tr('Cámara lenta', 'Slow motion')}>
        <Snail size={16} /> {slow ? tr('Lento', 'Slow') : '1×'}
      </button>
    </div>
  )
}

/** Galería de todas las figuras (solo en desarrollo, para revisarlas de un vistazo). */
export function FigureGallery() {
  const catalog = useCatalog()
  const muscles = (id: string) => catalog.get(id)
  const ids = useId().replace(/:/g, '')
  const seen = new Set<Figure>()
  const unique = Object.entries(FIGURES).filter(([, f]) => (seen.has(f) ? false : (seen.add(f), true)))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, padding: 8 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}><FigureDefs id={ids} /></svg>
      {unique.map(([key, figure]) => (
        <div key={key} className="move-figure" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 4 }}>
          {figure.frames.map((pose, i) => (
            <svg key={i} viewBox={fitViewBox(figure)}><Scene figure={figure} pose={pose} ids={ids} muscles={muscles(key)} /></svg>
          ))}
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--mm-text)', padding: '0 6px' }}>{key}</div>
        </div>
      ))}
    </div>
  )
}
