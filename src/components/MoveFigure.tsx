import { Play, Snail } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useCatalog } from './ui'
import { FIGURES, FLOOR, type Figure, type Part, type Pose, type Prop } from '../lib/figures'
import { barFrontEnds, fitViewBox, place, poseAt, propAnchor, shadowX, step, thumbViewBox, trapBarCenter, type Joints, type Pt } from '../lib/figureEngine'
import { armPath, headPaths, legPath, neckPath, spots, torsoEnds, torsoPath, type Segment } from '../lib/figureShapes'
import { t as tr } from '../lib/i18n'

// Figura de movimiento propia (dibujo original generado con código): un maniquí de perfil o de
// frente que pasa de la posición inicial a la final. Cada postura son ángulos de articulación y la
// figura se calcula con cinemática directa, así que la animación interpola ángulos, no imágenes.

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
    case 'strap': {
      // Cintas y empuñaduras propias: el anclaje queda fijo y el extremo sigue a la articulación.
      const [ax, ay] = prop.point!
      return <g><line x1={ax} y1={ay} x2={x} y2={y} stroke="var(--fig-dark-2)" strokeWidth={4} />
        <circle cx={ax} cy={ay} r={5} fill={metal} />
        <rect x={x - 7} y={y - 3} width={14} height={6} rx={2} fill={metal} /></g>
    }
    case 'landmine': case 'lever': {
      const [ax, ay] = prop.point!
      return <g><line x1={ax} y1={ay} x2={x} y2={y} stroke="var(--fig-dark-2)" strokeWidth={7} strokeLinecap="round" />
        <circle cx={ax} cy={ay} r={7} fill={dark} />
        {prop.type === 'landmine' && <circle cx={x * 0.87 + ax * 0.13} cy={y * 0.87 + ay * 0.13} r={13} fill={dark} />}
      </g>
    }
    case 'smith': {
      const [a, b] = prop.span!
      return <g><line x1={a} y1={prop.y} x2={a} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <line x1={b} y1={prop.y} x2={b} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <line x1={Math.min(a - 10, x - 10)} y1={y} x2={Math.max(b + 10, x + 10)} y2={y} stroke="var(--fig-dark-2)" strokeWidth={6} />
        <rect x={a - 5} y={y - 16} width={10} height={32} rx={3} fill={metal} />
        <rect x={b - 5} y={y - 16} width={10} height={32} rx={3} fill={metal} /></g>
    }
    case 'trapBar': {
      // Hexágono en perspectiva alrededor de las piernas, con asas y discos laterales.
      const cx = trapBarCenter(j)
      return <g><polygon points={`${cx - 44},${y} ${cx - 25},${y - 13} ${cx + 25},${y - 13} ${cx + 44},${y} ${cx + 25},${y + 13} ${cx - 25},${y + 13}`} fill="none" stroke="var(--fig-dark-2)" strokeWidth={5} />
        <path d={`M${cx - 25},${y - 7}v14 M${cx + 25},${y - 7}v14`} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <rect x={cx - 53} y={y - 16} width={10} height={32} rx={3} fill={dark} />
        <rect x={cx + 43} y={y - 16} width={10} height={32} rx={3} fill={dark} /></g>
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

// Si no se conocen los músculos del ejercicio, se usan los generales de la figura.
const PART_MUSCLES: Record<Part, string[]> = {
  legs: ['quads', 'hamstrings'], calves: ['calves'], glutes: ['glutes'], back: ['lats', 'upper-back'], chest: ['pectorals'], core: ['abs'],
  shoulders: ['delts'], arms: ['biceps', 'triceps'], forearms: ['forearms'],
}

export interface Muscles { muscle: string; secondaryMuscles: string[] }

function musclesFor(figure: Figure, muscles?: Muscles) {
  const primary = new Set<string>(muscles?.muscle ? [muscles.muscle] : figure.work.flatMap((part) => PART_MUSCLES[part]))
  const secondary = new Set((muscles?.secondaryMuscles ?? []).filter((m) => !primary.has(m)))
  return { primary, secondary }
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

export function Scene({ figure, pose, ids, muscles, glow: glowing = true }: { figure: Figure; pose: Pose; ids: string; muscles?: Muscles; glow?: boolean }) {
  const j = place(figure, pose)
  const { primary, secondary } = musclesFor(figure, muscles)
  const isFront = figure.view === 'front'
  const { pelvis, neck } = torsoEnds(j, isFront)
  const head = headPaths(j.head, neck, isFront)
  const neckTop = lerp(neck, j.head, 0.62)
  const sx = shadowX(figure, j)

  // Solo se dibujan los músculos que trabajan: el resto del cuerpo queda limpio.
  // De frente, los dos lados están igual de cerca: solo de perfil se atenúa el lado lejano.
  const paint = (segment: Segment | 'pelvis', a: Pt, b: Pt, far = false) =>
    spots(segment, a, b, isFront, far).map(({ muscle, d }, i) => {
      const level = primary.has(muscle) ? 'p' : secondary.has(muscle) ? 's' : null
      if (!level) return null
      const dim = far && !isFront
      return <path key={`${segment}${i}`} d={d} fill={`url(#${ids}${level}${dim ? 'f' : ''})`} filter={glowing && !dim && level === 'p' ? `url(#${ids}g)` : undefined} />
    })
  const part = (d: string, far: boolean) => {
    const dim = far && !isFront
    return <path d={d} className={dim ? 'fig-part fig-part-far' : 'fig-part'} fill={`url(#${ids}${dim ? 'bf' : 'b'})`} />
  }

  const leg = (far: boolean) => (
    <g>
      {part(legPath(j, isFront, far), far)}
      {paint('thigh', far ? j.hip2 : j.hip, far ? j.knee2 : j.knee, far)}
      {paint('shin', far ? j.knee2 : j.knee, far ? j.ankle2 : j.ankle, far)}
    </g>
  )
  const arm = (far: boolean) => (
    <g>
      {part(armPath(j, isFront, far), far)}
      {paint('fore', far ? j.elbow2 : j.elbow, far ? j.wrist2 : j.wrist, far)}
      {paint('upper', far ? j.shoulder2 : j.shoulder, far ? j.elbow2 : j.elbow, far)}
    </g>
  )
  // De frente, las extremidades quedan por delante del tronco; de perfil, el lado lejano por detrás.
  const trunk = (
    <g>
      {part(neckPath(neck, neckTop), false)}
      {part(torsoPath(pelvis, neck, isFront), false)}
      {paint('torso', pelvis, neck)}
      {(primary.has('neck') || secondary.has('neck')) && <path d={neckPath(neck, neckTop)} fill={`url(#${ids}${primary.has('neck') ? 'p' : 's'})`} />}
      <path d={head.head} className="fig-part" fill={`url(#${ids}b)`} />
      <path d={head.hair} className="fig-hair" />
    </g>
  )

  return (
    <g>
      <ellipse cx={sx} cy={FLOOR + 3} rx={figure.shadow ?? 62} ry={5} className="fig-shadow" />
      {figure.props.filter((p) => !p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} ids={ids} />)}
      {isFront ? (
        <>
          {trunk}
          {leg(true)}
          {leg(false)}
          {paint('pelvis', pelvis, neck)}
          {arm(true)}
          {arm(false)}
        </>
      ) : (
        <>
          {leg(true)}
          {arm(true)}
          {trunk}
          {leg(false)}
          {paint('pelvis', pelvis, neck)}
          {arm(false)}
        </>
      )}
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
      {grad('b', [['0', 'fig-stop-b1'], ['1', 'fig-stop-b2']])}
      {grad('bf', [['0', 'fig-stop-bf1'], ['1', 'fig-stop-bf2']])}
      {grad('p', [['0', 'fig-stop-p1'], ['0.55', 'fig-stop-p2'], ['1', 'fig-stop-p3']])}
      {grad('pf', [['0', 'fig-stop-p1', 0.75], ['1', 'fig-stop-p3', 0.75]])}
      {grad('s', [['0', 'fig-stop-s1', 0.85], ['1', 'fig-stop-s2', 0.7]])}
      {grad('sf', [['0', 'fig-stop-s1', 0.55], ['1', 'fig-stop-s2', 0.45]])}
      {grad('metal', [['0', 'fig-stop-metal1'], ['1', 'fig-stop-metal2']])}
      {grad('dark', [['0', 'fig-stop-dark1'], ['1', 'fig-stop-dark2']])}
      <filter id={`${id}g`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.6" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

/**
 * Miniatura del ejercicio (listas, rutinas, entreno): la postura a mitad del movimiento, quieta y sin
 * brillo, para distinguir de un vistazo ejercicios que trabajan el mismo músculo.
 */
export function FigureThumb({ exercise, size }: { exercise: Muscles & { id: string }; size: number }) {
  const figure = FIGURES[exercise.id]
  const ids = useId().replace(/:/g, '')
  const pose = poseAt(figure, 0.5)
  return (
    <svg className="thumb muscle-thumb fig-thumb" width={size} height={size} viewBox={thumbViewBox(place(figure, pose))} aria-hidden="true">
      <FigureDefs id={ids} />
      <Scene figure={figure} pose={pose} ids={ids} muscles={exercise} glow={false} />
    </svg>
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
