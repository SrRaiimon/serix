// Figuras de movimiento propias: cada ejercicio usa un patrón (sentadilla, remo, press…) con dos
// posturas (inicial y final) definidas por ángulos. Ángulos absolutos en grados: 0 = arriba,
// 90 = hacia delante (derecha de la imagen), 180 = abajo, -90 = hacia atrás. De frente, 90 es hacia
// fuera del cuerpo en el lado derecho de la imagen y el otro lado se refleja.

export type Part = 'legs' | 'calves' | 'glutes' | 'back' | 'chest' | 'core' | 'shoulders' | 'arms' | 'forearms'
export type JointName = 'hip' | 'shoulder' | 'head' | 'knee' | 'ankle' | 'toe' | 'elbow' | 'wrist' | 'knee2' | 'ankle2' | 'toe2' | 'elbow2' | 'wrist2'

export interface Pose {
  torso: number
  head?: number
  thigh: number
  shin: number
  thigh2?: number
  shin2?: number
  upper: number
  fore: number
  upper2?: number
  fore2?: number
  foot?: number
  foot2?: number
  /** Elevación extra sobre el apoyo y desplazamiento horizontal (saltos). */
  lift?: number
  shift?: number
}

export interface Prop {
  type: 'plate' | 'dumbbell' | 'kettlebell' | 'bench' | 'box' | 'bar' | 'cable' | 'band' | 'pad' | 'seat' | 'platform' | 'grip' | 'rest'
  at?: JointName
  to?: JointName
  point?: [number, number]
  /** Ángulo y distancia desde la articulación; con rel = 'torso' el ángulo es relativo al tronco. */
  angle?: number
  offset?: number
  rel?: 'torso'
  size?: number
  span?: [number, number]
  y?: number
  tilt?: number
  back?: [number, number, number, number?]
  front?: boolean
  /** Kettlebell por encima de la mano (en press) en lugar de colgando. */
  up?: boolean
}

export interface Figure {
  view: 'side' | 'front'
  frames: [Pose, Pose]
  props: Prop[]
  work: Part[]
  /** Articulación fija en un punto (si no, el tobillo cercano queda fijo y lo más bajo toca el suelo). */
  anchor?: { joint: JointName; at: [number, number] }
  /** Además de los pies, las manos también apoyan en el suelo. */
  hands?: boolean
  x?: number
  /** Altura extra a mitad del movimiento (trayectoria en arco de los saltos). */
  arc?: number
  period?: number
  shadow?: number
}

const FLOOR = 222

// ---------------------------------------------------------------- piernas
const STAND = { torso: 3, thigh: 180, shin: 180, foot: 90 }
const SQUAT = { torso: 40, head: 20, thigh: 95, shin: 205, foot: 90 }

const backBar: Prop = { type: 'plate', at: 'shoulder', rel: 'torso', angle: -90, offset: 10, size: 25 }
const armsOnBar = { upper: -150, fore: -20 }
const armsOnBarLow = { upper: -115, fore: -25 }

const squatBarbell: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [backBar],
  frames: [{ ...STAND, ...armsOnBar }, { ...SQUAT, ...armsOnBarLow }],
}
const squatFront: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'plate', at: 'shoulder', rel: 'torso', angle: 90, offset: 12, front: true, size: 21 }],
  frames: [{ ...STAND, upper: 95, fore: -40 }, { ...SQUAT, torso: 25, upper: 110, fore: -25 }],
}
const squatDumbbells: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...STAND, upper: 178, fore: 178 }, { ...SQUAT, upper: 185, fore: 180 }],
}
const squatGoblet: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [{ ...STAND, upper: 165, fore: 20 }, { ...SQUAT, torso: 30, upper: 150, fore: 20 }],
}
const squatBodyweight: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [],
  frames: [{ ...STAND, upper: 175, fore: 175 }, { ...SQUAT, upper: 90, fore: 90 }],
}
const squatBand: Figure = {
  ...squatBodyweight, props: [{ type: 'band', at: 'wrist', to: 'ankle' }],
  frames: [{ ...STAND, upper: 165, fore: 15 }, { ...SQUAT, upper: 150, fore: 10 }],
}
const jumpSquat: Figure = {
  view: 'side', work: ['legs', 'glutes', 'calves'], props: [], period: 1800,
  frames: [{ ...SQUAT, upper: -150, fore: -160 }, { ...STAND, foot: 140, upper: 45, fore: 35, lift: 18 }],
}

const DEADLIFT_LOW = { torso: 58, head: 70, thigh: 125, shin: 195, foot: 90, upper: 180, fore: 180 }
const deadlift: Figure = {
  view: 'side', work: ['back', 'glutes', 'legs'], props: [{ type: 'plate', at: 'wrist', front: true }],
  frames: [DEADLIFT_LOW, { ...STAND, upper: 180, fore: 180 }],
}
const RDL_LOW = { torso: 72, head: 75, thigh: 168, shin: 182, foot: 90, upper: 180, fore: 180 }
const rdl: Figure = { ...deadlift, work: ['legs', 'glutes'], frames: [{ ...STAND, upper: 180, fore: 180 }, RDL_LOW] }
const rdlDumbbell: Figure = { ...rdl, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const goodMorningBand: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'band', at: 'shoulder', to: 'ankle' }],
  frames: [{ ...STAND, ...armsOnBar }, { ...RDL_LOW, torso: 78, ...armsOnBar }],
}
const swing: Figure = {
  view: 'side', work: ['glutes', 'legs'], props: [{ type: 'kettlebell', at: 'wrist', front: true }], period: 1800,
  frames: [{ torso: 62, head: 80, thigh: 160, shin: 188, foot: 90, upper: 205, fore: 205 }, { ...STAND, upper: 90, fore: 90 }],
}

const hipThrust: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'shoulder', at: [84, 168] }, shadow: 95,
  props: [{ type: 'bench', span: [10, 92], y: 176 }, { type: 'plate', at: 'hip', angle: 0, offset: 15, front: true, size: 24 }],
  frames: [
    { torso: -50, head: -40, thigh: 51.3, shin: 147.1, foot: 90, upper: -90, fore: -90 },
    { torso: -90, head: -75, thigh: 90, shin: 180, foot: 90, upper: -90, fore: -90 },
  ],
}
const gluteBridge: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'shoulder', at: [50, 210] }, shadow: 105,
  props: [],
  frames: [
    { torso: -90, head: -90, thigh2: 46.5, shin2: 152.6, thigh: 46, shin: 46, foot: 46, foot2: 90, upper: 92, fore: 90 },
    { torso: -110, head: -100, thigh2: 70.6, shin2: 162.1, thigh: 70, shin: 70, foot: 70, foot2: 90, upper: 92, fore: 90 },
  ],
}
const legPress: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [96, 180] },
  props: [
    { type: 'seat', span: [72, 122], y: 188 },
    { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 },
    { type: 'platform', at: 'ankle', angle: 52 },
  ],
  frames: [
    { torso: -50, head: -35, thigh: 18, shin: 118, foot: -38, upper: 160, fore: 120 },
    { torso: -50, head: -35, thigh: 52, shin: 52, foot: -38, upper: 160, fore: 120 },
  ],
}

const LUNGE_TOP = { torso: 2, thigh: 165, shin: 180, thigh2: -162, shin2: -160, foot: 90, foot2: 150 }
const LUNGE_LOW = { torso: 4, thigh: 98, shin: 182, thigh2: 182, shin2: -98, foot: 90, foot2: 170 }
const lungeDumbbells: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'dumbbell', at: 'wrist', front: true }], x: 160,
  frames: [{ ...LUNGE_TOP, upper: 180, fore: 180 }, { ...LUNGE_LOW, upper: 180, fore: 180 }],
}
const lungeBarbell: Figure = { ...lungeDumbbells, props: [backBar], frames: [{ ...LUNGE_TOP, ...armsOnBar }, { ...LUNGE_LOW, ...armsOnBar }] }
const lungeBodyweight: Figure = { ...lungeDumbbells, props: [], frames: [{ ...LUNGE_TOP, upper: 200, fore: 60 }, { ...LUNGE_LOW, upper: 200, fore: 60 }] }
const lungePass: Figure = { ...lungeDumbbells, props: [{ type: 'kettlebell', at: 'wrist', front: true }], frames: [{ ...LUNGE_TOP, upper: 180, fore: 180 }, { ...LUNGE_LOW, torso: 20, upper: 165, fore: 165 }] }
const bulgarian: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'ankle', at: [170, 217] },
  props: [{ type: 'bench', span: [30, 94], y: 190 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 4, thigh: 158, shin: 185, thigh2: -152.6, shin2: -111.5, foot: 90, foot2: -100, upper: 180, fore: 180 },
    { torso: 8, thigh: 100, shin: 186, thigh2: 178.7, shin2: -55.2, foot: 90, foot2: -100, upper: 180, fore: 180 },
  ],
}
const stepUp: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'ankle', at: [150, 191] },
  props: [{ type: 'box', span: [118, 200], y: 196 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 12, thigh: 112, shin: 192, thigh2: 168, shin2: -149.3, foot: 90, foot2: 100, upper: 180, fore: 180 },
    { ...STAND, thigh2: 186, shin2: 160, foot2: 110, upper: 180, fore: 180 },
  ],
}

const lyingLegCurl: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [128, 160] }, shadow: 100,
  props: [{ type: 'bench', span: [34, 180], y: 170 }, { type: 'pad', at: 'ankle', angle: 0, offset: 10, front: true }],
  frames: [
    { torso: -92, head: -80, thigh: 94, shin: 92, foot: 180, upper: 175, fore: 120 },
    { torso: -92, head: -80, thigh: 94, shin: -8, foot: 90, upper: 175, fore: 120 },
  ],
}
const seatedLegCurl: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [90, 150] },
  props: [{ type: 'seat', span: [66, 140], y: 162, back: [58, 70, 90] }, { type: 'pad', at: 'ankle', angle: -90, offset: 8, front: true }],
  frames: [
    { torso: -8, thigh: 90, shin: 100, foot: 20, upper: 170, fore: 90 },
    { torso: -8, thigh: 90, shin: 205, foot: 100, upper: 170, fore: 90 },
  ],
}
const legExtension: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [90, 150] },
  props: [{ type: 'seat', span: [66, 140], y: 162, back: [58, 70, 90] }, { type: 'pad', at: 'ankle', angle: 90, offset: 9, front: true }],
  frames: [
    { torso: -5, thigh: 90, shin: 185, foot: 95, upper: 172, fore: 150 },
    { torso: -5, thigh: 90, shin: 92, foot: 30, upper: 172, fore: 150 },
  ],
}
const nordic: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'knee', at: [96, 214] }, shadow: 100,
  props: [{ type: 'pad', at: 'ankle', angle: 0, offset: 11 }],
  // De rodillas y con los tobillos sujetos, el cuerpo entero se inclina hacia delante sobre las rodillas.
  frames: [
    { torso: 0, head: 0, thigh: 180, shin: -90, foot: -150, upper: 180, fore: 180 },
    { torso: 58, head: 70, thigh: 238, shin: -90, foot: -150, upper: 150, fore: 140 },
  ],
}
const ballLegCurl: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'shoulder', at: [48, 210] }, shadow: 110,
  props: [{ type: 'pad', at: 'ankle', angle: 180, offset: 15, size: 17, front: true }],
  frames: [
    { torso: -97.7, head: -95, thigh: 82.3, shin: 82.3, foot: 20, upper: 100, fore: 95 },
    { torso: -120, head: -105, thigh: 65.5, shin: 127.7, foot: 60, upper: 100, fore: 95 },
  ],
}

const calfStand: Figure = {
  view: 'side', work: ['calves'], props: [], period: 1800,
  frames: [{ ...STAND, upper: 180, fore: 180 }, { ...STAND, foot: 150, foot2: 150, upper: 180, fore: 180 }],
}
const calfBarbell: Figure = { ...calfStand, props: [backBar], frames: [{ ...STAND, ...armsOnBar }, { ...STAND, foot: 150, ...armsOnBar }] }
const calfDumbbell: Figure = { ...calfStand, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const calfSeated: Figure = {
  view: 'side', work: ['calves'], anchor: { joint: 'hip', at: [92, 150] }, period: 1800,
  props: [{ type: 'seat', span: [66, 140], y: 162 }, { type: 'pad', at: 'knee', angle: 0, offset: 12, front: true }],
  frames: [
    { torso: 2, thigh: 90, shin: 180, foot: 80, upper: 150, fore: 100 },
    { torso: 2, thigh: 90, shin: 180, foot: 130, upper: 150, fore: 100, lift: 10 },
  ],
}

// ---------------------------------------------------------------- empuje
const LYING = { torso: -90, head: -90, thigh: 100, shin: 178, foot: 95 }
const flatBench: Prop = { type: 'bench', span: [34, 150], y: 168 }
const benchPress: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'hip', at: [128, 158] }, shadow: 100,
  props: [flatBench, { type: 'plate', at: 'wrist', front: true, size: 28 }],
  frames: [{ ...LYING, upper: 2, fore: 0 }, { ...LYING, upper: 110, fore: -2 }],
}
const benchDumbbell: Figure = { ...benchPress, props: [flatBench, { type: 'dumbbell', at: 'wrist', front: true }] }
const benchBand: Figure = { ...benchPress, props: [flatBench, { type: 'band', at: 'wrist', to: 'shoulder' }] }
const incline: Figure = {
  view: 'side', work: ['chest', 'shoulders'], anchor: { joint: 'hip', at: [138, 160] }, shadow: 100,
  props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'plate', at: 'wrist', front: true, size: 28 }],
  frames: [{ ...LYING, torso: -58, head: -58, upper: 5, fore: 2 }, { ...LYING, torso: -58, head: -58, upper: 125, fore: 0 }],
}
const inclineDumbbell: Figure = { ...incline, props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'dumbbell', at: 'wrist', front: true }] }
const floorPress: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'hip', at: [128, 206] }, shadow: 110,
  props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [{ torso: -90, head: -90, thigh: 55, shin: 150, foot: 95, upper: 2, fore: 0 }, { torso: -90, head: -90, thigh: 55, shin: 150, foot: 95, upper: 118, fore: 0 }],
}
const flyes: Figure = {
  ...benchDumbbell, work: ['chest'],
  frames: [{ ...LYING, upper: 2, fore: 5 }, { ...LYING, upper: 125, fore: 118 }],
}
const inclineFlyes: Figure = {
  ...inclineDumbbell, work: ['chest'],
  frames: [{ ...LYING, torso: -58, head: -58, upper: 5, fore: 8 }, { ...LYING, torso: -58, head: -58, upper: 135, fore: 125 }],
}

const PUSH_UP = { torso: 73.1, head: 78, thigh: -106.9, shin: -106.9, foot: 180 }
const pushUp: Figure = {
  // Manos y puntas de los pies fijas; el cuerpo, recto, gira sobre las puntas.
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'toe', at: [17, 219] }, shadow: 110,
  props: [],
  frames: [
    { torso: 73.1, head: 78, thigh: -106.9, shin: -106.9, foot: 180, upper: 180, fore: 180 },
    { torso: 87, head: 88, thigh: -93, shin: -93, foot: 180, upper: -106, fore: 122 },
  ],
}
const declinePushUp: Figure = {
  ...pushUp, work: ['chest', 'shoulders'], anchor: { joint: 'toe', at: [37, 142] },
  props: [{ type: 'box', span: [2, 58], y: 146 }],
  frames: [
    { torso: 100, head: 100, thigh: -80, shin: -80, foot: 180, upper: 180, fore: 180 },
    { torso: 109.5, head: 108, thigh: -70.5, shin: -70.5, foot: 180, upper: -140, fore: 114 },
  ],
}

const dips: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'wrist', at: [140, 84] },
  props: [{ type: 'bar', span: [120, 175], y: 88 }],
  frames: [
    { torso: 14, head: 10, thigh: 185, shin: -150, foot: 180, upper: 185, fore: 180 },
    { torso: 30, head: 25, thigh: 190, shin: -145, foot: 180, upper: -125, fore: 150 },
  ],
}
const dipsTriceps: Figure = {
  ...dips, work: ['arms'],
  frames: [
    { torso: 2, thigh: 182, shin: -155, foot: 180, upper: 180, fore: 180 },
    { torso: 8, thigh: 184, shin: -150, foot: 180, upper: -130, fore: 160 },
  ],
}
const benchDips: Figure = {
  // Manos en el borde del banco y cadera por delante; los pies no se mueven.
  view: 'side', work: ['arms'], anchor: { joint: 'wrist', at: [70, 168] },
  props: [{ type: 'bench', span: [6, 74], y: 170 }],
  frames: [
    { torso: -12, head: 0, thigh: 118.2, shin: 119.8, foot: 60, upper: 175, fore: 180 },
    { torso: -8, head: 0, thigh: 78.4, shin: 155.8, foot: 80, upper: -122, fore: 165 },
  ],
}

const cableCross: Figure = {
  view: 'front', work: ['chest'], props: [
    { type: 'cable', at: 'wrist', point: [236, 40] }, { type: 'cable', at: 'wrist2', point: [24, 40] },
  ],
  frames: [
    { torso: 0, thigh: 175, shin: 180, upper: 72, fore: 95 },
    { torso: 0, thigh: 175, shin: 180, upper: 150, fore: 200 },
  ],
}
const pecDeck: Figure = {
  ...cableCross, props: [],
  frames: [
    { torso: 0, thigh: 175, shin: 180, upper: 90, fore: 20 },
    { torso: 0, thigh: 175, shin: 180, upper: 150, fore: -30 },
  ],
}
const bandCross: Figure = { ...cableCross, props: [] }

const overheadPress: Figure = {
  view: 'side', work: ['shoulders', 'arms'], props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }],
  frames: [{ ...STAND, upper: 158, fore: 8 }, { ...STAND, upper: 2, fore: 0 }],
}
const overheadDumbbell: Figure = { ...overheadPress, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const overheadBand: Figure = { ...overheadPress, props: [{ type: 'band', at: 'wrist', to: 'ankle' }] }
const seatedPress: Figure = {
  view: 'side', work: ['shoulders', 'arms'], anchor: { joint: 'hip', at: [110, 150] },
  props: [{ type: 'seat', span: [86, 146], y: 162, back: [80, 60, 100] }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ torso: 0, thigh: 90, shin: 180, foot: 90, upper: 158, fore: 8 }, { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 2, fore: 0 }],
}
const floorSeatedPress: Figure = {
  view: 'side', work: ['shoulders', 'core'], anchor: { joint: 'hip', at: [90, 208] }, shadow: 100,
  props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [{ torso: 0, thigh: 90, shin: 90, foot: 0, upper: 158, fore: 8 }, { torso: 0, thigh: 90, shin: 90, foot: 0, upper: 2, fore: 0 }],
}
const handstandPushUp: Figure = {
  view: 'side', work: ['shoulders', 'arms'], anchor: { joint: 'wrist', at: [130, 218] },
  props: [{ type: 'box', span: [141, 158], y: -34 }],
  frames: [
    { torso: 180, head: 180, thigh: 2, shin: 2, foot: 90, upper: 180, fore: 180 },
    { torso: 175, head: 175, thigh: 5, shin: 5, foot: 90, upper: 135, fore: 205 },
  ],
}
const lateralRaise: Figure = {
  view: 'front', work: ['shoulders'], props: [{ type: 'dumbbell', at: 'wrist', front: true }, { type: 'dumbbell', at: 'wrist2', front: true }],
  frames: [{ torso: 0, thigh: 176, shin: 180, upper: 172, fore: 174 }, { torso: 0, thigh: 176, shin: 180, upper: 92, fore: 96 }],
}
const lateralBand: Figure = { ...lateralRaise, props: [{ type: 'band', at: 'wrist', to: 'ankle' }, { type: 'band', at: 'wrist2', to: 'ankle2' }] }
const lateralCable: Figure = { ...lateralRaise, props: [{ type: 'cable', at: 'wrist', point: [60, 214] }] }
const uprightRow: Figure = {
  view: 'front', work: ['shoulders', 'back'], props: [{ type: 'band', at: 'wrist', to: 'ankle' }, { type: 'band', at: 'wrist2', to: 'ankle2' }],
  frames: [{ torso: 0, thigh: 176, shin: 180, upper: 186, fore: 190 }, { torso: 0, thigh: 176, shin: 180, upper: 112, fore: 215 }],
}
const facePull: Figure = {
  view: 'side', work: ['shoulders', 'back'], props: [{ type: 'cable', at: 'wrist', point: [246, 70] }],
  frames: [{ ...STAND, thigh: 172, shin: 186, upper: 88, fore: 88 }, { ...STAND, thigh: 172, shin: 186, upper: -75, fore: 40 }],
}
const tricepsPushdown: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'cable', at: 'wrist', point: [186, 18] }],
  frames: [{ ...STAND, torso: 8, upper: 172, fore: 80 }, { ...STAND, torso: 8, upper: 172, fore: 176 }],
}
const overheadTriceps: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...STAND, upper: 5, fore: -170 }, { ...STAND, upper: 5, fore: 3 }],
}
const skullCrusher: Figure = {
  ...benchPress, work: ['arms'], props: [flatBench, { type: 'plate', at: 'wrist', front: true, size: 24 }],
  frames: [{ ...LYING, upper: -8, fore: -5 }, { ...LYING, upper: -8, fore: -118 }],
}
const skullCrusherBand: Figure = { ...skullCrusher, props: [flatBench, { type: 'band', at: 'wrist', point: [10, 150] }] }

// ---------------------------------------------------------------- tirón
const pullUp: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'wrist', at: [132, -16] },
  props: [{ type: 'bar', span: [80, 190], y: -18 }],
  frames: [
    { torso: 2, head: 0, thigh: 184, shin: -165, foot: 180, upper: 2, fore: 0 },
    { torso: -8, head: 0, thigh: 186, shin: -160, foot: 180, upper: 160, fore: 12 },
  ],
}
const pullUpBand: Figure = { ...pullUp, props: [...pullUp.props, { type: 'band', at: 'knee', point: [132, -16] }] }
const scapularPull: Figure = { ...pullUp, work: ['back'], frames: [pullUp.frames[0], { ...pullUp.frames[0], upper: 6, fore: 3, lift: 8 }] }
const pulldown: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'hip', at: [110, 150] },
  props: [{ type: 'seat', span: [86, 146], y: 162 }, { type: 'cable', at: 'wrist', point: [120, 4] }, { type: 'pad', at: 'knee', angle: 0, offset: 12 }],
  frames: [
    { torso: -12, head: 0, thigh: 90, shin: 180, foot: 90, upper: 8, fore: 4 },
    { torso: -18, head: -5, thigh: 90, shin: 180, foot: 90, upper: 168, fore: 18 },
  ],
}
const barbellRow: Figure = {
  view: 'side', work: ['back', 'arms'], props: [{ type: 'plate', at: 'wrist', front: true }],
  frames: [
    { torso: 68, head: 78, thigh: 162, shin: 186, foot: 90, upper: 180, fore: 180 },
    { torso: 68, head: 78, thigh: 162, shin: 186, foot: 90, upper: -128, fore: 172 },
  ],
}
const dumbbellRow: Figure = { ...barbellRow, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const kettlebellRow: Figure = { ...barbellRow, props: [{ type: 'kettlebell', at: 'wrist', front: true }] }
const oneArmRow: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'wrist2', at: [178, 168] },
  props: [{ type: 'bench', span: [90, 200], y: 170 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 82, head: 85, thigh: 178, shin: 182, thigh2: 180, shin2: -90, foot: 90, upper: 180, fore: 180, upper2: 180, fore2: 180 },
    { torso: 82, head: 85, thigh: 178, shin: 182, thigh2: 180, shin2: -90, foot: 90, upper: -125, fore: 172, upper2: 180, fore2: 180 },
  ],
}
const seatedRow: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'hip', at: [80, 196] }, shadow: 100,
  props: [{ type: 'seat', span: [56, 110], y: 206 }, { type: 'cable', at: 'wrist', point: [236, 186] }],
  frames: [
    { torso: 12, head: 20, thigh: 82, shin: 96, foot: 0, upper: 88, fore: 90 },
    { torso: -4, head: 0, thigh: 82, shin: 96, foot: 0, upper: 200, fore: 88 },
  ],
}
const invertedRow: Figure = {
  // Talones en el suelo y manos en la barra; el cuerpo, recto, gira sobre los talones.
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'ankle', at: [224, 217] }, shadow: 110,
  props: [{ type: 'bar', span: [44, 104], y: 92 }],
  frames: [
    { torso: -68, head: -60, thigh: 112, shin: 112, foot: 20, upper: 0, fore: 0 },
    { torso: -50.9, head: -45, thigh: 129.1, shin: 129.1, foot: 20, upper: -103.8, fore: 15.4 },
  ],
}
const highPull: Figure = {
  view: 'side', work: ['back', 'shoulders', 'legs'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [
    { ...DEADLIFT_LOW, torso: 45, thigh: 115, shin: 200 },
    { ...STAND, upper: -60, fore: 150 },
  ],
}

const curlDumbbell: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...STAND, upper: 176, fore: 176 }, { ...STAND, upper: 174, fore: 22 }],
}
const curlBarbell: Figure = { ...curlDumbbell, props: [{ type: 'plate', at: 'wrist', front: true, size: 22 }] }
const curlCable: Figure = { ...curlDumbbell, props: [{ type: 'cable', at: 'wrist', point: [196, 214] }] }
const curlBand: Figure = { ...curlDumbbell, props: [{ type: 'band', at: 'wrist', to: 'ankle' }] }

// ---------------------------------------------------------------- tronco y otros
const crunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [128, 208] }, shadow: 110,
  props: [],
  frames: [
    { torso: -90, head: -90, thigh: 45, shin: 150, foot: 95, upper: 60, fore: -120 },
    { torso: -58, head: -40, thigh: 45, shin: 150, foot: 95, upper: 92, fore: -88 },
  ],
}
const plank: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'elbow', at: [178, 216] }, shadow: 110, period: 4000,
  props: [],
  frames: [
    { torso: 88, head: 88, thigh: -92, shin: -92, foot: 180, upper: 180, fore: 90 },
    { torso: 87, head: 86, thigh: -93, shin: -93, foot: 180, upper: 180, fore: 90 },
  ],
}
const hangingLegRaise: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'wrist', at: [120, -16] },
  props: [{ type: 'bar', span: [70, 180], y: -18 }],
  frames: [
    { torso: 0, thigh: 180, shin: 180, foot: 150, upper: 2, fore: 0 },
    { torso: -8, thigh: 90, shin: 90, foot: 60, upper: 8, fore: 4 },
  ],
}
const deadBug: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [140, 208] }, shadow: 110,
  props: [],
  frames: [
    { torso: -90, head: -90, thigh: 0, shin: 90, thigh2: 0, shin2: 90, foot: 0, upper: 0, fore: 0, upper2: 0, fore2: 0 },
    { torso: -90, head: -90, thigh: 0, shin: 90, thigh2: 85, shin2: 88, foot: 0, upper: -85, fore: -88, upper2: 0, fore2: 0 },
  ],
}
const mountainClimbers: Figure = {
  ...pushUp, work: ['core', 'legs'], period: 1200, anchor: { joint: 'wrist', at: [176, 218] },
  frames: [
    { ...PUSH_UP, torso: 76, thigh: 125, shin: -95, thigh2: -104, shin2: -104, upper: 180, fore: 180 },
    { ...PUSH_UP, torso: 76, thigh: -104, shin: -104, thigh2: 125, shin2: -95, upper: 180, fore: 180 },
  ],
}
const boxJump: Figure = {
  view: 'side', work: ['legs', 'glutes', 'calves'], anchor: { joint: 'ankle', at: [96, 216] }, period: 2200, arc: 45,
  props: [{ type: 'box', span: [150, 236], y: 166 }],
  frames: [{ ...SQUAT, torso: 35, upper: -150, fore: -160 }, { ...SQUAT, torso: 25, thigh: 110, shin: 200, upper: 60, fore: 70, lift: 50, shift: 92 }],
}
const farmersWalk: Figure = {
  view: 'side', work: ['forearms', 'back', 'legs'], props: [{ type: 'kettlebell', at: 'wrist', front: true }], period: 1400,
  frames: [
    { torso: 2, thigh: 160, shin: 185, thigh2: -165, shin2: -160, foot: 90, foot2: 120, upper: 180, fore: 180 },
    { torso: 2, thigh: -165, shin: -160, thigh2: 160, shin2: 185, foot: 120, foot2: 90, upper: 180, fore: 180 },
  ],
}

export const FIGURES: Record<string, Figure> = {
  Barbell_Full_Squat: squatBarbell,
  Front_Barbell_Squat: squatFront,
  Dumbbell_Squat: squatDumbbells,
  Goblet_Squat: squatGoblet,
  'Squats_-_With_Bands': squatBand,
  Bodyweight_Squat: squatBodyweight,
  Freehand_Jump_Squat: jumpSquat,
  Split_Squats: lungeBodyweight,
  Barbell_Deadlift: deadlift,
  Romanian_Deadlift: rdl,
  'Stiff-Legged_Dumbbell_Deadlift': rdlDumbbell,
  Band_Good_Morning: goodMorningBand,
  'One-Arm_Kettlebell_Swings': swing,
  Barbell_Hip_Thrust: hipThrust,
  Single_Leg_Glute_Bridge: gluteBridge,
  Leg_Press: legPress,
  Barbell_Walking_Lunge: lungeBarbell,
  Barbell_Lunge: lungeBarbell,
  Dumbbell_Lunges: lungeDumbbells,
  Bodyweight_Walking_Lunge: lungeBodyweight,
  Lunge_Pass_Through: lungePass,
  Split_Squat_with_Dumbbells: bulgarian,
  Dumbbell_Step_Ups: stepUp,
  Lying_Leg_Curls: lyingLegCurl,
  Seated_Leg_Curl: seatedLegCurl,
  Ball_Leg_Curl: ballLegCurl,
  'Floor_Glute-Ham_Raise': nordic,
  Leg_Extensions: legExtension,
  'Single-Leg_Leg_Extension': legExtension,
  Standing_Calf_Raises: calfBarbell,
  Standing_Barbell_Calf_Raise: calfBarbell,
  Standing_Dumbbell_Calf_Raise: calfDumbbell,
  Seated_Calf_Raise: calfSeated,
  'Calf_Raises_-_With_Bands': calfStand,
  'Barbell_Bench_Press_-_Medium_Grip': benchPress,
  Dumbbell_Bench_Press: benchDumbbell,
  'Bench_Press_-_With_Bands': benchBand,
  'Barbell_Incline_Bench_Press_-_Medium_Grip': incline,
  Incline_Dumbbell_Press: inclineDumbbell,
  Alternating_Floor_Press: floorPress,
  'One-Arm_Kettlebell_Floor_Press': floorPress,
  Dumbbell_Flyes: flyes,
  Incline_Dumbbell_Flyes: inclineFlyes,
  Pushups: pushUp,
  'Push-Up_Wide': pushUp,
  'Push-Ups_-_Close_Triceps_Position': { ...pushUp, work: ['arms', 'chest'] },
  'Decline_Push-Up': declinePushUp,
  'Dips_-_Chest_Version': dips,
  'Dips_-_Triceps_Version': dipsTriceps,
  Bench_Dips: benchDips,
  Cable_Crossover: cableCross,
  Butterfly: pecDeck,
  'Cross_Over_-_With_Bands': bandCross,
  Barbell_Shoulder_Press: overheadPress,
  Dumbbell_Shoulder_Press: overheadDumbbell,
  'Shoulder_Press_-_With_Bands': overheadBand,
  Seated_Dumbbell_Press: seatedPress,
  Kettlebell_Seated_Press: floorSeatedPress,
  Kettlebell_Arnold_Press: { ...overheadDumbbell, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] },
  'Handstand_Push-Ups': handstandPushUp,
  Side_Lateral_Raise: lateralRaise,
  Seated_Side_Lateral_Raise: lateralRaise,
  'Lateral_Raise_-_With_Bands': lateralBand,
  Cable_Seated_Lateral_Raise: lateralCable,
  'Upright_Row_-_With_Bands': uprightRow,
  Face_Pull: facePull,
  Triceps_Pushdown: tricepsPushdown,
  Standing_Dumbbell_Triceps_Extension: overheadTriceps,
  Lying_Triceps_Press: skullCrusher,
  Band_Skull_Crusher: skullCrusherBand,
  Pullups: pullUp,
  'Chin-Up': pullUp,
  'Band_Assisted_Pull-Up': pullUpBand,
  'Scapular_Pull-Up': scapularPull,
  'Wide-Grip_Lat_Pulldown': pulldown,
  'Full_Range-Of-Motion_Lat_Pulldown': pulldown,
  'Close-Grip_Front_Lat_Pulldown': pulldown,
  Bent_Over_Barbell_Row: barbellRow,
  'Bent_Over_Two-Dumbbell_Row': dumbbellRow,
  'Two-Arm_Kettlebell_Row': kettlebellRow,
  'One-Arm_Dumbbell_Row': oneArmRow,
  Seated_Cable_Rows: seatedRow,
  Inverted_Row: invertedRow,
  Kettlebell_Sumo_High_Pull: highPull,
  Barbell_Curl: curlBarbell,
  'EZ-Bar_Curl': curlBarbell,
  Dumbbell_Bicep_Curl: curlDumbbell,
  Hammer_Curls: curlDumbbell,
  Alternate_Hammer_Curl: curlDumbbell,
  Standing_Biceps_Cable_Curl: curlCable,
  'Cable_Hammer_Curls_-_Rope_Attachment': curlCable,
  'Close-Grip_EZ-Bar_Curl_with_Band': curlBand,
  Crunches: crunch,
  Plank: plank,
  Hanging_Leg_Raise: hangingLegRaise,
  Dead_Bug: deadBug,
  Mountain_Climbers: mountainClimbers,
  Box_Jump_Multiple_Response: boxJump,
  Farmers_Walk: farmersWalk,
}

export { FLOOR }
