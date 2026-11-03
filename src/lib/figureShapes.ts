import type { Joints, Pt } from './figureEngine'

// Formas del muñeco (sin React): convierte el esqueleto en siluetas con anatomía y en los vientres de cada
// músculo. Las articulaciones no cambian: esto solo decide qué se dibuja alrededor de ellas.

/** Sección de un segmento: posición (0 = raíz, 1 = extremo), ancho hacia un lado y hacia el otro. */
type Row = readonly [number, number, number]

// En brazos y piernas el primer ancho es la cara anterior (cuádriceps, bíceps) y el segundo la posterior
// (femoral, gemelo, tríceps). En el tronco, que va hacia arriba, es al revés: espalda y luego pecho.
const SIDE = {
  thigh: [[-0.1, 6, 7], [0.05, 10, 11], [0.3, 11, 10.5], [0.62, 9.5, 8.5], [0.92, 7, 6.5], [1.08, 4, 4]],
  shin: [[-0.08, 4, 4], [0.08, 6.2, 6.5], [0.3, 5.5, 8.6], [0.62, 4.4, 5.6], [0.92, 3.4, 3.6], [1.06, 2.4, 2.4]],
  upper: [[-0.12, 4.5, 4.5], [0.08, 7, 7.2], [0.42, 6.8, 7], [0.8, 4.8, 5], [1.1, 3, 3]],
  fore: [[-0.1, 3, 3], [0.14, 4.6, 4.2], [0.36, 5.2, 4.6], [0.82, 3.2, 3], [1.06, 2.2, 2.2]],
  torso: [[-0.16, 6, 5], [-0.02, 12, 10], [0.14, 12.5, 10], [0.32, 9, 9.5], [0.52, 9.5, 10.5], [0.76, 11.5, 13.5], [0.92, 11, 11.5], [1.08, 6, 6]],
} as const satisfies Record<string, readonly Row[]>

const FRONT = {
  thigh: [[-0.1, 6, 6], [0.05, 10, 9.5], [0.34, 10.5, 9.5], [0.66, 8.5, 8], [0.92, 6.8, 6.4], [1.08, 4, 4]],
  shin: [[-0.08, 4, 4], [0.08, 6, 5.8], [0.3, 7, 6.6], [0.64, 5, 4.8], [0.92, 3.6, 3.4], [1.06, 2.4, 2.4]],
  upper: SIDE.upper,
  fore: SIDE.fore,
  torso: [[-0.18, 8, 8], [-0.02, 16.5, 16.5], [0.12, 16.5, 16.5], [0.34, 14, 14], [0.58, 16, 16], [0.82, 21, 21], [0.97, 22, 22], [1.07, 13, 13], [1.12, 6, 6]],
} as const satisfies Record<string, readonly Row[]>

export type Segment = keyof typeof SIDE
const HAND: readonly Row[] = [[-0.1, 2.5, 2.5], [0.4, 4.4, 4.2], [0.9, 3.6, 3.2], [1.1, 1.8, 1.8]]
const NECK: readonly Row[] = [[-0.1, 5, 5], [0.5, 4.6, 4.6], [1.1, 4.4, 4.4]]
const FOOT_FRONT: readonly Row[] = [[-0.3, 3.5, 3.5], [0.3, 5.4, 5.4], [0.95, 4.8, 4.8], [1.2, 2.5, 2.5]]

const f = (n: number) => n.toFixed(1)

/** Contorno cerrado y suave que pasa cerca de los puntos (curvas entre los puntos medios de cada lado). */
function smooth(points: Pt[]): string {
  const mid = (a: Pt, b: Pt) => `${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2)}`
  let d = `M${mid(points[points.length - 1], points[0])}`
  points.forEach((p, i) => { d += `Q${f(p[0])} ${f(p[1])} ${mid(p, points[(i + 1) % points.length])}` })
  return `${d}Z`
}

/** Sistema de ejes de un segmento: dirección, normal (cara «primera» de la sección) y longitud. */
function axes(a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  return { d: [dx / len, dy / len] as Pt, n: [dy / len, -dx / len] as Pt, len }
}

/**
 * Silueta de un segmento. Siempre en sentido horario, para que al juntar varios en un mismo trazado (muslo,
 * rodilla, pierna y pie) los solapes se sumen en vez de abrir un agujero.
 */
function tube(a: Pt, b: Pt, rows: readonly Row[], scale = 1): string {
  const { d, n, len } = axes(a, b)
  const at = (t: number, w: number): Pt => [a[0] + d[0] * t * len + n[0] * w * scale, a[1] + d[1] * t * len + n[1] * w * scale]
  return smooth([...rows.map(([t, w]) => at(t, w)), ...[...rows].reverse().map(([t, , w]) => at(t, -w))])
}

const circle = ([x, y]: Pt, r: number) => `M${f(x - r)} ${f(y)}A${r} ${r} 0 1 1 ${f(x + r)} ${f(y)}A${r} ${r} 0 1 1 ${f(x - r)} ${f(y)}Z`

function widthsAt(rows: readonly Row[], t: number): [number, number] {
  const next = rows.findIndex((r) => r[0] >= t)
  if (next <= 0) { const r = rows[next === 0 ? 0 : rows.length - 1]; return [r[1], r[2]] }
  const [p, q] = [rows[next - 1], rows[next]]
  const k = (t - p[0]) / (q[0] - p[0])
  return [p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]
}

/** Zona de un músculo: tramo del segmento (t0-t1) y franja de su ancho (-1 a 1), con forma de vientre muscular. */
export type Spot = readonly [number, number, number, number]

function belly(a: Pt, b: Pt, rows: readonly Row[], [t0, t1, u0, u1]: Spot, scale: number): string {
  const { d, n, len } = axes(a, b)
  const center = (u0 + u1) / 2, half = (u1 - u0) / 2
  const STEPS = 6
  const sideOf = (sign: number) => Array.from({ length: STEPS + 1 }, (_, i): Pt => {
    const s = i / STEPS, t = t0 + (t1 - t0) * s
    const [plus, minus] = widthsAt(rows, t)
    const u = center + sign * half * Math.pow(Math.sin(Math.PI * s), 0.55)
    const w = (u >= 0 ? u * plus : u * minus) * scale
    return [a[0] + d[0] * t * len + n[0] * w, a[1] + d[1] * t * len + n[1] * w]
  })
  return smooth([...sideOf(1), ...sideOf(-1).reverse().slice(1, -1)])
}

// Dónde queda cada músculo del catálogo en cada segmento.
const FULL_LIMB: Spot = [0.08, 0.92, -0.78, 0.78]
const SIDE_SPOTS: Record<Segment | 'pelvis', Record<string, Spot[]>> = {
  thigh: { quads: [[0.08, 0.94, 0.08, 0.86]], hamstrings: [[0.1, 0.94, -0.86, -0.08]], adductors: [[0.06, 0.66, -0.42, 0.42]], abductors: [[0, 0.46, -0.5, 0.5]] },
  shin: { calves: [[0.02, 0.74, -0.9, -0.06]] },
  upper: { biceps: [[0.14, 0.9, 0.08, 0.86]], triceps: [[0.1, 0.92, -0.86, -0.08]], delts: [[-0.1, 0.44, -0.9, 0.9]] },
  fore: { forearms: [[0.02, 0.84, -0.78, 0.78]] },
  torso: {
    pectorals: [[0.58, 0.96, -0.92, -0.08]], abs: [[0.1, 0.56, -0.88, -0.1]], lats: [[0.36, 0.86, 0.08, 0.88]],
    'upper-back': [[0.66, 1.02, 0.08, 0.9]], traps: [[0.84, 1.08, 0.1, 0.95]], spine: [[0.08, 0.62, 0.22, 0.86]],
  },
  pelvis: { glutes: [[-0.14, 0.22, 0.02, 1.02]] },
}
const FRONT_SPOTS: Record<Segment | 'pelvis', Record<string, Spot[]>> = {
  // De frente, el lado positivo del muslo cercano es el de fuera; en el lejano se refleja (ver `spots`).
  thigh: { quads: [FULL_LIMB], hamstrings: [FULL_LIMB], adductors: [[0.04, 0.72, -0.86, -0.1]], abductors: [[-0.04, 0.54, 0.14, 0.92]] },
  shin: { calves: [[0.02, 0.8, -0.8, 0.8]] },
  upper: { biceps: [FULL_LIMB], triceps: [FULL_LIMB], delts: [[-0.12, 0.42, -0.92, 0.92]] },
  fore: { forearms: [[0.02, 0.84, -0.78, 0.78]] },
  torso: {
    pectorals: [[0.6, 0.94, 0.05, 0.74], [0.6, 0.94, -0.74, -0.05]], abs: [[0.1, 0.56, -0.44, 0.44]],
    lats: [[0.38, 0.84, 0.5, 0.97], [0.38, 0.84, -0.97, -0.5]], 'upper-back': [[0.6, 0.98, -0.84, 0.84]],
    traps: [[0.88, 1.1, -0.72, 0.72]], spine: [[0.08, 0.58, -0.26, 0.26]],
  },
  pelvis: { glutes: [[-0.12, 0.2, 0.05, 0.92], [-0.12, 0.2, -0.92, -0.05]] },
}

export interface MuscleSpot { muscle: string; d: string }

/** Vientres musculares de un segmento (`far`: lado lejano, algo más estrecho). */
export function spots(segment: Segment | 'pelvis', a: Pt, b: Pt, front: boolean, far = false): MuscleSpot[] {
  const rows = (front ? FRONT : SIDE)[segment === 'pelvis' ? 'torso' : segment]
  const scale = far && !front ? 0.92 : 1
  const out: MuscleSpot[] = []
  for (const [muscle, list] of Object.entries((front ? FRONT_SPOTS : SIDE_SPOTS)[segment])) {
    for (const [t0, t1, u0, u1] of list) {
      const spot: Spot = far && front ? [t0, t1, -u1, -u0] : [t0, t1, u0, u1]
      out.push({ muscle, d: belly(a, b, rows, spot, scale) })
    }
  }
  return out
}

const extend = (from: Pt, to: Pt, length: number): Pt => {
  const { d } = axes(from, to)
  return [to[0] + d[0] * length, to[1] + d[1] * length]
}

/** Pie de perfil: talón, empeine y suela plana. Los ejes salen del tobillo hacia la punta y hacia la suela. */
function footSide(ankle: Pt, toe: Pt): string {
  const { d, len } = axes(ankle, toe)
  const sole: Pt = [-d[1], d[0]]
  const p = (along: number, down: number): Pt => [ankle[0] + d[0] * along + sole[0] * down, ankle[1] + d[1] * along + sole[1] * down]
  return smooth([p(-7.5, 5.4), p(-8, -1), p(-3.5, -6), p(4, -5), p(len * 0.75, -1.8), p(len + 3.5, 0.2), p(len + 3.5, 4.2), p(len * 0.5, 6), p(0, 6)])
}

export function legPath(j: Joints, front: boolean, far: boolean): string {
  const [hip, knee, ankle, toe] = far ? [j.hip2, j.knee2, j.ankle2, j.toe2] : [j.hip, j.knee, j.ankle, j.toe]
  const P = front ? FRONT : SIDE
  const scale = far && !front ? 0.92 : 1
  return [
    circle(hip, front ? 9.5 : 10), tube(hip, knee, P.thigh, scale), circle(knee, 7), tube(knee, ankle, P.shin, scale),
    front ? tube(ankle, toe, FOOT_FRONT) : footSide(ankle, toe),
  ].join('')
}

export function armPath(j: Joints, front: boolean, far: boolean): string {
  const [shoulder, elbow, wrist] = far ? [j.shoulder2, j.elbow2, j.wrist2] : [j.shoulder, j.elbow, j.wrist]
  const scale = far && !front ? 0.92 : 1
  return [
    circle(shoulder, 7.5), tube(shoulder, elbow, SIDE.upper, scale), circle(elbow, 4.8), tube(elbow, wrist, SIDE.fore, scale),
    tube(wrist, extend(elbow, wrist, 9), HAND),
  ].join('')
}

/** Puntos del tronco: pelvis (centro de las caderas) y base del cuello. */
export function torsoEnds(j: Joints, front: boolean): { pelvis: Pt; neck: Pt } {
  return front
    ? { pelvis: [(j.hip[0] + j.hip2[0]) / 2, (j.hip[1] + j.hip2[1]) / 2], neck: [(j.shoulder[0] + j.shoulder2[0]) / 2 , (j.shoulder[1] + j.shoulder2[1]) / 2] }
    : { pelvis: j.hip, neck: j.shoulder }
}

export const torsoPath = (pelvis: Pt, neck: Pt, front: boolean) => tube(pelvis, neck, (front ? FRONT : SIDE).torso)
export const neckPath = (neck: Pt, head: Pt) => tube(neck, head, NECK)

// Cabeza: puntos relativos a su centro, en (hacia delante, hacia arriba).
const HEAD_SIDE: Pt[] = [[-11.5, 1], [-10, 9], [0, 13.5], [9.5, 9.5], [11.5, 2], [11, -5], [6.5, -12], [-1.5, -11.5], [-8.5, -6]]
const HAIR_SIDE: Pt[] = [[-12, 0], [-10.5, 9.5], [0, 14.2], [9.8, 10], [10.8, 5.5], [3, 6.5], [-2.5, 2.5], [-5, -4], [-10, -4]]
const HEAD_FRONT: Pt[] = [[-10.5, 2], [-9.5, 9], [0, 13.5], [9.5, 9], [10.5, 2], [8.5, -7], [3.5, -12.5], [-3.5, -12.5], [-8.5, -7]]
const HAIR_FRONT: Pt[] = [[-11, 1], [-10, 9.5], [0, 14.2], [10, 9.5], [11, 1], [8.8, 5], [0, 7.5], [-8.8, 5]]

/** Cabeza y pelo: el perfil deja ver hacia dónde mira, también boca abajo o tumbado. */
export function headPaths(head: Pt, neck: Pt, front: boolean): { head: string; hair: string } {
  const { d } = axes(neck, head)
  const forward: Pt = [-d[1], d[0]]
  const place = (pts: Pt[]) => smooth(pts.map(([a, u]): Pt => [head[0] + forward[0] * a + d[0] * u, head[1] + forward[1] * a + d[1] * u]))
  return front ? { head: place(HEAD_FRONT), hair: place(HAIR_FRONT) } : { head: place(HEAD_SIDE), hair: place(HAIR_SIDE) }
}
