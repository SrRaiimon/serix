import { Play, Snail } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useCatalog } from './ui'
import { FIGURES, FLOOR, type Figure, type Part, type Pose, type Prop } from '../lib/figures'
import { barFrontEnds, cableTower, crankCenter, fitViewBox, machineTower, place, poseAt, propAnchor, rigidPivot, shadowX, step, thumbViewBox, trapBarCenter, type Joints, type Pt } from '../lib/figureEngine'
import { armPath, headPaths, legPath, neckPath, seenFromBehind, spots, torsoEnds, torsoPath, type Segment } from '../lib/figureShapes'
import { t as tr } from '../lib/i18n'

// Figura de movimiento propia (dibujo original generado con código): un maniquí de perfil o de
// frente que pasa de la posición inicial a la final. Cada postura son ángulos de articulación y la
// figura se calcula con cinemática directa, así que la animación interpola ángulos, no imágenes.

/** Pila de placas de una máquina: la torre con su peso, para que el cable o la palanca salgan de algo. */
function Stack({ x, top, metal, dark }: { x: number; top: number; metal: string; dark: string }) {
  return (
    <g>
      <rect x={x - 3} y={top} width={6} height={FLOOR - top} fill={dark} />
      <rect x={x - 14} y={FLOOR - 7} width={28} height={7} rx={2} fill={dark} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={x - 11} y={FLOOR - 19 - i * 8} width={22} height={6.5} rx={1.5} fill={metal} />)}
    </g>
  )
}

function MachineTower({ figure, ids }: { figure: Figure; ids: string }) {
  const { x, top } = machineTower(place(figure, figure.frames[0]))
  return <Stack x={x} top={top} metal={`url(#${ids}metal)`} dark={`url(#${ids}dark)`} />
}

function PropShape({ prop, j, pose, ids, figure }: { prop: Prop; j: Joints; pose: Pose; ids: string; figure: Figure }) {
  const metal = `url(#${ids}metal)`
  const dark = `url(#${ids}dark)`
  const { x, y, angle } = propAnchor(prop, j, pose)
  switch (prop.type) {
    case 'plate':
      return (
        <g>
          <circle cx={x} cy={y} r={prop.size ?? 27} fill={metal} />
          <circle cx={x} cy={y} r={(prop.size ?? 27) * 0.55} className="fig-gear-ring" />
          <circle cx={x} cy={y} r={4.5} fill={dark} />
        </g>
      )
    case 'dumbbell': {
      if (prop.end) return <g><circle cx={x} cy={y} r={9.5} fill={dark} /><circle cx={x} cy={y} r={3.5} fill={metal} /></g>
      // De perfil, el eje de la mancuerna va en perpendicular al antebrazo, como en la mano.
      const elbow = prop.at === 'wrist' ? j.elbow : prop.at === 'wrist2' ? j.elbow2 : undefined
      const turn = elbow && figure.view === 'side' ? (Math.atan2(y - elbow[1], x - elbow[0]) * 180) / Math.PI + 90 : 0
      return (
        <g fill={dark} transform={turn ? `rotate(${turn.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` : undefined}>
          <rect x={x - 13} y={y - 2.5} width={26} height={5} rx={2.5} />
          <rect x={x - 17} y={y - 9} width={8} height={18} rx={3} />
          <rect x={x + 9} y={y - 9} width={8} height={18} rx={3} />
        </g>
      )
    }
    case 'kettlebell':
      // Colgando de la mano o, en los press, apoyada por encima de ella.
      if (prop.up) {
        // En los press la bola descansa sobre la cara externa del antebrazo, no encima de la mano.
        const elbow = prop.at === 'wrist2' ? j.elbow2 : j.elbow
        const len = Math.hypot(x - elbow[0], y - elbow[1]) || 1
        const [ux, uy] = [(x - elbow[0]) / len, (y - elbow[1]) / len]
        const side = figure.view === 'side' ? 1 : prop.at === 'wrist2' ? -1 : 1
        return (
          <g fill={dark}>
            <circle cx={x - ux * 3 + uy * 11 * side} cy={y - uy * 3 - ux * 11 * side} r={10} />
            <circle cx={x} cy={y} r={3.5} fill={metal} />
          </g>
        )
      }
      return (
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
    case 'benchTop': {
      const [x0, x1] = prop.span!
      return <rect x={x0} y={prop.y! - 15} width={x1 - x0} height={30} rx={8} fill={metal} />
    }
    case 'tire': {
      const [ax, ay] = rigidPivot(figure, prop)
      return <line x1={ax} y1={ay} x2={x} y2={y} className="fig-tire" />
    }
    case 'landmine': case 'lever': {
      const [ax, ay] = rigidPivot(figure, prop)
      return <g><line x1={ax} y1={ay} x2={x} y2={y} stroke="var(--fig-dark-2)" strokeWidth={7} strokeLinecap="round" />
        <circle cx={ax} cy={ay} r={7} fill={dark} />
        {prop.type === 'landmine' && <circle cx={x * 0.87 + ax * 0.13} cy={y * 0.87 + ay * 0.13} r={13} fill={dark} />}
      </g>
    }
    case 'smith': {
      // De perfil, la barra se ve de punta en su guía: dibujada a lo largo, atravesaba el cuerpo.
      if (figure.view === 'side') {
        return (
          <g>
            <line x1={x} y1={prop.y} x2={x} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
            <rect x={x - 7} y={y - 7} width={14} height={14} rx={2} fill={dark} />
            <circle cx={x} cy={y} r={13} fill={metal} />
            <circle cx={x} cy={y} r={4} fill={dark} />
          </g>
        )
      }
      const [a, b] = prop.span!
      return <g><line x1={a} y1={prop.y} x2={a} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <line x1={b} y1={prop.y} x2={b} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <line x1={Math.min(a - 10, x - 10)} y1={y} x2={Math.max(b + 10, x + 10)} y2={y} stroke="var(--fig-dark-2)" strokeWidth={6} />
        <rect x={a - 5} y={y - 16} width={10} height={32} rx={3} fill={metal} />
        <rect x={b - 5} y={y - 16} width={10} height={32} rx={3} fill={metal} /></g>
    }
    case 'trapBar': {
      // De perfil, un disco a la altura de la mano: el hexágono solo se entiende visto de frente.
      if (figure.view === 'side') return <g><circle cx={x} cy={y} r={24} fill={metal} /><circle cx={x} cy={y} r={13} className="fig-gear-ring" /><circle cx={x} cy={y} r={4.5} fill={dark} /></g>
      // Hexágono en perspectiva alrededor de las piernas, con asas y discos laterales.
      const cx = trapBarCenter(j)
      return <g><polygon points={`${cx - 44},${y} ${cx - 25},${y - 13} ${cx + 25},${y - 13} ${cx + 44},${y} ${cx + 25},${y + 13} ${cx - 25},${y + 13}`} fill="none" stroke="var(--fig-dark-2)" strokeWidth={5} />
        <path d={`M${cx - 25},${y - 7}v14 M${cx + 25},${y - 7}v14`} stroke="var(--fig-dark-2)" strokeWidth={5} />
        <rect x={cx - 53} y={y - 16} width={10} height={32} rx={3} fill={dark} />
        <rect x={cx + 43} y={y - 16} width={10} height={32} rx={3} fill={dark} /></g>
    }
    case 'cable': {
      const [px, py] = prop.point!
      const tower = cableTower(prop, j)
      return (
        <g>
          {!prop.bare && <Stack x={tower.x} top={tower.top} metal={metal} dark={dark} />}
          {!prop.bare && <line x1={px} y1={py} x2={tower.x} y2={py} stroke="var(--fig-dark-2)" strokeWidth={4} />}
          <line x1={px} y1={py} x2={x} y2={y} className="fig-cable" />
          <circle cx={px} cy={py} r={6} fill={dark} />
          {prop.attach === 'rope' ? (
            <path d={`M${x - 7},${y + 7} L${x},${y} L${x + 7},${y + 7}`} fill="none" stroke="var(--fig-dark-1)" strokeWidth={3.4} strokeLinecap="round" />
          ) : prop.attach === 'vbar' ? (
            <path d={`M${x - 8},${y + 5} L${x},${y - 5} L${x + 8},${y + 5} Z`} fill="none" stroke="var(--fig-dark-2)" strokeWidth={3} />
          ) : (
            <rect x={x - 6} y={y - 2.5} width={12} height={5} rx={2} fill={dark} />
          )}
        </g>
      )
    }
    case 'band': {
      const [ax, ay] = prop.to ? j[prop.to] : prop.point!
      return (
        <g>
          {/* El anclaje de la banda: un poste si está en alto, para que no acabe en el aire. */}
          {!prop.to && ay < FLOOR - 14 && <line x1={ax} y1={ay} x2={ax} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={4} />}
          {!prop.to && <circle cx={ax} cy={ay} r={4.5} fill={dark} />}
          <line x1={ax} y1={ay} x2={x} y2={y} className="fig-band" />
        </g>
      )
    }
    case 'bike': {
      // Bicicleta estática: los pies dan la vuelta a la biela y el manillar queda donde indica la figura.
      const [cx, cy] = crankCenter(j)
      const [hx, hy] = prop.point!
      const wheel: Pt = [cx + 62, FLOOR - 34]
      const seat: Pt = [j.hip[0] - 2, j.hip[1] + 15]
      return (
        <g>
          <line x1={cx - 44} y1={FLOOR - 2} x2={wheel[0] + 34} y2={FLOOR - 2} stroke="var(--fig-dark-2)" strokeWidth={5} strokeLinecap="round" />
          <line x1={seat[0]} y1={seat[1]} x2={cx - 8} y2={FLOOR - 2} stroke="var(--fig-dark-2)" strokeWidth={6} />
          <line x1={seat[0] + 2} y1={seat[1] + 18} x2={wheel[0]} y2={wheel[1]} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <line x1={wheel[0]} y1={wheel[1]} x2={hx} y2={hy} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <circle cx={wheel[0]} cy={wheel[1]} r={prop.fan ? 33 : 26} fill={metal} />
          <circle cx={wheel[0]} cy={wheel[1]} r={(prop.fan ? 33 : 26) * 0.62} className="fig-gear-ring" />
          {prop.fan && [0, 45, 90, 135].map((a) => <line key={a} x1={wheel[0] - 30 * Math.cos((a * Math.PI) / 180)} y1={wheel[1] - 30 * Math.sin((a * Math.PI) / 180)} x2={wheel[0] + 30 * Math.cos((a * Math.PI) / 180)} y2={wheel[1] + 30 * Math.sin((a * Math.PI) / 180)} stroke="var(--fig-dark-1)" strokeWidth={2} />)}
          <rect x={seat[0] - 16} y={seat[1] - 5} width={32} height={8} rx={4} fill={dark} />
          <rect x={hx - 4} y={hy - 8} width={20} height={6} rx={3} fill={dark} />
          <line x1={cx} y1={cy} x2={j.ankle2[0] + 7} y2={j.ankle2[1] + 3} stroke="var(--fig-dark-1)" strokeWidth={4} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={8} fill={dark} />
        </g>
      )
    }
    case 'rower': {
      // Remo de ergómetro: riel, volante con su pantalla y cadena hasta la mano. El asiento va con la cadera.
      const [wx, wy] = prop.point!
      const [x0, x1] = prop.span!
      return (
        <g>
          <line x1={x0} y1={FLOOR - 8} x2={x1} y2={FLOOR - 8} stroke="var(--fig-dark-2)" strokeWidth={6} strokeLinecap="round" />
          <line x1={x0 + 6} y1={FLOOR - 8} x2={x0 + 6} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <line x1={x1 - 6} y1={FLOOR - 8} x2={x1 - 6} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <circle cx={wx} cy={wy} r={22} fill={metal} />
          <circle cx={wx} cy={wy} r={13} className="fig-gear-ring" />
          <line x1={wx} y1={wy} x2={wx + 6} y2={wy - 40} stroke="var(--fig-dark-2)" strokeWidth={4} />
          <rect x={wx - 6} y={wy - 52} width={20} height={13} rx={2} fill={dark} />
          <rect x={j.hip[0] - 15} y={j.hip[1] + 9} width={30} height={7} rx={3} fill={dark} />
          <line x1={wx} y1={wy} x2={x} y2={y} className="fig-cable" />
          <rect x={x - 2.5} y={y - 9} width={5} height={18} rx={2} fill={dark} />
        </g>
      )
    }
    case 'stairs': {
      // Peldaños que suben hacia delante: `span` da dónde empieza y acaba cada uno y `size`, lo que sube.
      const [x0, x1] = prop.span!
      const width = (x1 - x0) / 3
      const rise = prop.size ?? 27
      return <g>{[0, 1, 2].map((i) => <rect key={i} x={x0 + width * i} y={FLOOR - rise * i - 2} width={x1 - x0 - width * i} height={rise * i + 2} rx={1.5} fill={metal} />)}</g>
    }
    case 'treadmill': {
      const [x0, x1] = prop.span!
      return (
        <g>
          <rect x={x0} y={FLOOR - 7} width={x1 - x0} height={7} rx={3.5} fill={dark} />
          <line x1={x1 - 8} y1={FLOOR - 6} x2={x1 + 2} y2={102} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <rect x={x1 - 8} y={96} width={22} height={8} rx={2} fill={dark} />
        </g>
      )
    }
    case 'rope': {
      // Comba vista de frente: pasa por encima de la cabeza y por debajo de los pies según su giro.
      const [ax, ay] = j.wrist
      const [bx, by] = j.wrist2
      const c = Math.cos(((pose.spin ?? 0) * Math.PI) / 180)
      const cy = (ay + by) / 2 + (c >= 0 ? (FLOOR + 6 - ay) * 2 * c : (ay - (j.head[1] - 22)) * 2 * c)
      return <g><path d={`M${ax},${ay} Q${(ax + bx) / 2},${cy} ${bx},${by}`} fill="none" stroke="var(--fig-dark-2)" strokeWidth={2.2} /></g>
    }
    case 'chains':
      // Cadena que cuelga de la barra hasta el suelo: al subir la barra, cuelga más.
      return (
        <g>
          <line x1={x} y1={y} x2={x} y2={FLOOR - 3} stroke="var(--fig-dark-2)" strokeWidth={3.4} strokeDasharray="3.5 2" />
          <ellipse cx={x + 3} cy={FLOOR - 3} rx={10} ry={3.5} fill={dark} />
        </g>
      )
    case 'sled': {
      const [x0, x1] = prop.span!
      const top = prop.y!
      return (
        <g>
          <path d={`M${x0 - 6},${FLOOR - 9} Q${x0},${FLOOR - 2} ${x0 + 8},${FLOOR - 2} L${x1},${FLOOR - 2}`} fill="none" stroke="var(--fig-dark-2)" strokeWidth={5} strokeLinecap="round" />
          <rect x={x0 + 6} y={FLOOR - 14} width={x1 - x0 - 10} height={6} rx={2} fill={dark} />
          <rect x={(x0 + x1) / 2 - 2.5} y={top - 22} width={5} height={FLOOR - 14 - top + 22} fill={dark} />
          <rect x={(x0 + x1) / 2 - 18} y={top} width={36} height={FLOOR - 14 - top} rx={3} fill={metal} />
        </g>
      )
    }
    case 'yoke':
      // Yugo: travesaño sobre los hombros, dos postes y peso abajo.
      return (
        <g>
          <line x1={x - 30} y1={y} x2={x + 30} y2={y} stroke="var(--fig-dark-2)" strokeWidth={6} strokeLinecap="round" />
          <line x1={x - 26} y1={y} x2={x - 26} y2={FLOOR - 5} stroke="var(--fig-dark-2)" strokeWidth={6} />
          <line x1={x + 26} y1={y} x2={x + 26} y2={FLOOR - 5} stroke="var(--fig-dark-2)" strokeWidth={6} />
          <circle cx={x - 26} cy={FLOOR - 24} r={20} fill={metal} />
          <circle cx={x + 26} cy={FLOOR - 24} r={20} fill={metal} />
        </g>
      )
    case 'rickshaw':
      // Armazón de rickshaw: rieles a la altura de las manos, patas al suelo por detrás y peso.
      return (
        <g>
          <line x1={x - 62} y1={y} x2={x + 16} y2={y} stroke="var(--fig-dark-2)" strokeWidth={6} strokeLinecap="round" />
          <line x1={x - 58} y1={y} x2={x - 58} y2={FLOOR - 2} stroke="var(--fig-dark-2)" strokeWidth={6} />
          <circle cx={x - 58} cy={Math.min(y + 22, FLOOR - 20)} r={19} fill={metal} />
        </g>
      )
    case 'farmer':
      // Asa de paseo del granjero: barra corta con peso en los dos extremos.
      return (
        <g>
          <rect x={x - 21} y={y - 2.5} width={42} height={5} rx={2.5} fill={dark} />
          <rect x={x - 25} y={y - 15} width={11} height={30} rx={3} fill={metal} />
          <rect x={x + 14} y={y - 15} width={11} height={30} rx={3} fill={metal} />
        </g>
      )
    case 'stack':
      return <Stack x={prop.point![0]} top={prop.point![1]} metal={metal} dark={dark} />
    case 'log':
      // Tronco de strongman visto de punta, con sus anillos de madera.
      return (
        <g>
          <circle cx={x} cy={y} r={prop.size ?? 21} className="fig-wood" />
          <circle cx={x} cy={y} r={(prop.size ?? 21) * 0.66} className="fig-wood-ring" />
          <circle cx={x} cy={y} r={(prop.size ?? 21) * 0.32} className="fig-wood-ring" />
        </g>
      )
    case 'scott': {
      // Almohadilla de banco Scott: apoya la parte de atrás del brazo.
      const [ex, ey] = j.elbow
      const [sx, sy] = j.shoulder
      const len = Math.hypot(ex - sx, ey - sy) || 1
      const [ux, uy] = [(ex - sx) / len, (ey - sy) / len]
      const [nx, ny] = [uy * -11, ux * 11]
      return (
        <g>
          <line x1={ex + ux * 2 + nx} y1={ey + uy * 2 + ny} x2={ex + nx} y2={FLOOR} stroke="var(--fig-dark-2)" strokeWidth={5} />
          <line x1={sx + ux * 8 + nx} y1={sy + uy * 8 + ny} x2={ex + ux * 6 + nx} y2={ey + uy * 6 + ny} className="fig-rest" />
        </g>
      )
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
      // Barra de jalón: sin discos y colgada de un cable.
      if (prop.bare) {
        const mid = (x0 + x1) / 2
        return (
          <g>
            <line x1={mid} y1={-30} x2={mid} y2={by} className="fig-cable" />
            <rect x={x0 + 18} y={by - 2.5} width={x1 - x0 - 36} height={5} rx={2.5} fill={dark} />
          </g>
        )
      }
      if (figure.above) {
        // Desde arriba, la barra va de mano a mano (perpendicular al cuerpo tumbado).
        const [ax, ay] = j.wrist
        const [bx, by2] = j.wrist2
        const len = Math.hypot(ax - bx, ay - by2) || 1
        const [ux, uy] = [(ax - bx) / len, (ay - by2) / len]
        const [e0, e1]: Pt[] = [[ax + ux * 34, ay + uy * 34], [bx - ux * 34, by2 - uy * 34]]
        return (
          <g>
            <line x1={e0[0]} y1={e0[1]} x2={e1[0]} y2={e1[1]} stroke="var(--fig-dark-2)" strokeWidth={5} strokeLinecap="round" />
            <circle cx={e0[0]} cy={e0[1]} r={9} fill={metal} />
            <circle cx={e1[0]} cy={e1[1]} r={9} fill={metal} />
          </g>
        )
      }
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

const UNDER_ARM = new Set<Prop['type']>(['plate', 'log', 'chains'])

export function Scene({ figure, pose, ids, muscles, glow: glowing = true, compact = false }: { figure: Figure; pose: Pose; ids: string; muscles?: Muscles; glow?: boolean; compact?: boolean }) {
  const j = place(figure, pose)
  const { primary, secondary } = musclesFor(figure, muscles)
  const isFront = figure.view === 'front'
  const { pelvis, neck } = torsoEnds(j, isFront)
  // Solo de frente y de pie: una figura tumbada de lado ya enseña lo que tiene que enseñar.
  const behind = isFront && !figure.turn && !figure.faceOn && seenFromBehind(muscles?.muscle ?? (primary.values().next().value as string))
  const head = headPaths(j.head, neck, isFront, behind)
  const neckTop = lerp(neck, j.head, 0.62)
  const sx = shadowX(figure, j)

  // Solo se dibujan los músculos que trabajan: el resto del cuerpo queda limpio.
  // De frente, los dos lados están igual de cerca: solo de perfil se atenúa el lado lejano.
  const paint = (segment: Segment | 'pelvis', a: Pt, b: Pt, far = false) =>
    spots(segment, a, b, isFront, far, behind).map(({ muscle, d }, i) => {
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
      {part(armPath(j, isFront, far, pose.bend ?? 0), far)}
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

  // Los discos y el tronco van por detrás del brazo: si no, tapaban la mano y la barra no se entendía.
  const behindArm = figure.props.filter((p) => p.front && UNDER_ARM.has(p.type)).map((p, i) => <PropShape key={`u${i}`} prop={p} j={j} pose={pose} ids={ids} figure={figure} />)

  return (
    <g>
      {!compact && !figure.above && <ellipse cx={sx} cy={FLOOR + 3} rx={figure.shadow ?? 62} ry={5} className="fig-shadow" />}
      {figure.machine && !compact && <MachineTower figure={figure} ids={ids} />}
      {figure.props.filter((p) => !p.front).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} ids={ids} figure={figure} />)}
      {isFront ? (
        <>
          {trunk}
          {!figure.noLegs && leg(true)}
          {!figure.noLegs && leg(false)}
          {paint('pelvis', pelvis, neck)}
          {behindArm}
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
          {behindArm}
          {arm(false)}
        </>
      )}
      {figure.props.filter((p) => p.front && !UNDER_ARM.has(p.type)).map((p, i) => <PropShape key={i} prop={p} j={j} pose={pose} ids={ids} figure={figure} />)}
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
  // La postura final suele ser la que define el ejercicio (abajo en la sentadilla, arriba en el curl).
  const pose = poseAt(figure, figure.loop ? 0.3 : 1)
  return (
    <svg className="thumb muscle-thumb fig-thumb" width={size} height={size} viewBox={thumbViewBox(place(figure, pose))} aria-hidden="true">
      <FigureDefs id={ids} />
      <Scene figure={figure} pose={pose} ids={ids} muscles={exercise} glow={false} compact />
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
      if (figure.loop) { setT(phase); frame = requestAnimationFrame(tick); return }
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
