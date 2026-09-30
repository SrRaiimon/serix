import { FLOOR, type Figure, type JointName, type Pose, type Prop } from './figures'

// Geometría de las figuras de movimiento (sin React): cinemática directa, interpolación entre
// posturas y encuadre. La usan el dibujo (components/MoveFigure.tsx) y la comprobación automática
// (scripts/check-figures.mjs).

export const L = { torso: 64, neck: 9, thigh: 53, shin: 49, foot: 18, upper: 34, fore: 31 }

export type Pt = [number, number]
export type Joints = Record<JointName | 'shoulder2' | 'hip2', Pt>

/** Punto a partir de otro, un ángulo (0 arriba, 90 delante, 180 abajo, -90 detrás) y una longitud. */
export function step([x, y]: Pt, angle: number, length: number): Pt {
  const a = (angle * Math.PI) / 180
  return [x + length * Math.sin(a), y - length * Math.cos(a)]
}

// Escorzos (vista de frente: segmentos que apuntan al espectador se ven más cortos) y encogimiento
// de hombros (sube los hombros sin mover la cabeza).
const torsoLen = (pose: Pose) => L.torso * (pose.torsoLen ?? 1)
const thighLen = (pose: Pose) => L.thigh * (pose.thighLen ?? 1)
const shinLen = (pose: Pose) => L.shin * (pose.shinLen ?? 1)

function side(pose: Pose, hip: Pt): Joints {
  const neckBase = step(hip, pose.torso, torsoLen(pose))
  const shoulder = step(hip, pose.torso, torsoLen(pose) + (pose.shrug ?? 0))
  const shoulder2 = step(shoulder, pose.torso - 90, 3)
  const knee = step(hip, pose.thigh, thighLen(pose))
  const ankle = step(knee, pose.shin, shinLen(pose))
  const knee2 = step(hip, pose.thigh2 ?? pose.thigh, thighLen(pose))
  const ankle2 = step(knee2, pose.shin2 ?? pose.shin, shinLen(pose))
  const elbow = step(shoulder, pose.upper, L.upper)
  const elbow2 = step(shoulder2, pose.upper2 ?? pose.upper, L.upper)
  return {
    hip, hip2: hip, shoulder, shoulder2, head: step(neckBase, pose.head ?? pose.torso, L.neck + 12),
    knee, ankle, toe: step(ankle, pose.foot ?? 90, L.foot),
    knee2, ankle2, toe2: step(ankle2, pose.foot2 ?? pose.foot ?? 90, L.foot),
    elbow, wrist: step(elbow, pose.fore, L.fore),
    elbow2, wrist2: step(elbow2, pose.fore2 ?? pose.fore, L.fore),
  }
}

/** De frente: el lado «cercano» es el derecho de la imagen y el otro se refleja. */
function front(pose: Pose, pelvis: Pt): Joints {
  const mid = step(pelvis, pose.torso, torsoLen(pose))
  const lift = pose.shrug ?? 0
  const hip: Pt = [pelvis[0] + 10, pelvis[1]]
  const hip2: Pt = [pelvis[0] - 10, pelvis[1]]
  const shoulder: Pt = [mid[0] + 19, mid[1] + 4 - lift]
  const shoulder2: Pt = [mid[0] - 19, mid[1] + 4 - lift]
  const knee = step(hip, pose.thigh, thighLen(pose))
  const ankle = step(knee, pose.shin, shinLen(pose))
  const knee2 = step(hip2, -(pose.thigh2 ?? pose.thigh), thighLen(pose))
  const ankle2 = step(knee2, -(pose.shin2 ?? pose.shin), shinLen(pose))
  const elbow = step(shoulder, pose.upper, L.upper)
  const elbow2 = step(shoulder2, -(pose.upper2 ?? pose.upper), L.upper)
  return {
    hip, hip2, shoulder, shoulder2, head: step(mid, pose.head ?? pose.torso, L.neck + 12),
    knee, ankle, toe: step(ankle, 150, 12), knee2, ankle2, toe2: step(ankle2, -150, 12),
    elbow, wrist: step(elbow, pose.fore, L.fore), elbow2, wrist2: step(elbow2, -(pose.fore2 ?? pose.fore), L.fore),
  }
}

export function place(figure: Figure, pose: Pose): Joints {
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
  const joints = build(pose, [origin[0] + (pose.shift ?? 0), origin[1] - (pose.lift ?? 0)])
  return figure.turn ? turned(joints, figure.anchor?.at ?? joints.hip, figure.turn) : joints
}

/** Gira todas las articulaciones alrededor de un punto (para figuras tumbadas de lado). */
function turned(j: Joints, [cx, cy]: Pt, degrees: number): Joints {
  const a = (degrees * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const out = {} as Joints
  for (const [key, [x, y]] of Object.entries(j) as [keyof Joints, Pt][]) {
    out[key] = [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
  }
  return out
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

/** Valor que se da por hecho si una postura no indica el campo (para poder interpolar). */
const POSE_DEFAULTS: Partial<Record<keyof Pose, number>> = { lift: 0, shift: 0, shrug: 0, thighLen: 1, torsoLen: 1, shinLen: 1, foot: 90 }

const FALLBACK: Partial<Record<keyof Pose, keyof Pose>> = { thigh2: 'thigh', shin2: 'shin', upper2: 'upper', fore2: 'fore', foot2: 'foot', head: 'torso' }

const ANGLES = new Set<keyof Pose>(['torso', 'head', 'thigh', 'shin', 'thigh2', 'shin2', 'upper', 'fore', 'upper2', 'fore2', 'foot', 'foot2'])

/**
 * Postura intermedia. Los ángulos van por el camino corto (de 180 a -106 son 74° hacia atrás, no
 * 286° pasando por arriba), salvo los que la figura marca como barrido largo.
 */
function blend(a: Pose, b: Pose, t: number, sweep: (keyof Pose)[] = []): Pose {
  const out: Partial<Record<keyof Pose, number>> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>) {
    // Si una postura no indica el lado lejano (o la cabeza), vale lo mismo que el cercano (o el tronco).
    const base = FALLBACK[key]
    const zero = POSE_DEFAULTS[key]
    const from = a[key] ?? (base && a[base]) ?? zero
    let to = b[key] ?? (base && b[base]) ?? zero ?? from
    if (from === undefined || to === undefined) continue
    if (ANGLES.has(key) && !sweep.includes(key)) {
      while (to - from > 180) to -= 360
      while (to - from < -180) to += 360
    }
    out[key] = mix(from, to, t)
  }
  return out as Pose
}

/** Punto de referencia de un objeto (y su ángulo) para una postura dada. */
export function propAnchor(prop: Prop, j: Joints, pose: Pose): { x: number; y: number; angle: number } {
  const origin: Pt = prop.at ? j[prop.at] : prop.point ?? [0, 0]
  const angle = (prop.angle ?? 0) + (prop.rel === 'torso' ? pose.torso : 0)
  const [x, y] = prop.offset ? step(origin, angle, prop.offset) : origin
  return { x, y, angle }
}

/** Barra vista de frente: de mano a mano (y algo más), con un disco en cada extremo. */
export function barFrontEnds(j: Joints): { x0: number; x1: number; y: number } {
  const y = (j.wrist[1] + j.wrist2[1]) / 2
  const left = Math.min(j.wrist[0], j.wrist2[0])
  const right = Math.max(j.wrist[0], j.wrist2[0])
  return { x0: left - 34, x1: right + 34, y }
}

/** Centro de la sombra en el suelo. */
export function shadowX(figure: Figure, j: Joints): number {
  const pelvisX = figure.view === 'front' ? (j.hip[0] + j.hip2[0]) / 2 : j.hip[0]
  return figure.anchor && figure.view !== 'front' && !figure.turn ? 130 : pelvisX
}

/**
 * Encuadre automático: recorre la animación entera (posturas intermedias y arco de los saltos),
 * calcula lo que ocupan figura, objetos, suelo y sombra, y devuelve un viewBox centrado con la
 * proporción de la tarjeta. Así ninguna figura se corta ni queda pequeña o descentrada.
 */
const ASPECT = 260 / 280
const fitCache = new WeakMap<Figure, string>()
export function fitViewBox(figure: Figure): string {
  const cached = fitCache.get(figure)
  if (cached) return cached
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const add = (x: number, y: number, r = 0) => {
    minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r)
    minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r)
  }
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    const pose = poseAt(figure, t)
    const j = place(figure, pose)
    for (const [key, p] of Object.entries(j)) add(p[0], p[1], key === 'head' ? 13 : 10)
    const sx = shadowX(figure, j)
    add(sx - (figure.shadow ?? 62), FLOOR + 9); add(sx + (figure.shadow ?? 62), FLOOR + 9)
    for (const prop of figure.props) {
      const { x, y } = propAnchor(prop, j, pose)
      switch (prop.type) {
        case 'plate': add(x, y, prop.size ?? 32); break
        case 'dumbbell': add(x, y, 18); break
        case 'kettlebell': add(x, prop.up ? y - 11 : y + 13, 12); break
        case 'pad': add(x, y, prop.size ?? 8); break
        case 'ball': add(x, y, prop.size ?? 10); break
        case 'platform': add(x, y, 34); break
        case 'grip': add(x, y, 18); break
        case 'cable': add(prop.point![0], prop.point![1], 6); add(x, y); break
        case 'band': { const [ax, ay] = prop.to ? j[prop.to] : prop.point!; add(ax, ay); add(x, y); break }
        case 'barFront': { const e = barFrontEnds(j); add(e.x0, e.y - 24); add(e.x1, e.y + 24); break }
        case 'bench': case 'box': case 'bar': case 'seat':
          add(prop.span![0], prop.y! - 6); add(prop.span![1], FLOOR)
          if (prop.back) { add(prop.back[0], prop.back[1]); add(prop.back[0] + 10, prop.back[1] + prop.back[2]) }
          break
        case 'rest': add(x, y, 8); break
      }
    }
  }
  const pad = 12
  let w = maxX - minX + pad * 2
  let h = maxY - minY + pad * 2
  // Mismo tamaño mínimo para que las figuras pequeñas no se amplíen de más.
  w = Math.max(w, 200); h = Math.max(h, 200)
  if (w / h > ASPECT) h = w / ASPECT
  else w = h * ASPECT
  const box = `${((minX + maxX) / 2 - w / 2).toFixed(1)} ${((minY + maxY) / 2 - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`
  fitCache.set(figure, box)
  return box
}

/** Postura de la animación en el instante t (0 = inicial, 1 = final). */
export function poseAt(figure: Figure, t: number): Pose {
  return withArc(figure, blend(figure.frames[0], figure.frames[1], t, figure.sweep), t)
}

/** En los saltos, la figura describe un arco entre las dos posturas. */
function withArc(figure: Figure, pose: Pose, t: number): Pose {
  return figure.arc ? { ...pose, lift: (pose.lift ?? 0) + figure.arc * Math.sin(Math.PI * t) } : pose
}
