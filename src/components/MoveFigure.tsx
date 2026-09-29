import { useEffect, useId, useState } from 'react'
import { FIGURES, FLOOR, type Figure, type JointName, type Part, type Pose, type Prop } from '../lib/figures'

// Figura de movimiento propia (dibujo original generado con código): un maniquí de perfil o de
// frente que pasa de la posición inicial a la final. Cada postura son ángulos de articulación y la
// figura se calcula con cinemática directa, así que la animación interpola ángulos, no imágenes.

const L = { torso: 64, neck: 9, thigh: 53, shin: 49, foot: 18, upper: 34, fore: 31 }
// Grosor de cada segmento al principio y al final (aspecto afilado).
const W = { torso: [20, 28], thigh: [19, 14], shin: [14, 9], upper: [13, 10], fore: [10, 7] } as const

type Pt = [number, number]
type Joints = Record<JointName | 'shoulder2' | 'hip2', Pt>

/** Punto a partir de otro, un ángulo (0 arriba, 90 delante, 180 abajo, -90 detrás) y una longitud. */
function step([x, y]: Pt, angle: number, length: number): Pt {
  const a = (angle * Math.PI) / 180
  return [x + length * Math.sin(a), y - length * Math.cos(a)]
}

function side(pose: Pose, hip: Pt): Joints {
  const shoulder = step(hip, pose.torso, L.torso)
  const shoulder2 = step(shoulder, pose.torso - 90, 3)
  const knee = step(hip, pose.thigh, L.thigh)
  const ankle = step(knee, pose.shin, L.shin)
  const knee2 = step(hip, pose.thigh2 ?? pose.thigh, L.thigh)
  const ankle2 = step(knee2, pose.shin2 ?? pose.shin, L.shin)
  const elbow = step(shoulder, pose.upper, L.upper)
  const elbow2 = step(shoulder2, pose.upper2 ?? pose.upper, L.upper)
  return {
    hip, hip2: hip, shoulder, shoulder2, head: step(shoulder, pose.head ?? pose.torso, L.neck + 12),
    knee, ankle, toe: step(ankle, pose.foot ?? 90, L.foot),
    knee2, ankle2, toe2: step(ankle2, pose.foot2 ?? pose.foot ?? 90, L.foot),
    elbow, wrist: step(elbow, pose.fore, L.fore),
    elbow2, wrist2: step(elbow2, pose.fore2 ?? pose.fore, L.fore),
  }
}

/** De frente: el lado «cercano» es el derecho de la imagen y el otro se refleja. */
function front(pose: Pose, pelvis: Pt): Joints {
  const mid = step(pelvis, pose.torso, L.torso)
  const hip: Pt = [pelvis[0] + 10, pelvis[1]]
  const hip2: Pt = [pelvis[0] - 10, pelvis[1]]
  const shoulder: Pt = [mid[0] + 19, mid[1] + 4]
  const shoulder2: Pt = [mid[0] - 19, mid[1] + 4]
  const knee = step(hip, pose.thigh, L.thigh)
  const ankle = step(knee, pose.shin, L.shin)
  const knee2 = step(hip2, -(pose.thigh2 ?? pose.thigh), L.thigh)
  const ankle2 = step(knee2, -(pose.shin2 ?? pose.shin), L.shin)
  const elbow = step(shoulder, pose.upper, L.upper)
  const elbow2 = step(shoulder2, -(pose.upper2 ?? pose.upper), L.upper)
  return {
    hip, hip2, shoulder, shoulder2, head: step(mid, pose.head ?? pose.torso, L.neck + 12),
    knee, ankle, toe: step(ankle, 150, 12), knee2, ankle2, toe2: step(ankle2, -150, 12),
    elbow, wrist: step(elbow, pose.fore, L.fore), elbow2, wrist2: step(elbow2, -(pose.fore2 ?? pose.fore), L.fore),
  }
}

function place(figure: Figure, pose: Pose): Joints {
  const build = figure.view === 'front' ? front : side
  const probe = build(pose, [0, 0])
  let origin: Pt
  if (figure.anchor) {
    const p = probe[figure.anchor.joint]
    origin = [figure.anchor.at[0] - p[0], figure.anchor.at[1] - p[1]]
  } else {
    // Los pies (y las manos si apoyan) quedan en el suelo; el tobillo cercano no se mueve en horizontal.
    const points = [probe.ankle, probe.ankle2, probe.toe, probe.toe2, ...(figure.hands ? [probe.wrist, probe.wrist2] : [])]
    const lowest = Math.max(...points.map((p) => p[1] + (p === probe.ankle || p === probe.ankle2 ? 5 : 3)))
    origin = [(figure.x ?? 130) - (figure.view === 'front' ? 0 : probe.ankle[0]), FLOOR - lowest]
  }
  return build(pose, [origin[0] + (pose.shift ?? 0), origin[1] - (pose.lift ?? 0)])
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

function blend(a: Pose, b: Pose, t: number): Pose {
  const out: Partial<Record<keyof Pose, number>> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>) {
    const zero = key === 'lift' || key === 'shift' ? 0 : undefined
    const from = a[key] ?? zero
    const to = b[key] ?? zero ?? from
    if (from !== undefined && to !== undefined) out[key] = mix(from, to, t)
  }
  return out as Pose
}

/** Segmento afilado con extremos redondeados. */
function Limb({ a, b, wa, wb, className, glow }: { a: Pt; b: Pt; wa: number; wb: number; className: string; glow?: string }) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const p = (pt: Pt, w: number, s: number) => `${(pt[0] + (nx * w * s) / 2).toFixed(1)},${(pt[1] + (ny * w * s) / 2).toFixed(1)}`
  return (
    <g className={className} filter={className === 'fig-work' && glow ? `url(#${glow})` : undefined}>
      <polygon points={`${p(a, wa, 1)} ${p(b, wb, 1)} ${p(b, wb, -1)} ${p(a, wa, -1)}`} />
      <circle cx={a[0]} cy={a[1]} r={wa / 2} />
      <circle cx={b[0]} cy={b[1]} r={wb / 2} />
    </g>
  )
}

function PropShape({ prop, j, pose }: { prop: Prop; j: Joints; pose: Pose }) {
  const origin: Pt = prop.at ? j[prop.at] : prop.point ?? [0, 0]
  const angle = (prop.angle ?? 0) + (prop.rel === 'torso' ? pose.torso : 0)
  const [x, y] = prop.offset ? step(origin, angle, prop.offset) : origin
  switch (prop.type) {
    case 'plate':
      return (
        <g>
          <circle cx={x} cy={y} r={prop.size ?? 32} className="fig-gear" />
          <circle cx={x} cy={y} r={(prop.size ?? 32) * 0.55} className="fig-gear-ring" />
          <circle cx={x} cy={y} r={4.5} className="fig-gear-dark" />
        </g>
      )
    case 'dumbbell':
      return (
        <g className="fig-gear-dark">
          <rect x={x - 13} y={y - 2.5} width={26} height={5} rx={2.5} />
          <rect x={x - 17} y={y - 9} width={8} height={18} rx={3} />
          <rect x={x + 9} y={y - 9} width={8} height={18} rx={3} />
        </g>
      )
    case 'kettlebell':
      // Colgando de la mano o, en los press, apoyada por encima de ella.
      return prop.up ? (
        <g className="fig-gear-dark">
          <circle cx={x} cy={y - 11} r={10} />
          <path d={`M${x - 6},${y - 4} Q${x - 7},${y + 5} ${x},${y + 5} Q${x + 7},${y + 5} ${x + 6},${y - 4}`} className="fig-gear-stroke" />
        </g>
      ) : (
        <g className="fig-gear-dark">
          <circle cx={x} cy={y + 13} r={10} />
          <path d={`M${x - 6},${y + 6} Q${x - 7},${y - 3} ${x},${y - 3} Q${x + 7},${y - 3} ${x + 6},${y + 6}`} className="fig-gear-stroke" />
        </g>
      )
    case 'bench': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      return (
        <g>
          <rect x={x0 + 12} y={top + 6} width={6} height={FLOOR - top - 6} className="fig-gear-dark" />
          <rect x={x1 - 18} y={top + 6} width={6} height={FLOOR - top - 6} className="fig-gear-dark" />
          <rect x={x0} y={top} width={x1 - x0} height={11} rx={5} className="fig-gear" transform={prop.tilt ? `rotate(${prop.tilt} ${x1} ${top})` : undefined} />
        </g>
      )
    }
    case 'box': {
      const [x0, x1] = prop.span!
      return <rect x={x0} y={prop.y} width={x1 - x0} height={FLOOR - prop.y!} rx={5} className="fig-gear" />
    }
    case 'bar': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      return (
        <g>
          <rect x={x1 - 6} y={top} width={6} height={FLOOR - top} className="fig-gear" />
          <rect x={x0} y={top - 3} width={x1 - x0} height={6} rx={3} className="fig-gear-dark" />
        </g>
      )
    }
    case 'cable':
      return (
        <g>
          <line x1={prop.point![0]} y1={prop.point![1]} x2={x} y2={y} className="fig-cable" />
          <circle cx={prop.point![0]} cy={prop.point![1]} r={6} className="fig-gear-dark" />
        </g>
      )
    case 'band': {
      const [ax, ay] = prop.to ? j[prop.to] : prop.point!
      return <line x1={ax} y1={ay} x2={x} y2={y} className="fig-band" />
    }
    case 'pad':
      return prop.size === 0 ? null : <circle cx={x} cy={y} r={prop.size ?? 8} className="fig-gear-dark" />
    case 'platform': {
      const [ex, ey] = step([x, y], angle, 10)
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
          <rect x={(x0 + x1) / 2 - 3} y={top + 6} width={6} height={FLOOR - top - 6} className="fig-gear-dark" />
          {back && <rect x={back[0]} y={back[1]} width={10} height={back[2]} rx={4} className="fig-gear" transform={back[3] ? `rotate(${back[3]} ${back[0] + 5} ${back[1] + back[2]})` : undefined} />}
          <rect x={x0} y={top} width={x1 - x0} height={10} rx={4} className="fig-gear" />
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
    case 'grip':
      return <rect x={x - 18} y={y - 3} width={36} height={6} rx={3} className="fig-gear-dark" />
  }
}

export function Scene({ figure, pose, glow }: { figure: Figure; pose: Pose; glow: string }) {
  const j = place(figure, pose)
  const work = new Set<Part>(figure.work)
  const cls = (part: Part, far = false) => (work.has(part) ? 'fig-work' : far ? 'fig-far' : 'fig-near')
  const torso: Part = work.has('back') ? 'back' : work.has('chest') ? 'chest' : 'core'
  const isFront = figure.view === 'front'
  const pelvis: Pt = isFront ? [(j.hip[0] + j.hip2[0]) / 2, j.hip[1]] : j.hip
  const neck: Pt = isFront ? [(j.shoulder[0] + j.shoulder2[0]) / 2, j.shoulder[1] - 4] : j.shoulder
  const shadowX = figure.anchor ? (figure.view === 'front' ? pelvis[0] : 130) : pelvis[0]
  return (
    <g>
      <ellipse cx={shadowX} cy={FLOOR + 3} rx={figure.shadow ?? 62} ry={5} className="fig-shadow" />
      {figure.props.filter((p) => !p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} />)}
      <Limb a={j.hip2} b={j.knee2} wa={W.thigh[0] - 2} wb={W.thigh[1] - 2} className={cls('legs', true)} glow={glow} />
      <Limb a={j.knee2} b={j.ankle2} wa={W.shin[0] - 2} wb={W.shin[1] - 2} className={cls('calves', true)} glow={glow} />
      <Limb a={j.ankle2} b={j.toe2} wa={9} wb={6} className="fig-far" />
      <Limb a={j.shoulder2} b={j.elbow2} wa={W.upper[0] - 2} wb={W.upper[1] - 2} className={cls(work.has('shoulders') && !work.has('arms') ? 'shoulders' : 'arms', true)} glow={glow} />
      <Limb a={j.elbow2} b={j.wrist2} wa={W.fore[0] - 2} wb={W.fore[1] - 2} className={cls('forearms', true)} glow={glow} />
      <Limb a={pelvis} b={neck} wa={isFront ? 30 : W.torso[0]} wb={isFront ? 44 : W.torso[1]} className={cls(torso)} glow={glow} />
      {work.has('glutes') && <circle cx={j.hip[0]} cy={j.hip[1]} r={12} className="fig-work" filter={`url(#${glow})`} />}
      <circle cx={j.head[0]} cy={j.head[1]} r={11} className="fig-head" />
      {work.has('shoulders') && <circle cx={j.shoulder[0]} cy={j.shoulder[1]} r={9.5} className="fig-work" filter={`url(#${glow})`} />}
      <Limb a={j.hip} b={j.knee} wa={W.thigh[0]} wb={W.thigh[1]} className={cls('legs')} glow={glow} />
      <Limb a={j.knee} b={j.ankle} wa={W.shin[0]} wb={W.shin[1]} className={cls('calves')} glow={glow} />
      <Limb a={j.ankle} b={j.toe} wa={10} wb={7} className="fig-near" />
      <Limb a={j.shoulder} b={j.elbow} wa={W.upper[0]} wb={W.upper[1]} className={cls(work.has('shoulders') && !work.has('arms') ? 'shoulders' : 'arms')} glow={glow} />
      <Limb a={j.elbow} b={j.wrist} wa={W.fore[0]} wb={W.fore[1]} className={cls('forearms')} glow={glow} />
      {figure.props.filter((p) => p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} />)}
    </g>
  )
}

export function GlowDefs({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.6" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2

/** En los saltos, la figura describe un arco entre las dos posturas. */
function withArc(figure: Figure, pose: Pose, t: number): Pose {
  return figure.arc ? { ...pose, lift: (pose.lift ?? 0) + figure.arc * Math.sin(Math.PI * t) } : pose
}

export function hasFigure(exerciseId: string) {
  return exerciseId in FIGURES
}

/** Figura animada del ejercicio (si hay una para él). */
export function MoveFigure({ exerciseId, label }: { exerciseId: string; label: string }) {
  const figure = FIGURES[exerciseId]
  const glow = useId().replace(/:/g, '') + 'g'
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!figure) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Sin animación continua: alterna las dos posturas cada segundo y medio.
      const timer = setInterval(() => setT((v) => (v < 0.5 ? 1 : 0)), 1500)
      return () => clearInterval(timer)
    }
    let frame = 0
    const start = performance.now()
    const period = figure.period ?? 2600
    const tick = (now: number) => {
      const phase = ((now - start) % period) / period
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
      <svg viewBox="0 -40 260 280" role="img" aria-label={`Movimiento: ${label}`}>
        <GlowDefs id={glow} />
        <Scene figure={figure} pose={withArc(figure, blend(figure.frames[0], figure.frames[1], t), t)} glow={glow} />
      </svg>
    </div>
  )
}

/** Galería de todas las figuras (solo en desarrollo, para revisarlas de un vistazo). */
export function FigureGallery() {
  const glow = useId().replace(/:/g, '') + 'g'
  const seen = new Set<Figure>()
  const unique = Object.entries(FIGURES).filter(([, f]) => (seen.has(f) ? false : (seen.add(f), true)))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, padding: 8 }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}><GlowDefs id={glow} /></svg>
      {unique.map(([key, figure]) => (
        <div key={key} className="move-figure" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 4 }}>
          {figure.frames.map((pose, i) => (
            <svg key={i} viewBox="0 -40 260 280"><Scene figure={figure} pose={pose} glow={glow} /></svg>
          ))}
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--mm-text)', padding: '0 6px' }}>{key}</div>
        </div>
      ))}
    </div>
  )
}
