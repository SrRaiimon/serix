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
  /** Subida de hombros (encogimientos), en píxeles. */
  shrug?: number
  /** Escorzo del muslo y del tronco (1 = longitud normal); de frente, sentado o inclinado. */
  thighLen?: number
  torsoLen?: number
}

export interface Prop {
  type: 'plate' | 'dumbbell' | 'kettlebell' | 'bench' | 'box' | 'bar' | 'cable' | 'band' | 'pad' | 'seat' | 'platform' | 'grip' | 'rest' | 'barFront'
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

// Salida con el disco apoyado en el suelo, la barra pegada a la espinilla y la cadera sobre la rodilla.
const DEADLIFT_LOW = { torso: 59, head: 71, thigh: 105, shin: 202, foot: 90, upper: 180, fore: 180 }
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
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'wrist', at: [132, -62] },
  props: [{ type: 'bar', span: [80, 190], y: -64 }],
  frames: [
    { torso: 2, head: 0, thigh: 184, shin: -165, foot: 180, upper: 2, fore: 0 },
    { torso: -8, head: 0, thigh: 186, shin: -160, foot: 180, upper: 160, fore: 12 },
  ],
}
const pullUpBand: Figure = { ...pullUp, props: [...pullUp.props, { type: 'band', at: 'knee', point: [132, -62] }] }
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
  view: 'side', work: ['core'], anchor: { joint: 'wrist', at: [120, -62] },
  props: [{ type: 'bar', span: [70, 180], y: -64 }],
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


// ---------------------------------------------------------------- variantes (mismo movimiento, otro material)
const goodMorningBar: Figure = { ...goodMorningBand, props: [backBar] }
const floorPressBar: Figure = { ...floorPress, props: [{ type: 'plate', at: 'wrist', front: true, size: 24 }] }
const floorPressDumbbell: Figure = { ...floorPress, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const oneArmRowKettlebell: Figure = { ...oneArmRow, props: [{ type: 'bench', span: [90, 200], y: 170 }, { type: 'kettlebell', at: 'wrist', front: true }] }
const uprightDumbbell: Figure = { ...uprightRow, props: [{ type: 'dumbbell', at: 'wrist', front: true }, { type: 'dumbbell', at: 'wrist2', front: true }] }
const overheadTricepsKettlebell: Figure = { ...overheadTriceps, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] }
const overheadTricepsBar: Figure = { ...overheadTriceps, props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }] }
const skullCrusherDumbbell: Figure = { ...skullCrusher, props: [flatBench, { type: 'dumbbell', at: 'wrist', front: true }] }
const sitUp: Figure = {
  ...crunch,
  frames: [crunch.frames[0], { ...crunch.frames[1], torso: -15, head: 0, upper: 150, fore: -60 }],
}
const standingPressKettlebell: Figure = { ...overheadDumbbell, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] }


// ---------------------------------------------------------------- variantes con su propio material o vista
// Sentadilla a un cajón o silla: el asiento queda justo bajo la cadera en la posición baja.
const boxBehind: Prop = { type: 'box', span: [58, 104], y: 180 }
const squatBox: Figure = { ...squatBarbell, props: [boxBehind, backBar] }
const squatChair: Figure = { ...squatBodyweight, props: [{ type: 'seat', span: [58, 108], y: 180, back: [56, 110, 70] }] }
const squatToBench: Figure = { ...squatDumbbells, props: [{ type: 'bench', span: [40, 104], y: 180 }, { type: 'dumbbell', at: 'wrist', front: true }] }

// Peso muerto en déficit: de pie sobre una plataforma, con los discos en el suelo (hay que bajar más).
const deficitPlatform: Prop = { type: 'box', span: [104, 164], y: 210 }
const deadliftDeficit: Figure = {
  view: 'side', work: ['back', 'glutes', 'legs'], anchor: { joint: 'ankle', at: [130, 205] },
  props: [deficitPlatform, { type: 'plate', at: 'wrist', front: true }],
  frames: [{ torso: 58, head: 70, thigh: 95, shin: 212, foot: 90, upper: 180, fore: 180 }, { ...STAND, upper: 180, fore: 180 }],
}
const rdlDeficit: Figure = {
  ...deadliftDeficit, work: ['legs', 'glutes'],
  frames: [{ ...STAND, upper: 180, fore: 180 }, RDL_LOW],
}
// Rack pull: la barra sale de los topes del rack a la altura de la rodilla.
const rackPull: Figure = {
  view: 'side', work: ['back', 'glutes', 'legs'],
  props: [{ type: 'bar', span: [150, 172], y: 166 }, { type: 'plate', at: 'wrist', front: true }],
  frames: [{ torso: 47, head: 60, thigh: 125, shin: 210, foot: 90, upper: 180, fore: 180 }, { ...STAND, upper: 180, fore: 180 }],
}

// Vista de frente: sentadilla abierta (plié) y peso muerto sumo, con las piernas abiertas y las
// rodillas hacia fuera, que de perfil no se aprecian.
const plieSquat: Figure = {
  view: 'front', work: ['legs', 'glutes'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 0, thigh: 158, shin: 182, upper: 190, fore: 196 },
    { torso: 0, torsoLen: 0.95, thigh: 118, shin: 172, upper: 190, fore: 196 },
  ],
}
const sumoDeadlift: Figure = {
  view: 'front', work: ['glutes', 'legs', 'back'], props: [{ type: 'barFront', front: true }],
  frames: [
    { torso: 0, torsoLen: 0.7, head: 0, thigh: 122, shin: 170, upper: 180, fore: 180 },
    { torso: 0, thigh: 156, shin: 180, upper: 180, fore: 180 },
  ],
}

// Encogimientos de hombros, de frente: solo suben los hombros.
const SHRUG_STAND = { torso: 0, thigh: 176, shin: 180, upper: 180, fore: 180 }
const shrugBarbell: Figure = { view: 'front', work: ['back'], props: [{ type: 'barFront', front: true }], period: 1800, frames: [SHRUG_STAND, { ...SHRUG_STAND, shrug: 10 }] }
const shrugDumbbell: Figure = { ...shrugBarbell, props: [{ type: 'dumbbell', at: 'wrist', front: true }, { type: 'dumbbell', at: 'wrist2', front: true }] }
const shrugCable: Figure = { ...shrugBarbell, props: [{ type: 'cable', at: 'wrist', point: [130, 222] }, { type: 'barFront', front: true }] }
const uprightBarbell: Figure = { ...uprightRow, props: [{ type: 'barFront', front: true }] }
const uprightCable: Figure = { ...uprightRow, props: [{ type: 'cable', at: 'wrist', point: [130, 222] }, { type: 'barFront', front: true }] }

// Sentado visto de frente: el muslo apunta al espectador (escorzo) y el asiento queda detrás.
const SEATED_FRONT = { torso: 0, thigh: 180, thighLen: 0.3, shin: 180 }
const seatFront: Prop = { type: 'box', span: [96, 184], y: 158 }
const lateralSeated: Figure = {
  ...lateralRaise, anchor: { joint: 'hip', at: [140, 150] }, props: [seatFront, ...lateralRaise.props],
  frames: [{ ...SEATED_FRONT, upper: 172, fore: 174 }, { ...SEATED_FRONT, upper: 92, fore: 96 }],
}
const lateralSeatedCable: Figure = { ...lateralSeated, props: [seatFront, { type: 'cable', at: 'wrist', point: [60, 214] }] }
const pecDeckSeated: Figure = {
  ...pecDeck, anchor: { joint: 'hip', at: [140, 150] }, props: [seatFront],
  frames: [{ ...SEATED_FRONT, upper: 90, fore: 20 }, { ...SEATED_FRONT, upper: 150, fore: -30 }],
}

// Aperturas en polea: el cable sale del suelo junto al banco en lugar de mancuernas.
const flyesCable: Figure = { ...flyes, props: [flatBench, { type: 'cable', at: 'wrist', point: [64, 216] }, { type: 'grip', at: 'wrist', front: true }] }
const inclineFlyesCable: Figure = { ...inclineFlyes, props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'cable', at: 'wrist', point: [84, 216] }, { type: 'grip', at: 'wrist', front: true }] }

// Gemelos en un escalón: la punta del pie apoyada en el borde y el talón bajando por debajo de él.
const CALF_STEP_LOW = { ...STAND, foot: 60 }
const CALF_STEP_HIGH = { ...STAND, foot: 135 }
const calfStepMachine: Figure = {
  view: 'side', work: ['calves'], anchor: { joint: 'toe', at: [150, 204] }, period: 1800,
  props: [{ type: 'box', span: [140, 198], y: 207 }],
  frames: [{ ...CALF_STEP_LOW, upper: 165, fore: 12 }, { ...CALF_STEP_HIGH, upper: 165, fore: 12 }],
}
const calfStepBar: Figure = { ...calfStepMachine, props: [{ type: 'box', span: [140, 198], y: 207 }, backBar], frames: [{ ...CALF_STEP_LOW, ...armsOnBar }, { ...CALF_STEP_HIGH, ...armsOnBar }] }
const calfStepBodyweight: Figure = { ...calfStepMachine, props: [{ type: 'box', span: [140, 198], y: 207 }], frames: [{ ...CALF_STEP_LOW, upper: 180, fore: 180 }, { ...CALF_STEP_HIGH, upper: 180, fore: 180 }] }
const calfBand: Figure = { ...calfStand, props: [{ type: 'band', at: 'wrist', to: 'toe' }], frames: [{ ...STAND, upper: 170, fore: 12 }, { ...STAND, foot: 150, foot2: 150, upper: 170, fore: 12 }] }


// ---------------------------------------------------------------- a un brazo, a una pierna y alternos
/** A un brazo: el brazo lejano se queda quieto en la postura indicada. */
function oneArm(f: Figure, upper2: number, fore2: number): Figure {
  return { ...f, frames: f.frames.map((p) => ({ ...p, upper2, fore2 })) as [Pose, Pose] }
}
/** Alterno: el brazo lejano hace el mismo movimiento a contratiempo. */
function alternate(f: Figure): Figure {
  const [a, b] = f.frames
  return { ...f, frames: [{ ...a, upper2: b.upper, fore2: b.fore }, { ...b, upper2: a.upper, fore2: a.fore }] }
}
const curlAlternate = alternate(curlDumbbell)
const curlCableOneArm = oneArm(curlCable, 180, 180)
const overheadAlternate = alternate(overheadDumbbell)
const overheadOneArm = oneArm(overheadDumbbell, 180, 180)
const kettlebellPressAlternate = alternate(standingPressKettlebell)
const kettlebellRowAlternate = alternate(kettlebellRow)
const lateralOneArm = oneArm(lateralRaise, 172, 174)
const lateralCableOneArm = oneArm(lateralCable, 172, 174)
const lateralSeatedCableOneArm = oneArm(lateralSeatedCable, 172, 174)
const pushdownOneArm = oneArm(tricepsPushdown, 180, 180)
const overheadTricepsOneArm = oneArm(overheadTriceps, 180, 180)
const pulldownOneArm = oneArm(pulldown, 150, 150)
const seatedRowOneArm = oneArm(seatedRow, 150, 120)
const floorPressOneArm = oneArm(floorPress, 100, 60)
const floorPressBarOneArm = oneArm(floorPressBar, 100, 60)
const legExtensionOneLeg: Figure = { ...legExtension, frames: legExtension.frames.map((p) => ({ ...p, thigh2: 90, shin2: 185 })) as [Pose, Pose] }

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
  'Single-Leg_Leg_Extension': legExtensionOneLeg,
  Standing_Calf_Raises: calfStepMachine,
  Standing_Barbell_Calf_Raise: calfStepBar,
  Standing_Dumbbell_Calf_Raise: calfDumbbell,
  Seated_Calf_Raise: calfSeated,
  'Calf_Raises_-_With_Bands': calfBand,
  'Barbell_Bench_Press_-_Medium_Grip': benchPress,
  Dumbbell_Bench_Press: benchDumbbell,
  'Bench_Press_-_With_Bands': benchBand,
  'Barbell_Incline_Bench_Press_-_Medium_Grip': incline,
  Incline_Dumbbell_Press: inclineDumbbell,
  Alternating_Floor_Press: floorPressOneArm,
  'One-Arm_Kettlebell_Floor_Press': floorPressOneArm,
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
  Butterfly: pecDeckSeated,
  'Cross_Over_-_With_Bands': bandCross,
  Barbell_Shoulder_Press: overheadPress,
  Dumbbell_Shoulder_Press: overheadDumbbell,
  'Shoulder_Press_-_With_Bands': overheadBand,
  Seated_Dumbbell_Press: seatedPress,
  Kettlebell_Seated_Press: floorSeatedPress,
  Kettlebell_Arnold_Press: { ...overheadDumbbell, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] },
  'Handstand_Push-Ups': handstandPushUp,
  Side_Lateral_Raise: lateralRaise,
  Seated_Side_Lateral_Raise: lateralSeated,
  'Lateral_Raise_-_With_Bands': lateralBand,
  Cable_Seated_Lateral_Raise: lateralSeatedCableOneArm,
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
  Alternate_Hammer_Curl: curlAlternate,
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
  Upright_Cable_Row: uprightCable,
  Smith_Machine_Upright_Row: uprightBarbell,
  Upright_Barbell_Row: uprightBarbell,
  Cable_Shrugs: shrugCable,
  Dumbbell_Shrug: shrugDumbbell,
  Leverage_Shrug: shrugBarbell,
  Smith_Machine_Behind_the_Back_Shrug: shrugBarbell,
  Barbell_Shrug_Behind_The_Back: shrugBarbell,
  Barbell_Shrug: shrugBarbell,
  Rack_Pull_with_Bands: rackPull,
  Reverse_Band_Box_Squat: squatBox,
  Barbell_Squat: squatBarbell,
  Box_Squat: squatBox,
  Narrow_Stance_Squats: squatBarbell,
  Wide_Stance_Barbell_Squat: squatBarbell,
  Olympic_Squat: squatBarbell,
  Smith_Machine_Squat: squatBarbell,
  Squat_with_Bands: squatBarbell,
  Squat_with_Chains: squatBarbell,
  Speed_Box_Squat: squatBox,
  Front_Squat_Clean_Grip: squatFront,
  Dumbbell_Squat_To_A_Bench: squatToBench,
  Plie_Dumbbell_Squat: plieSquat,
  Front_Squats_With_Two_Kettlebells: squatGoblet,
  Chair_Squat: squatChair,
  Rocket_Jump: jumpSquat,
  Deficit_Deadlift: deadliftDeficit,
  Clean_Deadlift: deadlift,
  Snatch_Deadlift: deadlift,
  Sumo_Deadlift: sumoDeadlift,
  Sumo_Deadlift_with_Bands: sumoDeadlift,
  Sumo_Deadlift_with_Chains: sumoDeadlift,
  Leverage_Deadlift: deadlift,
  Rack_Pulls: rackPull,
  'Stiff-Legged_Barbell_Deadlift': rdl,
  Romanian_Deadlift_from_Deficit: rdlDeficit,
  Wide_Stance_Stiff_Legs: rdl,
  'Smith_Machine_Stiff-Legged_Deadlift': rdl,
  Good_Morning: goodMorningBar,
  Stiff_Leg_Barbell_Good_Morning: goodMorningBar,
  Narrow_Stance_Leg_Press: legPress,
  Dumbbell_Rear_Lunge: lungeDumbbells,
  'Smith_Single-Leg_Split_Squat': lungeBarbell,
  Elevated_Back_Lunge: lungeBarbell,
  Smith_Machine_Calf_Raise: calfStepBar,
  Rocking_Standing_Calf_Raise: calfBarbell,
  Calf_Raise_On_A_Dumbbell: calfStepBodyweight,
  Barbell_Seated_Calf_Raise: calfSeated,
  'Dumbbell_Seated_One-Leg_Calf_Raise': calfSeated,
  'Wide-Grip_Barbell_Bench_Press': benchPress,
  'Bench_Press_-_Powerlifting': benchPress,
  Smith_Machine_Bench_Press: benchPress,
  'Close-Grip_Barbell_Bench_Press': benchPress,
  Board_Press: benchPress,
  Pin_Presses: benchPress,
  Reverse_Band_Bench_Press: benchPress,
  Neck_Press: benchPress,
  Barbell_Guillotine_Bench_Press: benchPress,
  'Smith_Machine_Close-Grip_Bench_Press': benchPress,
  Reverse_Triceps_Bench_Press: benchPress,
  Dumbbell_Bench_Press_with_Neutral_Grip: benchDumbbell,
  One_Arm_Dumbbell_Bench_Press: benchDumbbell,
  'Close-Grip_Dumbbell_Press': benchDumbbell,
  Smith_Machine_Incline_Bench_Press: incline,
  Hammer_Grip_Incline_DB_Bench_Press: inclineDumbbell,
  Incline_Dumbbell_Bench_With_Palms_Facing_In: inclineDumbbell,
  Floor_Press: floorPressBar,
  Floor_Press_with_Chains: floorPressBar,
  One_Arm_Floor_Press: floorPressBarOneArm,
  Dumbbell_Floor_Press: floorPressDumbbell,
  'One-Arm_Flat_Bench_Dumbbell_Flye': flyes,
  Flat_Bench_Cable_Flyes: flyesCable,
  'Incline_Dumbbell_Flyes_-_With_A_Twist': inclineFlyes,
  Incline_Cable_Flye: inclineFlyesCable,
  Pushups_Close_and_Wide_Hand_Positions: pushUp,
  'Close-Grip_Push-Up_off_of_a_Dumbbell': pushUp,
  'Push-Ups_With_Feet_Elevated': declinePushUp,
  Cable_Iron_Cross: cableCross,
  Standing_Military_Press: overheadPress,
  Standing_Dumbbell_Press: overheadDumbbell,
  'Standing_Palms-In_Dumbbell_Press': overheadDumbbell,
  Standing_Alternating_Dumbbell_Press: overheadAlternate,
  'Dumbbell_One-Arm_Shoulder_Press': overheadOneArm,
  Arnold_Dumbbell_Press: overheadDumbbell,
  'Standing_Palm-In_One-Arm_Dumbbell_Press': overheadOneArm,
  'Two-Arm_Kettlebell_Military_Press': standingPressKettlebell,
  Alternating_Kettlebell_Press: kettlebellPressAlternate,
  Kettlebell_Seesaw_Press: kettlebellPressAlternate,
  'One-Arm_Side_Laterals': lateralOneArm,
  Power_Partials: lateralRaise,
  Dumbbell_Scaption: lateralRaise,
  'Standing_Low-Pulley_Deltoid_Raise': lateralCableOneArm,
  Standing_Dumbbell_Upright_Row: uprightDumbbell,
  'Cable_Rope_Rear-Delt_Rows': facePull,
  'Triceps_Pushdown_-_Rope_Attachment': tricepsPushdown,
  'Triceps_Pushdown_-_V-Bar_Attachment': tricepsPushdown,
  Reverse_Grip_Triceps_Pushdown: tricepsPushdown,
  Cable_One_Arm_Tricep_Extension: pushdownOneArm,
  'Dumbbell_One-Arm_Triceps_Extension': overheadTricepsOneArm,
  'Standing_One-Arm_Dumbbell_Triceps_Extension': overheadTricepsOneArm,
  Kettlebell_Overhead_Triceps_Extension: overheadTricepsKettlebell,
  Standing_Overhead_Barbell_Triceps_Extension: overheadTricepsBar,
  'EZ-Bar_Skullcrusher': skullCrusher,
  'Lying_Close-Grip_Barbell_Triceps_Extension_Behind_The_Head': skullCrusher,
  Lying_Dumbbell_Tricep_Extension: skullCrusherDumbbell,
  'Dumbbell_Tricep_Extension_-Pronated_Grip': skullCrusherDumbbell,
  'V-Bar_Pullup': pullUp,
  Underhand_Cable_Pulldowns: pulldown,
  'V-Bar_Pulldown': pulldown,
  One_Arm_Lat_Pulldown: pulldownOneArm,
  'Reverse_Grip_Bent-Over_Rows': barbellRow,
  Smith_Machine_Bent_Over_Row: barbellRow,
  'Bent_Over_Two-Arm_Long_Bar_Row': barbellRow,
  'T-Bar_Row_with_Handle': barbellRow,
  'Bent_Over_Two-Dumbbell_Row_With_Palms_In': dumbbellRow,
  Alternating_Kettlebell_Row: kettlebellRowAlternate,
  'One-Arm_Kettlebell_Row': oneArmRowKettlebell,
  'Seated_One-arm_Cable_Pulley_Rows': seatedRowOneArm,
  Elevated_Cable_Rows: seatedRow,
  Dumbbell_Alternate_Bicep_Curl: curlAlternate,
  Standing_Dumbbell_Reverse_Curl: curlDumbbell,
  Cross_Body_Hammer_Curl: curlDumbbell,
  'Standing_Inner-Biceps_Curl': curlDumbbell,
  Zottman_Curl: curlDumbbell,
  'Close-Grip_Standing_Barbell_Curl': curlBarbell,
  'Wide-Grip_Standing_Barbell_Curl': curlBarbell,
  Reverse_Barbell_Curl: curlBarbell,
  'Close-Grip_EZ_Bar_Curl': curlBarbell,
  'Standing_One-Arm_Cable_Curl': curlCableOneArm,
  Reverse_Cable_Curl: curlCable,
  'Cross-Body_Crunch': crunch,
  'Sit-Up': sitUp,
  '3_4_Sit-Up': sitUp,
  'Frog_Sit-Ups': sitUp,
  Front_Box_Jump: boxJump,
}

export { FLOOR }
