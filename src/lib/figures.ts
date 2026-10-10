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
  shinLen?: number
}

export interface Prop {
  type: 'plate' | 'dumbbell' | 'kettlebell' | 'bench' | 'box' | 'bar' | 'cable' | 'band' | 'pad' | 'seat' | 'platform' | 'grip' | 'rest' | 'barFront' | 'ball'
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
  /**
   * Ángulos que recorren el camino largo (más de 180°) entre las dos posturas, como los brazos que
   * suben por delante hasta arriba en una arrancada. Los demás van siempre por el camino corto.
   */
  sweep?: (keyof Pose)[]
  /** Gira la figura entera (grados, positivo en sentido horario) sobre el ancla: tumbado de lado = vista de frente girada -90. */
  turn?: number
  /** Caminar, correr, arrastrar o gatear: los pies (y las manos) avanzan, así que no se clavan al suelo. */
  gait?: boolean
  /** Zancadas y sentadilla búlgara: el pie de atrás no se mueve del sitio en todo el movimiento. */
  pinBack?: boolean
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
    // La plataforma avanza en la línea cadera-tobillo (58°) y queda perpendicular a ella; el pie, plano
    // sobre ella (-32°) en todo el recorrido, con el tobillo flexionado unos 35° abajo, como en la máquina.
    { type: 'platform', at: 'ankle', angle: 58 },
  ],
  frames: [
    { torso: -50, head: -35, thigh: 25, shin: 95, foot: -32, upper: 160, fore: 120 },
    { torso: -50, head: -35, thigh: 58, shin: 58, foot: -32, upper: 160, fore: 120 },
  ],
}

const LUNGE_TOP = { torso: 2, thigh: 165, shin: 180, thigh2: -162, shin2: -160, foot: 90, foot2: 150 }
const LUNGE_LOW = { torso: 4, thigh: 98, shin: 182, thigh2: 182, shin2: -98, foot: 90, foot2: 170 }
const lungeDumbbells: Figure = { pinBack: true,
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'dumbbell', at: 'wrist', front: true }], x: 160,
  frames: [{ ...LUNGE_TOP, upper: 180, fore: 180 }, { ...LUNGE_LOW, upper: 180, fore: 180 }],
}
const lungeBarbell: Figure = { pinBack: true, ...lungeDumbbells, props: [backBar], frames: [{ ...LUNGE_TOP, ...armsOnBar }, { ...LUNGE_LOW, ...armsOnBar }] }
const lungeBodyweight: Figure = { pinBack: true, ...lungeDumbbells, props: [], frames: [{ ...LUNGE_TOP, upper: 200, fore: 60 }, { ...LUNGE_LOW, upper: 200, fore: 60 }] }
const lungePass: Figure = { pinBack: true, ...lungeDumbbells, props: [{ type: 'kettlebell', at: 'wrist', front: true }], frames: [{ ...LUNGE_TOP, upper: 180, fore: 180 }, { ...LUNGE_LOW, torso: 20, upper: 165, fore: 165 }] }
const bulgarian: Figure = { pinBack: true,
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
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [90, 172] },
  props: [{ type: 'seat', span: [66, 140], y: 184, back: [58, 92, 90] }, { type: 'pad', at: 'ankle', angle: -90, offset: 8, front: true }],
  frames: [
    { torso: -8, thigh: 90, shin: 100, foot: 20, upper: 170, fore: 90 },
    { torso: -8, thigh: 90, shin: 205, foot: 100, upper: 170, fore: 90 },
  ],
}
const legExtension: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [90, 172] },
  props: [{ type: 'seat', span: [66, 140], y: 184, back: [58, 92, 90] }, { type: 'pad', at: 'ankle', angle: 90, offset: 9, front: true }],
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
    { torso: 0, head: 0, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 180 },
    { torso: 58, head: 70, thigh: 238, shin: -90, foot: -100, upper: 150, fore: 140 },
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
  view: 'side', work: ['calves'], anchor: { joint: 'hip', at: [92, 172] }, period: 1800,
  props: [{ type: 'seat', span: [66, 140], y: 184 }, { type: 'pad', at: 'knee', angle: 0, offset: 12, front: true }],
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
  // Arriba la barra queda sobre el esternón (no sobre la cara) y baja a la parte baja del pecho.
  props: [flatBench, { type: 'plate', at: 'wrist', front: true, size: 24 }],
  frames: [{ ...LYING, upper: 14, fore: 4 }, { ...LYING, upper: 110, fore: -2 }],
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
  frames: [{ ...LYING, upper: 2, fore: 5 }, { ...LYING, upper: 102, fore: 96 }],
}
const inclineFlyes: Figure = {
  ...inclineDumbbell, work: ['chest'],
  frames: [{ ...LYING, torso: -58, head: -58, upper: 5, fore: 8 }, { ...LYING, torso: -58, head: -58, upper: 118, fore: 110 }],
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
  view: 'side', work: ['shoulders', 'arms'], anchor: { joint: 'hip', at: [110, 172] },
  props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 82, 100] }, { type: 'dumbbell', at: 'wrist', front: true }],
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
const pullUpBand: Figure = { ...pullUp, props: [...pullUp.props, { type: 'band', at: 'knee', point: [170, -64] }] }
const scapularPull: Figure = { ...pullUp, work: ['back'], frames: [pullUp.frames[0], { ...pullUp.frames[0], upper: 6, fore: 3, lift: 8 }] }
const pulldown: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'hip', at: [110, 172] },
  props: [{ type: 'seat', span: [86, 146], y: 184 }, { type: 'cable', at: 'wrist', point: [120, 4] }, { type: 'pad', at: 'knee', angle: 0, offset: 12 }],
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
    { ...PUSH_UP, torso: 76, thigh: 110, shin: -40, thigh2: -104, shin2: -104, foot: 110, upper: 180, fore: 180 },
    { ...PUSH_UP, torso: 76, thigh: -104, shin: -104, thigh2: 110, shin2: -40, foot: 110, upper: 180, fore: 180 },
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
  frames: [{ torso: 55, head: 65, thigh: 158, shin: 195, foot: 90, upper: 180, fore: 180 }, { ...STAND, upper: 180, fore: 180 }],
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
  ...lateralRaise, anchor: { joint: 'hip', at: [140, 146] }, props: [seatFront, ...lateralRaise.props],
  frames: [{ ...SEATED_FRONT, upper: 172, fore: 174 }, { ...SEATED_FRONT, upper: 92, fore: 96 }],
}
const lateralSeatedCable: Figure = { ...lateralSeated, props: [seatFront, { type: 'cable', at: 'wrist', point: [60, 214] }] }
const pecDeckSeated: Figure = {
  ...pecDeck, anchor: { joint: 'hip', at: [140, 146] }, props: [seatFront],
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
  // La mano libre no lleva peso.
  return { ...f, props: f.props.filter((p) => p.at !== 'wrist2'), frames: f.frames.map((p) => ({ ...p, upper2, fore2 })) as [Pose, Pose] }
}
/** Alterno: el brazo lejano hace el mismo movimiento a contratiempo. */
function alternate(f: Figure): Figure {
  const [a, b] = f.frames
  // Cada mano lleva su peso.
  const second = f.props.filter((p) => p.at === 'wrist' && !f.props.some((q) => q.at === 'wrist2' && q.type === p.type)).map((p) => ({ ...p, at: 'wrist2' as JointName }))
  return { ...f, props: [...f.props, ...second], frames: [{ ...a, upper2: b.upper, fore2: b.fore }, { ...b, upper2: a.upper, fore2: a.fore }] }
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

// ---------------------------------------------------------------- abdominales y tronco (ampliación)
const LYING_FLOOR = { torso: -90, head: -90 }
const onFloor = { anchor: { joint: 'hip' as JointName, at: [128, 208] as [number, number] }, shadow: 110 }
const crunchOverhead: Figure = {
  ...crunch,
  frames: [{ ...crunch.frames[0], upper: -88, fore: -90 }, { ...crunch.frames[1], upper: -20, fore: -15 }],
}
const crunchReach: Figure = {
  ...crunch,
  frames: [{ ...crunch.frames[0], upper: 100, fore: 100 }, { ...crunch.frames[1], torso: -62, upper: 115, fore: 112 }],
}
const crunchWeighted: Figure = { ...crunch, props: [{ type: 'ball', at: 'wrist', size: 9, front: true }], frames: [{ ...crunch.frames[0], upper: 40, fore: -110 }, { ...crunch.frames[1], upper: 72, fore: -78 }] }
const crunchBallLegs: Figure = {
  ...crunch, props: [{ type: 'ball', point: [196, 196], size: 26 }],
  frames: [
    { ...LYING_FLOOR, thigh: 30, shin: 95, foot: 10, upper: 60, fore: -120 },
    { torso: -58, head: -40, thigh: 30, shin: 95, foot: 10, upper: 92, fore: -88 },
  ],
}
// Banco declinado: la cabeza queda más baja que la cadera y los pies sujetos bajo los rodillos.
const declineBench: Prop[] = [{ type: 'bench', span: [36, 150], y: 158, tilt: -14 }, { type: 'pad', at: 'ankle', angle: 0, offset: 9, front: true }]
const declineCrunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [138, 150] }, shadow: 100, props: declineBench,
  frames: [
    { torso: -104, head: -100, thigh: 62, shin: 165, foot: 90, upper: 46, fore: -134 },
    { torso: -52, head: -35, thigh: 62, shin: 165, foot: 90, upper: 98, fore: -82 },
  ],
}
const reverseCrunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'shoulder', at: [64, 208] }, shadow: 110, props: [],
  frames: [
    { ...LYING_FLOOR, thigh: 5, shin: 95, foot: 20, upper: 92, fore: 90 },
    { torso: -114, head: -96, thigh: -45, shin: 50, foot: -20, upper: 92, fore: 90 },
  ],
}
const reverseCrunchCable: Figure = { ...reverseCrunch, props: [{ type: 'cable', at: 'ankle', point: [250, 214] }] }
const bottomsUp: Figure = {
  ...reverseCrunch,
  frames: [
    { ...LYING_FLOOR, thigh: 0, shin: 0, foot: 90, upper: 92, fore: 90 },
    { torso: -118, head: -96, thigh: -28, shin: -28, foot: 60, upper: 92, fore: 90 },
  ],
}
const cocoon: Figure = {
  view: 'side', work: ['core'], ...onFloor, props: [],
  frames: [
    { ...LYING_FLOOR, thigh: 92, shin: 92, foot: 30, upper: -90, fore: -90 },
    { torso: -48, head: -30, thigh: 12, shin: 95, foot: 40, upper: 60, fore: 75 },
  ],
}
const jackknife: Figure = {
  ...cocoon,
  frames: [
    { ...LYING_FLOOR, thigh: 92, shin: 92, foot: 30, upper: -90, fore: -90 },
    { torso: -38, head: -25, thigh: 38, shin: 38, foot: 90, upper: 50, fore: 48 },
  ],
}
const airBike: Figure = {
  view: 'side', work: ['core'], ...onFloor, props: [], period: 1800,
  frames: [
    { torso: -64, head: -45, thigh: 20, shin: 95, thigh2: 72, shin2: 80, foot: 60, upper: 40, fore: -140 },
    { torso: -64, head: -45, thigh: 72, shin: 80, thigh2: 20, shin2: 95, foot: 60, upper: 40, fore: -140 },
  ],
}
const flutterKicks: Figure = {
  view: 'side', work: ['core'], ...onFloor, props: [], period: 1200,
  frames: [
    { ...LYING_FLOOR, thigh: 68, shin: 68, thigh2: 84, shin2: 84, foot: 20, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: 84, shin: 84, thigh2: 68, shin2: 68, foot: 20, upper: 92, fore: 90 },
  ],
}
const scissorKick: Figure = {
  ...flutterKicks, period: 2000,
  frames: [
    { ...LYING_FLOOR, thigh: 20, shin: 20, thigh2: 82, shin2: 82, foot: 90, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: 82, shin: 82, thigh2: 20, shin2: 20, foot: 90, upper: 92, fore: 90 },
  ],
}
// Sentado en el suelo, apoyado en las manos: recoger y estirar las piernas.
const legTuck: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [120, 206] }, shadow: 100, props: [],
  frames: [
    { torso: -38, head: -20, thigh: 76, shin: 82, foot: 40, upper: -165, fore: -175 },
    { torso: -24, head: -10, thigh: 15, shin: 125, foot: 70, upper: -168, fore: -178 },
  ],
}
const legTuckBench: Figure = {
  ...legTuck, anchor: { joint: 'hip', at: [120, 176] }, props: [{ type: 'bench', span: [40, 140], y: 186 }],
  frames: [
    { torso: -38, head: -20, thigh: 80, shin: 100, foot: 40, upper: -160, fore: -170 },
    { torso: -24, head: -10, thigh: 15, shin: 130, foot: 70, upper: -162, fore: -172 },
  ],
}
const benchLegRaise: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [128, 160] }, shadow: 100, props: [flatBench],
  frames: [
    { ...LYING, thigh: 96, shin: 96, foot: 20, upper: -120, fore: -40 },
    { ...LYING, thigh: 5, shin: 5, foot: 90, upper: -120, fore: -40 },
  ],
}
// En paralelas (o silla romana) con los brazos estirados: subir las rodillas.
const kneeRaiseBars: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'wrist', at: [140, 84] },
  props: [{ type: 'bar', span: [120, 175], y: 88 }],
  frames: [
    { torso: 2, head: 0, thigh: 180, shin: 180, foot: 150, upper: 180, fore: 180 },
    { torso: -6, head: 0, thigh: 88, shin: 178, foot: 120, upper: 180, fore: 180 },
  ],
}
const hangingPike: Figure = {
  ...hangingLegRaise,
  frames: [hangingLegRaise.frames[0], { torso: -22, thigh: 22, shin: 22, foot: 110, upper: 12, fore: 8 }],
}
const gorillaChin: Figure = {
  ...pullUp, work: ['core', 'back'],
  frames: [
    { ...pullUp.frames[0], thigh: 88, shin: 175, foot: 120 },
    { ...pullUp.frames[1], thigh: 60, shin: 160, foot: 110 },
  ],
}
const sidePlank: Figure = {
  ...plank, anchor: { joint: 'elbow', at: [178, 216] }, shadow: 110, period: 2400,
  frames: [
    { torso: 80, head: 82, thigh: -100, shin: -100, foot: 120, upper: 180, fore: 90, upper2: 2, fore2: 2 },
    { torso: 78, head: 78, thigh: -102, shin: -102, foot: 120, upper: 180, fore: 90, upper2: 2, fore2: 2 },
  ],
}
const buttUps: Figure = {
  ...plank, period: 2400,
  frames: [plank.frames[0], { torso: 122, head: 112, thigh: -128, shin: -128, foot: 130, upper: 180, fore: 90 }],
}
// Posición de flexión con las espinillas sobre un fitball (o en las correas): rodillas al pecho.
const ballPullIn: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'wrist', at: [176, 218] }, shadow: 110,
  props: [{ type: 'ball', at: 'ankle', angle: 180, offset: 6, size: 22 }],
  frames: [
    { torso: 76, head: 80, thigh: -104, shin: -104, foot: 180, upper: 180, fore: 180 },
    { torso: 108, head: 110, thigh: 160, shin: -100, foot: 180, upper: 180, fore: 180 },
  ],
}
const suspendedPullIn: Figure = { ...ballPullIn, props: [{ type: 'cable', at: 'ankle', point: [20, -40] }] }
const abRollout: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'knee', at: [100, 214] }, shadow: 110,
  props: [{ type: 'ball', at: 'wrist', angle: 180, offset: 2, size: 10, front: true }],
  frames: [
    { torso: 76, head: 82, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 180 },
    { torso: 88, head: 90, thigh: -112, shin: -90, foot: -100, upper: 100, fore: 100 },
  ],
}
const abRolloutBar: Figure = { ...abRollout, props: [{ type: 'plate', at: 'wrist', angle: 180, offset: 2, size: 13, front: true }] }
// De pie con las correas de suspensión: el cuerpo, recto, cae hacia delante con los brazos arriba.
const fallout: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'toe', at: [110, 219] },
  props: [{ type: 'cable', at: 'wrist', point: [250, -60] }],
  frames: [
    { torso: 18, head: 18, thigh: -162, shin: -162, foot: 90, upper: 95, fore: 92 },
    { torso: 42, head: 42, thigh: -138, shin: -138, foot: 110, upper: 25, fore: 22 },
  ],
}
const cableCrunchKneeling: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'knee', at: [110, 214] },
  props: [{ type: 'cable', at: 'wrist', point: [150, -40] }],
  frames: [
    { torso: 22, head: 30, thigh: 175, shin: -90, foot: -100, upper: 150, fore: -20 },
    { torso: 88, head: 125, thigh: 165, shin: -90, foot: -100, upper: 185, fore: 60 },
  ],
}
const cableCrunchStanding: Figure = {
  view: 'side', work: ['core'], props: [{ type: 'cable', at: 'wrist', point: [150, -60] }],
  frames: [
    { torso: 5, head: 10, thigh: 175, shin: 186, foot: 90, upper: 150, fore: -20 },
    { torso: 55, head: 80, thigh: 165, shin: 190, foot: 90, upper: 175, fore: 40 },
  ],
}
const seatedCrunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [110, 172] },
  props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 92, 90] }, { type: 'cable', at: 'wrist', point: [80, 10] }],
  frames: [
    { torso: -2, head: 0, thigh: 90, shin: 180, foot: 90, upper: 150, fore: -20 },
    { torso: 42, head: 60, thigh: 90, shin: 180, foot: 90, upper: 170, fore: 30 },
  ],
}
const machineCrunch: Figure = { ...seatedCrunch, props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 92, 90] }, { type: 'pad', at: 'elbow', size: 7, front: true }] }
const ballCrunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [122, 182] }, shadow: 100,
  props: [{ type: 'ball', point: [108, 198], size: 24 }],
  frames: [
    { torso: -100, head: -105, thigh: 80, shin: 176, foot: 90, upper: 40, fore: -130 },
    { torso: -52, head: -35, thigh: 80, shin: 176, foot: 90, upper: 90, fore: -85 },
  ],
}
const pressSitUp: Figure = {
  ...crunch, props: [{ type: 'plate', at: 'wrist', size: 16, front: true }],
  frames: [
    { ...crunch.frames[0], upper: 50, fore: -70 },
    { torso: -12, head: -5, thigh: 45, shin: 150, foot: 95, upper: 4, fore: 2 },
  ],
}
const sitUpBand: Figure = { ...sitUp, props: [{ type: 'band', at: 'wrist', point: [20, 214] }] }
// De frente: inclinación lateral del tronco con peso en una mano (o barra en la espalda).
const SIDE_STAND = { torso: 0, thigh: 174, shin: 180 }
const sideBend: Figure = {
  view: 'front', work: ['core'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { ...SIDE_STAND, upper: 180, fore: 180, upper2: 150, fore2: 215 },
    { ...SIDE_STAND, torso: 18, head: 12, upper: 180, fore: 180, upper2: 150, fore2: 215 },
  ],
}
const sideBendBar: Figure = {
  view: 'front', work: ['core'], props: [{ type: 'barFront', front: true }],
  frames: [
    { ...SIDE_STAND, upper: 100, fore: -8 },
    { ...SIDE_STAND, torso: -18, head: -12, upper: 82, fore: -26 },
  ],
}
const sideBendCable: Figure = {
  view: 'front', work: ['core'], props: [{ type: 'cable', at: 'wrist', point: [236, -40] }],
  frames: [
    { ...SIDE_STAND, upper: 30, fore: 20, upper2: 180, fore2: 180 },
    { ...SIDE_STAND, torso: -18, head: -12, upper: 20, fore: 10, upper2: 185, fore2: 185 },
  ],
}
// De frente: los brazos juntos van de un lado al otro (giros, leñador, molinos con peso).
const twistStanding: Figure = {
  view: 'front', work: ['core'], props: [{ type: 'ball', at: 'wrist', size: 10, front: true }],
  frames: [
    { ...SIDE_STAND, thigh: 168, head: 4, upper: 128, fore: 120, upper2: -118, fore2: -95 },
    { ...SIDE_STAND, thigh: 168, head: -4, upper: -118, fore: -95, upper2: 128, fore2: 120 },
  ],
}
const twistDumbbell: Figure = { ...twistStanding, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const woodChop: Figure = {
  view: 'front', work: ['core', 'shoulders'], props: [{ type: 'cable', at: 'wrist', point: [236, -50] }],
  frames: [
    { ...SIDE_STAND, thigh: 166, head: 4, upper: 40, fore: 40, upper2: -40, fore2: 60 },
    { ...SIDE_STAND, thigh: 166, torso: -8, head: -10, upper: -130, fore: -140, upper2: 120, fore2: 150 },
  ],
}
const cableLift: Figure = {
  ...woodChop, props: [{ type: 'cable', at: 'wrist', point: [226, 216] }],
  frames: [woodChop.frames[1], woodChop.frames[0]].map((p) => ({ ...p, upper: -p.upper, fore: -p.fore, upper2: -(p.upper2 ?? 0), fore2: -(p.fore2 ?? 0) })) as [Pose, Pose],
}
const landmineArc: Figure = {
  view: 'front', work: ['core', 'shoulders'], props: [{ type: 'cable', at: 'wrist', point: [130, 214] }],
  frames: [
    { ...SIDE_STAND, thigh: 166, head: 4, upper: 115, fore: 82, upper2: -95, fore2: -100 },
    { ...SIDE_STAND, thigh: 166, head: -4, upper: -95, fore: -100, upper2: 115, fore2: 82 },
  ],
}
// Sentado en el suelo, de frente, con las rodillas flexionadas (muslo y espinilla en escorzo).
const SEATED_FLOOR_FRONT = { torso: 0, torsoLen: 0.85, thigh: 32, thighLen: 0.5, shin: 172, shinLen: 0.5 }
const russianTwist: Figure = {
  view: 'front', work: ['core'], anchor: { joint: 'hip', at: [140, 206] }, shadow: 70,
  props: [{ type: 'ball', at: 'wrist', size: 10, front: true }],
  frames: [
    { ...SEATED_FLOOR_FRONT, head: 4, upper: 140, fore: 115, upper2: -150, fore2: -100 },
    { ...SEATED_FLOOR_FRONT, head: -4, upper: -150, fore: -100, upper2: 140, fore2: 115 },
  ],
}
const russianTwistPlate: Figure = { ...russianTwist, props: [{ type: 'plate', at: 'wrist', size: 14, front: true }] }
const russianTwistCable: Figure = { ...russianTwist, props: [{ type: 'cable', at: 'wrist', point: [250, 200] }] }
// Sentado en un banco, de frente, con la barra en la espalda: giros del tronco.
const seatedTwistBar: Figure = {
  view: 'front', work: ['core'], anchor: { joint: 'hip', at: [140, 146] }, props: [seatFront, { type: 'barFront', front: true }],
  frames: [
    { ...SEATED_FRONT, torso: -6, upper: 100, fore: -8 },
    { ...SEATED_FRONT, torso: 6, upper: 100, fore: -8 },
  ],
}
// Molino: kettlebell arriba con el brazo estirado; el tronco baja hacia el pie contrario.
const windmill: Figure = {
  view: 'front', work: ['core', 'shoulders'], props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [
    { torso: 0, thigh: 168, shin: 182, upper: 2, fore: 2, upper2: 180, fore2: 180 },
    { torso: -62, head: -40, thigh: 166, shin: 182, upper: -6, fore: -6, upper2: 188, fore2: 188 },
  ],
}
const windmillDouble: Figure = {
  ...windmill, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }, { type: 'kettlebell', at: 'wrist2', front: true }],
}
const bentPress: Figure = {
  ...windmill,
  frames: [{ torso: 0, thigh: 168, shin: 182, upper: 170, fore: 10, upper2: 180, fore2: 180 }, windmill.frames[1]],
}
const kbPassLegs: Figure = {
  view: 'side', work: ['core', 'glutes'], props: [{ type: 'kettlebell', at: 'wrist', front: true }], period: 1800,
  frames: [
    { torso: 52, head: 70, thigh: 150, shin: 196, foot: 90, upper: 175, fore: 175, upper2: 185, fore2: 185 },
    { torso: 55, head: 70, thigh: 150, shin: 196, foot: 90, upper: 205, fore: 212, upper2: 175, fore2: 175 },
  ],
}
const pallofPress: Figure = {
  view: 'side', work: ['core'], props: [{ type: 'cable', at: 'wrist', point: [40, 110] }],
  frames: [
    { torso: 2, thigh: 172, shin: 186, foot: 90, upper: 172, fore: 22 },
    { torso: 2, thigh: 172, shin: 186, foot: 90, upper: 90, fore: 90 },
  ],
}

// ---------------------------------------------------------------- estiramientos y movilidad
// Los estiramientos se mueven despacio entre la entrada y la postura mantenida.
const HOLD = 4000
const quadStretch: Figure = {
  view: 'side', work: ['legs'], props: [], period: HOLD,
  frames: [
    { ...STAND, thigh2: 182, shin2: 182, thigh: 186, shin: -40, foot: -20, upper: 200, fore: 215, upper2: 175, fore2: 175 },
    { ...STAND, thigh2: 182, shin2: 182, thigh: 196, shin: -12, foot: 0, upper: 205, fore: 230, upper2: 175, fore2: 175 },
  ],
}
const quadStretchElevated: Figure = {
  ...bulgarian, work: ['legs'], props: [{ type: 'bench', span: [30, 94], y: 190 }], period: HOLD,
  frames: [
    { ...bulgarian.frames[0], upper: 180, fore: 170 },
    { ...bulgarian.frames[0], torso: -4, thigh: 164, thigh2: -146, upper: 180, fore: 170 },
  ],
}
const forwardFold: Figure = {
  view: 'side', work: ['legs'], props: [], period: HOLD,
  frames: [
    { ...STAND, upper: 8, fore: 5 },
    { torso: 138, head: 160, thigh: 178, shin: 182, foot: 90, upper: 160, fore: 162 },
  ],
}
const forwardFoldHold: Figure = { ...forwardFold, frames: [{ torso: 120, head: 150, thigh: 176, shin: 182, foot: 90, upper: 180, fore: 175 }, forwardFold.frames[1]] }
// Zancada arrodillada (rodilla de atrás en el suelo): la cadera se lleva hacia delante.
const kneelingLunge: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'knee2', at: [100, 214] }, shadow: 90, props: [], period: HOLD,
  frames: [
    { torso: 2, head: 0, thigh2: -160, shin2: -90, foot2: -100, thigh: 89.6, shin: 169.4, foot: 90, upper: 175, fore: 150 },
    { torso: -6, head: -5, thigh2: -145, shin2: -90, foot2: -100, thigh: 82.8, shin: 168.9, foot: 90, upper: 175, fore: 150 },
  ],
}
const kneelingLungeReach: Figure = {
  ...kneelingLunge,
  frames: [
    kneelingLunge.frames[0],
    { ...kneelingLunge.frames[1], shin2: -10, foot2: 60, upper: -160, fore: -150 },
  ],
}
const standingHipFlexor: Figure = {
  ...lungeBodyweight, work: ['legs'], period: HOLD,
  frames: [{ ...LUNGE_TOP, upper: 175, fore: 150 }, { ...LUNGE_TOP, torso: -6, thigh: 150, shin: 185, upper: 175, fore: 150 }],
}
const runnersStretch: Figure = {
  view: 'side', work: ['legs'], hands: true, x: 160, props: [], period: HOLD,
  frames: [
    { torso: 60, head: 70, thigh: 100, shin: 185, thigh2: -120, shin2: -115, foot: 90, foot2: 150, upper: 185, fore: 180 },
    { torso: 72, head: 80, thigh: 118, shin: 175, thigh2: -110, shin2: -105, foot: 90, foot2: 160, upper: 182, fore: 180 },
  ],
}
const worldsGreatest: Figure = {
  ...runnersStretch, sweep: ['upper', 'fore', 'upper2', 'fore2'], period: 3200,
  frames: [
    { ...runnersStretch.frames[0], upper2: 182, fore2: 180 },
    { ...runnersStretch.frames[0], torso: 50, head: 20, upper: 0, fore: -5, upper2: 182, fore2: 180 },
  ],
}
// Gemelos contra la pared: pierna de atrás estirada con el talón en el suelo.
const wall: Prop = { type: 'box', span: [220, 234], y: -10 }
const calfWall: Figure = {
  view: 'side', work: ['calves'], props: [wall], period: HOLD,
  frames: [
    { torso: 30, head: 30, thigh: 160, shin: 188, thigh2: -158, shin2: -158, foot: 90, foot2: 75, upper: 72, fore: 82 },
    { torso: 38, head: 38, thigh: 152, shin: 190, thigh2: -150, shin2: -150, foot: 90, foot2: 70, upper: 72, fore: 80 },
  ],
}
const calfWallElbows: Figure = {
  ...calfWall,
  frames: [
    { torso: 45, head: 45, thigh: 150, shin: 192, thigh2: -142, shin2: -142, foot: 90, foot2: 60, upper: 100, fore: 10 },
    { torso: 52, head: 52, thigh: 145, shin: 195, thigh2: -136, shin2: -136, foot: 90, foot2: 55, upper: 105, fore: 15 },
  ],
}
const soleusStretch: Figure = {
  ...calfWall,
  frames: [
    { ...calfWall.frames[0], thigh2: -170, shin2: -140 },
    { ...calfWall.frames[0], thigh2: -175, shin2: -130, thigh: 150, shin: 195 },
  ],
}
// Sentado en el suelo con las piernas estiradas: inclinarse hacia los pies.
const seatedReach: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [100, 206] }, shadow: 100, props: [], period: HOLD,
  frames: [
    { torso: -4, head: 0, thigh: 90, shin: 90, foot: 5, upper: 80, fore: 85 },
    { torso: 58, head: 75, thigh: 90, shin: 90, foot: 5, upper: 100, fore: 98 },
  ],
}
const seatedReachChair: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [100, 172] }, props: [{ type: 'seat', span: [70, 130], y: 184 }], period: HOLD,
  frames: [
    { torso: 0, thigh: 90, shin: 120, thigh2: 90, shin2: 180, foot: 10, foot2: 90, upper: 170, fore: 110 },
    { torso: 50, head: 70, thigh: 90, shin: 120, thigh2: 90, shin2: 180, foot: 10, foot2: 90, upper: 125, fore: 118 },
  ],
}
const chairFold: Figure = {
  ...seatedReachChair,
  frames: [
    { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 170, fore: 110 },
    { torso: 85, head: 110, thigh: 90, shin: 180, foot: 90, upper: 160, fore: 150 },
  ],
}
const chairStretchUp: Figure = {
  ...seatedReachChair, work: ['shoulders', 'back'],
  frames: [
    { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 170, fore: 110 },
    { torso: -4, thigh: 90, shin: 180, foot: 90, upper: 5, fore: 0 },
  ],
}
const chairArmsBack: Figure = {
  ...seatedReachChair, work: ['chest', 'shoulders'],
  frames: [
    { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 190, fore: 185 },
    { torso: 6, head: 10, thigh: 90, shin: 180, foot: 90, upper: -145, fore: -150 },
  ],
}
const figureFourChair: Figure = {
  ...seatedReachChair, work: ['glutes'],
  frames: [
    { torso: 0, thigh: 90, shin: 180, thigh2: 30, shin2: 148, foot: 90, foot2: 90, upper: 150, fore: 100 },
    { torso: 40, head: 55, thigh: 90, shin: 180, thigh2: 30, shin2: 148, foot: 90, foot2: 90, upper: 160, fore: 120 },
  ],
}
// De frente, sentado en el suelo con las piernas abiertas (o las plantas juntas).
const straddle: Figure = {
  view: 'front', work: ['legs'], anchor: { joint: 'hip', at: [150, 208] }, shadow: 100, props: [], period: HOLD,
  frames: [
    { torso: 0, torsoLen: 0.9, thigh: 92, shin: 92, upper: 150, fore: 150 },
    { torso: 0, torsoLen: 0.55, head: 0, thigh: 92, shin: 92, upper: 130, fore: 140 },
  ],
}
const butterfly: Figure = {
  view: 'front', work: ['legs'], anchor: { joint: 'hip', at: [140, 202] }, shadow: 80, props: [], period: HOLD,
  frames: [
    { torso: 0, torsoLen: 0.95, thigh: 58, thighLen: 0.8, shin: -128, upper: 200, fore: 210 },
    { torso: 0, torsoLen: 0.95, thigh: 74, thighLen: 0.8, shin: -118, upper: 200, fore: 205 },
  ],
}
const butterflyFold: Figure = { ...butterfly, frames: [butterfly.frames[0], { ...butterfly.frames[1], torsoLen: 0.6, upper: 140, fore: 150 }] }
const sideLungeStretch: Figure = {
  view: 'front', work: ['legs'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 150, shin: 180, upper: 160, fore: -150 },
    { torso: 0, torsoLen: 0.9, thigh: 100, shin: 172, thigh2: 128, shin2: 130, upper: 160, fore: -150 },
  ],
}
const sideLegRaise: Figure = {
  view: 'front', work: ['legs', 'glutes'], props: [],
  frames: [
    { torso: 0, thigh: 178, shin: 180, upper: 160, fore: -150 },
    { torso: -8, thigh: 132, shin: 132, thigh2: 178, shin2: 180, upper: 160, fore: -150 },
  ],
}
const hipCircles: Figure = {
  view: 'front', work: ['glutes'], props: [], period: 2000,
  frames: [
    { torso: -6, thigh: 170, shin: 184, upper: 160, fore: -150, shift: 8 },
    { torso: 6, thigh: 170, shin: 184, upper: 160, fore: -150, shift: -8 },
  ],
}
const knee_circles_pose = { torso: 72, head: 80, thigh: 140, shin: 205, foot: 90, upper: 202, fore: 202 }
const kneeCircles: Figure = {
  view: 'side', work: ['legs'], props: [], period: 2000,
  frames: [knee_circles_pose, { ...knee_circles_pose, thigh: 150, shin: 196, upper: 198, fore: 198 }],
}
// A cuatro patas: rodillas y manos en el suelo.
const ALL_FOURS = { torso: 80, head: 85, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 180 }
const allFours: Figure = { view: 'side', work: ['core'], hands: true, props: [], period: HOLD, frames: [ALL_FOURS, ALL_FOURS] }
const catStretch: Figure = { ...allFours, frames: [{ ...ALL_FOURS, torso: 78, head: 140 }, { ...ALL_FOURS, torso: 82, head: 45 }] }
const allFoursQuad: Figure = {
  ...allFours, work: ['legs'],
  frames: [
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: -100, shin: 10, foot: 90, upper: -150, fore: -120, upper2: 180, fore2: 180 },
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: -95, shin: 35, foot: 110, upper: -150, fore: -120, upper2: 180, fore2: 180 },
  ],
}
const kickback: Figure = {
  ...allFours, work: ['glutes'], period: 2000,
  frames: [
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: 175, shin: -95 },
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: -75, shin: 5, foot: 90 },
  ],
}
const hipCirclesProne: Figure = {
  ...kickback,
  frames: [
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: -130, shin: -80 },
    { ...ALL_FOURS, thigh2: 180, shin2: -90, thigh: -95, shin: -40 },
  ],
}
const forearmStretch: Figure = {
  ...allFours, work: ['forearms'],
  frames: [ALL_FOURS, { ...ALL_FOURS, torso: 70, head: 75, thigh: 150, upper: 160, fore: 160 }],
}
const childsPose: Figure = {
  view: 'side', work: ['back'], anchor: { joint: 'knee', at: [120, 214] }, shadow: 90, props: [], period: HOLD,
  frames: [
    { torso: 30, head: 40, thigh: 105, shin: -90, foot: -100, upper: 150, fore: 150 },
    { torso: 97, head: 115, thigh: 105, shin: -90, foot: -100, upper: 95, fore: 92 },
  ],
}
const hugBall: Figure = { ...straddle, props: [{ type: 'ball', point: [150, 176], size: 24, front: true }], frames: [{ torso: 0, torsoLen: 0.9, thigh: 92, shin: 92, upper: 150, fore: -110 }, { torso: 0, torsoLen: 0.7, thigh: 92, shin: 92, upper: 165, fore: -100 }] }
// Postura de pirámide (perro boca abajo): cadera arriba, manos y pies en el suelo.
const downDogBall: Figure = {
  ...childsPose, props: [{ type: 'ball', point: [175, 196], size: 24 }],
  frames: [
    { torso: 70, head: 80, thigh: 170, shin: -90, foot: -100, upper: 100, fore: 60 },
    { torso: 95, head: 110, thigh: -150, shin: -90, foot: -100, upper: 110, fore: 60 },
  ],
}
const inchworm: Figure = {
  view: 'side', work: ['legs', 'core'], hands: true, props: [], period: 3000,
  frames: [
    { torso: 170, head: 175, thigh: 176, shin: 182, foot: 90, upper: 172, fore: 170 },
    { torso: 76, head: 80, thigh: -104, shin: -104, foot: 180, upper: 180, fore: 180 },
  ],
}
// Tumbado boca abajo: la cabeza a la derecha.
const PRONE = { torso: 90, head: 90, thigh: -90, shin: -90, foot: 160 }
const prone = { anchor: { joint: 'hip' as JointName, at: [120, 210] as [number, number] }, shadow: 110 }
const superman: Figure = {
  view: 'side', work: ['back'], ...prone, props: [], period: 2400,
  frames: [
    { ...PRONE, foot: 150, upper: 90, fore: 90 },
    { ...PRONE, torso: 76, head: 65, thigh: -76, shin: -76, upper: 70, fore: 68 },
  ],
}
const halfLocust: Figure = {
  ...superman,
  frames: [{ ...PRONE, upper: -90, fore: -90 }, { ...PRONE, thigh: -74, shin: -74, thigh2: -90, shin2: -90, upper: -90, fore: -90 }],
}
const proneQuad: Figure = {
  ...superman, work: ['legs'], period: HOLD,
  frames: [
    { ...PRONE, thigh2: -90, shin2: -90, shin: 0, foot: 60, upper: -30, fore: 150, upper2: -85, fore2: -60 },
    { ...PRONE, thigh2: -90, shin2: -90, shin: 30, foot: 100, upper: -30, fore: 150, upper2: -85, fore2: -60 },
  ],
}
const cobra: Figure = {
  ...superman, work: ['core'], period: HOLD,
  frames: [
    { ...PRONE, upper: -40, fore: 160 },
    { ...PRONE, torso: 45, head: 25, upper: 200, fore: 150 },
  ],
}
// Tumbado boca arriba: rodillas al pecho, figura de cuatro, pierna estirada arriba.
const kneesToChest: Figure = {
  view: 'side', work: ['back', 'glutes'], ...onFloor, props: [], period: HOLD,
  frames: [
    { ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: -35, shin: 60, foot: 20, upper: 10, fore: 70 },
  ],
}
const oneKneeToChest: Figure = {
  ...kneesToChest,
  frames: [
    { ...LYING_FLOOR, thigh: 45, shin: 150, thigh2: 90, shin2: 90, foot: 95, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: -35, shin: 60, thigh2: 90, shin2: 90, foot: 20, upper: 10, fore: 70 },
  ],
}
const figureFourLying: Figure = {
  ...kneesToChest, work: ['glutes'],
  frames: [
    { ...LYING_FLOOR, thigh: 45, shin: 150, thigh2: 30, shin2: 110, foot: 95, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: 0, shin: 90, thigh2: -5, shin2: 95, foot: 20, upper: 20, fore: 60 },
  ],
}
const lyingHamstring: Figure = {
  ...kneesToChest, work: ['legs'],
  frames: [
    { ...LYING_FLOOR, thigh: 20, shin: 20, thigh2: 90, shin2: 90, foot: 90, upper: 30, fore: 25 },
    { ...LYING_FLOOR, thigh: -8, shin: -8, thigh2: 90, shin2: 90, foot: 90, upper: 8, fore: -5 },
  ],
}
const hamstring9090: Figure = {
  ...lyingHamstring,
  frames: [
    { ...LYING_FLOOR, thigh: 0, shin: 90, thigh2: 90, shin2: 90, foot: 20, upper: 20, fore: 60 },
    { ...LYING_FLOOR, thigh: 0, shin: 5, thigh2: 90, shin2: 90, foot: 90, upper: 20, fore: 60 },
  ],
}
const lyingTwist: Figure = {
  ...kneesToChest, work: ['back'],
  frames: [
    { ...LYING_FLOOR, thigh: 90, shin: 90, foot: 10, upper: 0, fore: 0 },
    { ...LYING_FLOOR, thigh: 30, shin: 110, foot: 60, thigh2: 90, shin2: 90, upper: 0, fore: 0 },
  ],
}
const lyingQuadSide: Figure = {
  ...kneesToChest, work: ['legs'],
  frames: [
    { ...LYING_FLOOR, thigh: 90, shin: 90, foot: 10, upper: 92, fore: 90 },
    { ...LYING_FLOOR, thigh: 100, shin: -60, foot: 10, thigh2: 90, shin2: 90, upper: 95, fore: 60 },
  ],
}
const toeTouchers: Figure = {
  view: 'side', work: ['core'], ...onFloor, props: [],
  frames: [
    { ...LYING_FLOOR, thigh: 2, shin: 2, foot: 90, upper: 0, fore: 0 },
    { torso: -55, head: -40, thigh: 2, shin: 2, foot: 90, upper: 30, fore: 25 },
  ],
}
const bridge: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'shoulder', at: [50, 210] }, shadow: 105, props: [],
  frames: [
    { torso: -90, head: -90, thigh: 46.5, shin: 152.6, foot: 90, upper: 92, fore: 90 },
    { torso: -110, head: -100, thigh: 70.6, shin: 162.1, foot: 90, upper: 92, fore: 90 },
  ],
}
const bridgeBar: Figure = { ...bridge, props: [{ type: 'plate', at: 'hip', angle: 0, offset: 15, front: true, size: 24 }], frames: bridge.frames.map((p) => ({ ...p, upper: 35, fore: 90 })) as [Pose, Pose] }
const bridgeBand: Figure = { ...bridge, props: [{ type: 'band', at: 'hip', point: [60, 214] }, { type: 'band', at: 'hip', point: [180, 214] }] }
const bridgeBall: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'shoulder', at: [70, 176] }, shadow: 100,
  props: [{ type: 'ball', point: [62, 198], size: 24 }],
  frames: [
    { torso: -60, head: -75, thigh: 55, shin: 175, foot: 90, upper: 100, fore: 100 },
    { torso: -90, head: -90, thigh: 88, shin: 180, foot: 90, upper: 100, fore: 100 },
  ],
}
const camel: Figure = {
  view: 'side', work: ['legs', 'core'], anchor: { joint: 'knee', at: [120, 214] }, shadow: 90, props: [], period: HOLD,
  frames: [
    { torso: 0, head: 0, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 175 },
    { torso: -35, head: -80, thigh: 165, shin: -90, foot: -100, upper: -165, fore: -175 },
  ],
}
// De pie: brazos arriba, atrás, cruzados, círculos...
const reachUp: Figure = {
  sweep: ['upper', 'fore', 'upper2', 'fore2'], view: 'side', work: ['shoulders', 'back'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 178, fore: 178 }, { ...STAND, torso: -6, head: -10, foot: 110, upper: -5, fore: -8 }],
}
const armsBackStretch: Figure = {
  view: 'side', work: ['chest', 'shoulders'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 185, fore: 185 }, { ...STAND, torso: 8, head: 5, upper: -140, fore: -145 }],
}
const elbowsBack: Figure = {
  view: 'side', work: ['chest'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 205, fore: 150 }, { ...STAND, upper: 220, fore: 130 }],
}
const behindHead: Figure = {
  view: 'side', work: ['chest'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 60, fore: -80 }, { ...STAND, upper: 20, fore: -110 }],
}
const armsOpen: Figure = {
  view: 'front', work: ['chest', 'shoulders'], props: [], period: 2000,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: -110, fore: -100 },
    { torso: 0, thigh: 174, shin: 180, upper: 95, fore: 100 },
  ],
}
const armCircles: Figure = {
  view: 'front', work: ['shoulders'], props: [], period: 1200,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 80, fore: 80 },
    { torso: 0, thigh: 174, shin: 180, upper: 100, fore: 100 },
  ],
}
const shoulderCircles: Figure = {
  view: 'front', work: ['shoulders'], props: [], period: 1600,
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: 176, fore: 178 }, { torso: 0, thigh: 174, shin: 180, upper: 176, fore: 178, shrug: 8 }],
}
const elbowCircles: Figure = {
  view: 'front', work: ['shoulders'], props: [], period: 1600,
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: 70, fore: -60 }, { torso: 0, thigh: 174, shin: 180, upper: 110, fore: -30 }],
}
const crossBodyStretch: Figure = {
  view: 'front', work: ['shoulders'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 176, fore: 178, upper2: 176, fore2: 178 },
    { torso: 0, thigh: 174, shin: 180, upper: -80, fore: -90, upper2: 160, fore2: -80 },
  ],
}
const tricepsStretch: Figure = {
  sweep: ['upper', 'fore', 'upper2', 'fore2'], view: 'front', work: ['arms'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 0, fore: -10, upper2: 176, fore2: 178 },
    { torso: 0, thigh: 174, shin: 180, upper: -10, fore: -160, upper2: -30, fore2: 60 },
  ],
}
const lateralStretch: Figure = {
  view: 'front', work: ['core', 'back'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 172, shin: 180, upper: 5, fore: 0, upper2: 176, fore2: 178 },
    { torso: -16, head: -14, thigh: 172, shin: 180, upper: -25, fore: -40, upper2: 180, fore2: 178 },
  ],
}
const lateralStretchBoth: Figure = {
  ...lateralStretch,
  frames: [
    { torso: 0, thigh: 172, shin: 180, upper: 5, fore: 0, upper2: 5, fore2: 0 },
    { torso: -16, head: -14, thigh: 172, shin: 180, upper: -25, fore: -40, upper2: 5, fore2: -30 },
  ],
}
const neckForward: Figure = {
  view: 'side', work: ['shoulders'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 178, fore: 178 }, { ...STAND, head: 55, upper: 20, fore: -90 }],
}
const neckSide: Figure = {
  sweep: ['upper', 'fore', 'upper2', 'fore2'], view: 'front', work: ['shoulders'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 176, fore: 178 },
    { torso: 0, head: -32, thigh: 174, shin: 180, upper: -10, fore: -80 },
  ],
}
const neckIsoFront: Figure = {
  view: 'side', work: ['shoulders'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 120, fore: 10 }, { ...STAND, head: 12, upper: 118, fore: 8 }],
}
const neckIsoSide: Figure = {
  view: 'front', work: ['shoulders'], props: [], period: HOLD,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 40, fore: -30, upper2: 176, fore2: 178 },
    { torso: 0, head: 8, thigh: 174, shin: 180, upper: 40, fore: -30, upper2: 176, fore2: 178 },
  ],
}
const standingTall: Figure = {
  view: 'side', work: ['core'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 170, fore: 120 }, { ...STAND, torsoLen: 0.97, upper: 170, fore: 120 }],
}
const pelvicTilt: Figure = {
  view: 'side', work: ['core'], props: [], period: 2400,
  frames: [{ ...STAND, torso: 6, thigh: 176, shin: 184, upper: 170, fore: 120 }, { ...STAND, torso: -4, thigh: 172, shin: 188, upper: 170, fore: 120 }],
}
const frontLegSwing: Figure = {
  view: 'side', work: ['legs'], props: [], period: 1600,
  frames: [
    { ...STAND, thigh: -150, shin: -150, thigh2: 180, shin2: 180, foot: 150, upper: 90, fore: 90 },
    { ...STAND, thigh: 85, shin: 85, thigh2: 180, shin2: 180, foot: 0, upper: 90, fore: 90 },
  ],
}
const wallLat: Figure = {
  view: 'side', work: ['back'], props: [{ type: 'box', span: [230, 244], y: 60 }], period: HOLD,
  frames: [
    { torso: 50, head: 55, thigh: 170, shin: 184, foot: 90, upper: 60, fore: 65 },
    { torso: 82, head: 90, thigh: 150, shin: 186, foot: 90, upper: 88, fore: 90 },
  ],
}
const roundBack: Figure = {
  view: 'side', work: ['back'], props: [], period: HOLD,
  frames: [{ ...STAND, upper: 90, fore: 90 }, { ...STAND, torso: 14, head: 50, thigh: 170, shin: 186, upper: 95, fore: 92 }],
}
const oneHandHang: Figure = { ...oneArm(pullUp, 180, 175), period: HOLD, frames: [{ ...pullUp.frames[0], upper2: 180, fore2: 175 }, { ...pullUp.frames[0], torso: 6, upper2: 180, fore2: 175 }] }
const wristCircles: Figure = {
  view: 'side', work: ['forearms'], props: [], period: 1400,
  frames: [{ ...STAND, upper: 170, fore: 80 }, { ...STAND, upper: 170, fore: 100 }],
}
const ankleCircles: Figure = {
  view: 'side', work: ['calves'], anchor: { joint: 'hip', at: [100, 172] }, props: [{ type: 'seat', span: [70, 130], y: 184 }], period: 1600,
  frames: [
    { torso: 0, thigh: 90, shin: 180, thigh2: 70, shin2: 140, foot: 90, foot2: 60, upper: 160, fore: 110 },
    { torso: 0, thigh: 90, shin: 180, thigh2: 70, shin2: 140, foot: 90, foot2: 130, upper: 160, fore: 110 },
  ],
}
// Rodillo de espuma: el cuerpo se desplaza por encima del rodillo, que se queda en el suelo.
const roller = (x: number): Prop => ({ type: 'ball', point: [x, 212], size: 10 })
const smrQuad: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'elbow', at: [190, 216] }, shadow: 110, props: [roller(110)], period: 3000,
  frames: [
    { torso: 84, head: 84, thigh: -94, shin: -94, foot: 180, upper: 180, fore: 90 },
    { torso: 84, head: 84, thigh: -94, shin: -94, foot: 180, upper: 150, fore: 90, shift: -22 },
  ],
}
const smrHam: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'wrist', at: [60, 218] }, shadow: 110, props: [roller(135)], period: 3000,
  frames: [
    { torso: -58, head: -40, thigh: 94, shin: 90, foot: 20, upper: -160, fore: -170 },
    { torso: -48, head: -35, thigh: 94, shin: 90, foot: 20, upper: -150, fore: -165, shift: 24 },
  ],
}
const smrCalf: Figure = { ...smrHam, work: ['calves'], props: [roller(190)] }
const smrBack: Figure = {
  view: 'side', work: ['back'], anchor: { joint: 'shoulder', at: [62, 196] }, shadow: 100, props: [{ type: 'ball', point: [64, 210], size: 10 }], period: 3000,
  frames: [
    { torso: -100, head: -120, thigh: 76, shin: 168, foot: 90, upper: 60, fore: -110 },
    { torso: -88, head: -110, thigh: 62, shin: 162, foot: 90, upper: 60, fore: -110, shift: -14 },
  ],
}
const smrSide: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'elbow', at: [60, 216] }, shadow: 110, props: [roller(130)], period: 3000,
  frames: [
    { torso: -80, head: -80, thigh: 94, shin: 90, foot: 20, upper: 180, fore: -90 },
    { torso: -80, head: -80, thigh: 94, shin: 90, foot: 20, upper: 160, fore: -90, shift: 22 },
  ],
}
const smrFoot: Figure = {
  view: 'side', work: ['calves'], props: [{ type: 'ball', point: [150, 215], size: 6, front: true }], period: 2000,
  frames: [
    { ...STAND, thigh: 164, shin: 176, thigh2: 182, shin2: 182, foot: 90, upper: 180, fore: 170 },
    { ...STAND, thigh: 172, shin: 168, thigh2: 182, shin2: 182, foot: 90, upper: 180, fore: 170 },
  ],
}
const smrArm: Figure = {
  view: 'side', work: ['arms'], anchor: { joint: 'knee', at: [100, 214] }, shadow: 100, props: [roller(170)], period: 3000,
  frames: [
    { torso: 82, head: 88, thigh: 178, shin: -90, foot: -100, upper: 158, fore: 100, upper2: 170, fore2: 170 },
    { torso: 82, head: 88, thigh: 178, shin: -90, foot: -100, upper: 168, fore: 100, upper2: 170, fore2: 170 },
  ],
}
const smrNeck: Figure = {
  view: 'side', work: ['shoulders'], ...onFloor, props: [{ ...roller(54), front: true }], period: 3000,
  frames: [{ ...LYING_FLOOR, head: -70, thigh: 45, shin: 150, foot: 95, upper: 92, fore: 90 }, { ...LYING_FLOOR, head: -62, thigh: 45, shin: 150, foot: 95, upper: 92, fore: 90, shift: 6 }],
}
const windmillStretch: Figure = {
  ...windmill, props: [], period: 2400,
  frames: [
    { torso: 0, thigh: 160, shin: 182, upper: 92, fore: 92, upper2: 92, fore2: 92 },
    { torso: -70, head: -50, thigh: 158, shin: 182, upper: -10, fore: -10, upper2: 192, fore2: 192 },
  ],
}

// ---------------------------------------------------------------- tren superior (ampliación)
const declinePress: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'hip', at: [138, 150] }, shadow: 100,
  props: [...declineBench, { type: 'plate', at: 'wrist', front: true, size: 28 }],
  frames: [
    { torso: -104, head: -100, thigh: 62, shin: 165, foot: 90, upper: 2, fore: 0 },
    { torso: -104, head: -100, thigh: 62, shin: 165, foot: 90, upper: 115, fore: -2 },
  ],
}
const declinePressDumbbell: Figure = { ...declinePress, props: [...declineBench, { type: 'dumbbell', at: 'wrist', front: true }] }
const declineFlyes: Figure = {
  ...declinePressDumbbell, work: ['chest'],
  frames: [{ ...declinePress.frames[0], upper: 2, fore: 5 }, { ...declinePress.frames[0], upper: 112, fore: 106 }],
}
const pullover: Figure = {
  ...benchPress, work: ['chest', 'back'], props: [flatBench, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...LYING, upper: 5, fore: 5 }, { ...LYING, upper: -98, fore: -100 }],
}
const pulloverBentArm: Figure = {
  ...pullover, props: [flatBench, { type: 'plate', at: 'wrist', front: true, size: 20 }],
  frames: [{ ...LYING, upper: 20, fore: -25 }, { ...LYING, upper: -85, fore: -140 }],
}
const pulloverDecline: Figure = { ...declinePress, work: ['chest', 'back'], frames: [{ ...declinePress.frames[0], upper: 5, fore: 5 }, { ...declinePress.frames[0], upper: -100, fore: -100 }] }
const frontRaisePullover: Figure = {
  ...pulloverBentArm, sweep: ['upper', 'fore', 'upper2', 'fore2'], frames: [{ ...LYING, upper: 112, fore: 110 }, { ...LYING, upper: -95, fore: -95 }],
}
const aroundWorld: Figure = { ...pullover, sweep: ['upper', 'fore', 'upper2', 'fore2'], frames: [{ ...LYING, upper: 112, fore: 110 }, { ...LYING, upper: -92, fore: -92 }] }
// Flexión con las manos en un cajón: manos fijas y el cuerpo recto gira sobre las puntas.
const inclinePushUp: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'wrist', at: [160, 168] }, shadow: 110,
  props: [{ type: 'box', span: [146, 206], y: 172 }],
  frames: [
    { torso: 45.8, head: 55, thigh: -134.2, shin: -134.2, foot: 110, upper: 175, fore: 175 },
    { torso: 54.1, head: 62, thigh: -125.9, shin: -125.9, foot: 110, upper: -125, fore: 150 },
  ],
}
const pushUpBall: Figure = { ...declinePushUp, props: [{ type: 'ball', point: [36, 180], size: 38 }] }
const pushUpSuspended: Figure = { ...inclinePushUp, props: [{ type: 'cable', at: 'wrist', point: [200, -60] }] }
const plyoPushUp: Figure = {
  ...pushUp, period: 1600,
  frames: [pushUp.frames[1], { ...pushUp.frames[0], torso: 66, thigh: -114, shin: -114, upper: 170, fore: 170 }],
}
const pushUpSidePlank: Figure = {
  ...pushUp, work: ['chest', 'core'],
  frames: [pushUp.frames[0], { ...pushUp.frames[0], upper2: 5, fore2: 5 }],
}
const bodyUp: Figure = {
  ...pushUp, work: ['arms'], anchor: { joint: 'toe', at: [17, 219] },
  frames: [
    { torso: 82, head: 84, thigh: -98, shin: -98, foot: 180, upper: 180, fore: 90 },
    { torso: 74, head: 78, thigh: -106, shin: -106, foot: 180, upper: 170, fore: 150 },
  ],
}
const cableCrossLow: Figure = { ...cableCross, props: [{ type: 'cable', at: 'wrist', point: [236, 214] }, { type: 'cable', at: 'wrist2', point: [24, 214] }], frames: [{ torso: 0, thigh: 175, shin: 180, upper: 150, fore: 160 }, { torso: 0, thigh: 175, shin: 180, upper: 165, fore: -140 }] }
const cableCrossOneArm = oneArm({ ...cableCross, props: [{ type: 'cable', at: 'wrist', point: [236, 40] }] }, 176, 178)
// Press de pecho sentado (máquina) o de pie con polea: de las manos junto al pecho a los brazos estirados.
const PRESS_CHEST = { upper: -125, fore: 85 }
const PRESS_OUT = { upper: 90, fore: 90 }
const machineChestPress: Figure = {
  view: 'side', work: ['chest', 'arms'], anchor: { joint: 'hip', at: [100, 172] },
  props: [{ type: 'seat', span: [76, 136], y: 184, back: [66, 92, 90] }, { type: 'grip', at: 'wrist', front: true }],
  frames: [{ torso: -4, thigh: 90, shin: 180, foot: 90, ...PRESS_CHEST }, { torso: -4, thigh: 90, shin: 180, foot: 90, ...PRESS_OUT }],
}
const machineInclinePress: Figure = {
  ...machineChestPress, work: ['chest', 'shoulders'],
  frames: [{ torso: -18, thigh: 90, shin: 180, foot: 90, upper: -140, fore: 60 }, { torso: -18, thigh: 90, shin: 180, foot: 90, upper: 50, fore: 50 }],
}
const machineDeclinePress: Figure = {
  ...machineChestPress,
  frames: [{ torso: -4, thigh: 90, shin: 180, foot: 90, upper: -110, fore: 115 }, { torso: -4, thigh: 90, shin: 180, foot: 90, upper: 118, fore: 118 }],
}
const standingCablePress: Figure = {
  view: 'side', work: ['chest', 'arms'], props: [{ type: 'cable', at: 'wrist', point: [20, 110] }],
  frames: [{ ...LUNGE_TOP, thigh: 160, torso: 10, ...PRESS_CHEST }, { ...LUNGE_TOP, thigh: 160, torso: 10, ...PRESS_OUT }],
}
const chestPass: Figure = {
  view: 'side', work: ['chest', 'arms'], props: [{ type: 'ball', at: 'wrist', angle: 90, offset: 6, size: 10, front: true }], period: 1800,
  frames: [
    { torso: 8, thigh: 162, shin: 192, foot: 90, upper: 168, fore: 12 },
    { torso: 12, thigh: 172, shin: 186, foot: 120, upper: 88, fore: 88 },
  ],
}
const plateSqueezePress: Figure = { ...chestPass, period: 2600, props: [{ type: 'plate', at: 'wrist', angle: 90, offset: 4, size: 13, front: true }], frames: [{ ...STAND, upper: 168, fore: 12 }, { ...STAND, upper: 90, fore: 90 }] }
const kettlebellPushUp: Figure = { ...pushUp, props: [{ type: 'kettlebell', point: [150, 222], up: true }] }

// Tríceps
const tricepsKickback: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 68, head: 78, thigh: 162, shin: 186, foot: 90, upper: -112, fore: 178 },
    { torso: 68, head: 78, thigh: 162, shin: 186, foot: 90, upper: -112, fore: -110 },
  ],
}
const tricepsKickbackSeated: Figure = {
  ...tricepsKickback, anchor: { joint: 'hip', at: [100, 160] }, props: [{ type: 'seat', span: [70, 130], y: 172 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 62, head: 75, thigh: 90, shin: 180, foot: 90, upper: -118, fore: 178 },
    { torso: 62, head: 75, thigh: 90, shin: 180, foot: 90, upper: -118, fore: -116 },
  ],
}
const overheadTricepsCable: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'cable', at: 'wrist', point: [20, 200] }],
  frames: [{ ...LUNGE_TOP, thigh: 160, torso: 20, upper: 15, fore: -160 }, { ...LUNGE_TOP, thigh: 160, torso: 20, upper: 15, fore: 18 }],
}
const overheadTricepsBand: Figure = { ...overheadTriceps, props: [{ type: 'band', at: 'wrist', point: [40, 200] }] }
const seatedOverheadTriceps: Figure = {
  ...seatedPress, work: ['arms'],
  frames: [{ torso: 0, thigh: 90, shin: 180, foot: 90, upper: 5, fore: -170 }, { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 5, fore: 3 }],
}
const kneelingCableTriceps: Figure = {
  ...cableCrunchKneeling, work: ['arms'], props: [{ type: 'cable', at: 'wrist', point: [30, 40] }],
  frames: [
    { torso: 60, head: 70, thigh: 170, shin: -90, foot: -100, upper: 60, fore: -110 },
    { torso: 60, head: 70, thigh: 170, shin: -90, foot: -100, upper: 60, fore: 62 },
  ],
}
const inclineSkull: Figure = {
  ...incline, work: ['arms'], props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'plate', at: 'wrist', front: true, size: 24 }],
  frames: [{ ...LYING, torso: -58, head: -58, upper: -20, fore: -18 }, { ...LYING, torso: -58, head: -58, upper: -20, fore: -130 }],
}
const inclineSkullCable: Figure = { ...inclineSkull, props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'cable', at: 'wrist', point: [10, 200] }] }
const declineSkull: Figure = {
  ...declinePress, work: ['arms'],
  frames: [{ ...declinePress.frames[0], upper: -8, fore: -5 }, { ...declinePress.frames[0], upper: -8, fore: -120 }],
}
const declineSkullDumbbell: Figure = { ...declineSkull, props: [...declineBench, { type: 'dumbbell', at: 'wrist', front: true }] }
const jmPress: Figure = { ...benchPress, work: ['arms'], props: [flatBench, { type: 'plate', at: 'wrist', front: true, size: 24 }], frames: [{ ...LYING, upper: 2, fore: 0 }, { ...LYING, upper: 60, fore: -60 }] }
const skullCable: Figure = { ...skullCrusher, props: [flatBench, { type: 'cable', at: 'wrist', point: [10, 200] }] }
const skullOneArm = oneArm(skullCrusherDumbbell, 92, 90)

// Bíceps
const preacherPad: Prop = { type: 'bench', span: [96, 140], y: 146, tilt: 48 }
const preacher: Figure = {
  view: 'side', work: ['arms'], anchor: { joint: 'hip', at: [100, 172] },
  props: [{ type: 'seat', span: [76, 126], y: 184 }, preacherPad, { type: 'plate', at: 'wrist', front: true, size: 20 }],
  frames: [
    { torso: 10, head: 20, thigh: 90, shin: 180, foot: 90, upper: 138, fore: 140 },
    { torso: 10, head: 20, thigh: 90, shin: 180, foot: 90, upper: 138, fore: 12 },
  ],
}
const preacherDumbbell: Figure = { ...preacher, props: [{ type: 'seat', span: [76, 126], y: 184 }, preacherPad, { type: 'dumbbell', at: 'wrist', front: true }] }
const preacherCable: Figure = { ...preacher, props: [{ type: 'seat', span: [76, 126], y: 184 }, preacherPad, { type: 'cable', at: 'wrist', point: [220, 214] }] }
const preacherMachine: Figure = { ...preacher, props: [{ type: 'seat', span: [76, 126], y: 184 }, preacherPad, { type: 'grip', at: 'wrist', front: true }] }
const spiderCurl: Figure = {
  view: 'side', work: ['arms'], anchor: { joint: 'toe', at: [60, 219] },
  props: [{ type: 'bench', span: [45, 125], y: 101, tilt: -45 }, { type: 'plate', at: 'wrist', front: true, size: 18 }],
  frames: [
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: 180, fore: 180 },
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: 180, fore: 30 },
  ],
}
const spiderCurlDumbbell: Figure = { ...spiderCurl, props: [{ type: 'bench', span: [45, 125], y: 101, tilt: -45 }, { type: 'dumbbell', at: 'wrist', front: true }] }
const inclineBench: Prop[] = [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }]
const inclineCurl: Figure = {
  view: 'side', work: ['arms'], anchor: { joint: 'hip', at: [128, 160] },
  props: [...inclineBench, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: -38, head: -30, thigh: 90, shin: 180, foot: 90, upper: 180, fore: 180 },
    { torso: -38, head: -30, thigh: 90, shin: 180, foot: 90, upper: 182, fore: 35 },
  ],
}
const inclineCurlAlternate = alternate(inclineCurl)
const inclineCurlBar: Figure = { ...inclineCurl, props: [...inclineBench, { type: 'plate', at: 'wrist', front: true, size: 20 }] }
const lyingCurl: Figure = { ...inclineCurl, anchor: { joint: 'hip', at: [128, 150] }, props: [{ type: 'bench', span: [34, 150], y: 158 }, { type: 'dumbbell', at: 'wrist', front: true }], frames: [{ ...LYING, torso: -84, upper: 195, fore: 195 }, { ...LYING, torso: -84, upper: 195, fore: 60 }] }
const concentrationCurl: Figure = {
  view: 'side', work: ['arms'], anchor: { joint: 'hip', at: [100, 166] },
  props: [{ type: 'seat', span: [70, 130], y: 178 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 48, head: 70, thigh: 88, shin: 180, foot: 90, upper: 172, fore: 172 },
    { torso: 48, head: 70, thigh: 88, shin: 180, foot: 90, upper: 172, fore: 20 },
  ],
}
const concentrationCurlBar: Figure = { ...concentrationCurl, props: [{ type: 'seat', span: [70, 130], y: 178 }, { type: 'plate', at: 'wrist', front: true, size: 18 }] }
const concentrationStanding: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 70, head: 80, thigh: 150, shin: 196, foot: 90, upper: 178, fore: 178 },
    { torso: 70, head: 80, thigh: 150, shin: 196, foot: 90, upper: 178, fore: 30 },
  ],
}
const seatedCurl: Figure = {
  ...seatedPress, work: ['arms'],
  frames: [{ torso: 0, thigh: 90, shin: 180, foot: 90, upper: 176, fore: 176 }, { torso: 0, thigh: 90, shin: 180, foot: 90, upper: 174, fore: 22 }],
}
const dragCurl: Figure = { ...curlBarbell, frames: [{ ...STAND, upper: 176, fore: 176 }, { ...STAND, upper: -145, fore: 25 }] }
const curlPlate: Figure = { ...curlDumbbell, props: [{ type: 'plate', at: 'wrist', front: true, size: 16 }] }
const highCableCurl: Figure = {
  view: 'front', work: ['arms'], props: [{ type: 'cable', at: 'wrist', point: [250, 40] }, { type: 'cable', at: 'wrist2', point: [10, 40] }],
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: 90, fore: 90 }, { torso: 0, thigh: 174, shin: 180, upper: 90, fore: -25 }],
}
const lyingCableCurl: Figure = {
  view: 'side', work: ['arms'], ...onFloor, props: [{ type: 'cable', at: 'wrist', point: [250, 205] }],
  frames: [{ ...LYING_FLOOR, thigh: 90, shin: 90, foot: 10, upper: 85, fore: 85 }, { ...LYING_FLOOR, thigh: 90, shin: 90, foot: 10, upper: 85, fore: -20 }],
}
const machineCurl: Figure = { ...preacherMachine }

// Hombro
const frontRaise: Figure = {
  view: 'side', work: ['shoulders'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...STAND, upper: 176, fore: 176 }, { ...STAND, upper: 88, fore: 86 }],
}
const frontRaiseAlternate = alternate(frontRaise)
const frontRaisePlate: Figure = { ...frontRaise, props: [{ type: 'plate', at: 'wrist', front: true, size: 18 }] }
const frontRaiseCable: Figure = { ...frontRaise, props: [{ type: 'cable', at: 'wrist', point: [60, 214] }] }
const frontRaiseOverhead: Figure = { ...frontRaise, frames: [frontRaise.frames[0], { ...STAND, upper: 4, fore: 2 }] }
const frontRaiseOverheadBar: Figure = { ...frontRaiseOverhead, props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }] }
const inclineFrontRaise: Figure = {
  ...inclineCurl, work: ['shoulders'],
  frames: [{ ...inclineCurl.frames[0], upper: 175, fore: 175 }, { ...inclineCurl.frames[0], upper: 60, fore: 60 }],
}
const inclineShoulderRaise: Figure = {
  ...incline, work: ['shoulders'], period: 1600,
  frames: [{ ...LYING, torso: -58, head: -58, upper: 5, fore: 2 }, { ...LYING, torso: -58, head: -58, upper: 5, fore: 2, shrug: 7 }],
}
const inclineShoulderRaiseDumbbell: Figure = { ...inclineShoulderRaise, props: [{ type: 'bench', span: [60, 150], y: 170 }, { type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }, { type: 'dumbbell', at: 'wrist', front: true }] }
// Pájaros vistos de frente: el tronco inclinado hacia delante (escorzo) y los brazos se abren.
const BENT_FRONT = { torso: 0, torsoLen: 0.55, thigh: 168, shin: 188 }
const rearFly: Figure = {
  view: 'front', work: ['shoulders', 'back'], props: [{ type: 'dumbbell', at: 'wrist', front: true }, { type: 'dumbbell', at: 'wrist2', front: true }],
  frames: [{ ...BENT_FRONT, upper: 178, fore: 176 }, { ...BENT_FRONT, upper: 96, fore: 100 }],
}
const rearFlySeated: Figure = {
  ...rearFly, anchor: { joint: 'hip', at: [140, 146] }, props: [seatFront, ...rearFly.props],
  frames: [{ ...SEATED_FRONT, torsoLen: 0.5, upper: 178, fore: 176 }, { ...SEATED_FRONT, torsoLen: 0.5, upper: 96, fore: 100 }],
}
const rearFlyCable: Figure = { ...rearFly, props: [{ type: 'cable', at: 'wrist', point: [40, 214] }, { type: 'cable', at: 'wrist2', point: [220, 214] }] }
const rearFlyBand: Figure = { ...rearFly, props: [{ type: 'band', at: 'wrist', to: 'wrist2' }] }
const reverseMachineFly: Figure = {
  ...pecDeckSeated, work: ['shoulders', 'back'],
  frames: [{ ...SEATED_FRONT, upper: 150, fore: 175 }, { ...SEATED_FRONT, upper: 92, fore: 92 }],
}
const bandPullApart: Figure = {
  view: 'front', work: ['shoulders', 'back'], props: [{ type: 'band', at: 'wrist', to: 'wrist2' }],
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: 115, fore: -95 }, { torso: 0, thigh: 174, shin: 180, upper: 92, fore: 94 }],
}
const externalRotation: Figure = {
  view: 'front', work: ['shoulders'], props: [{ type: 'band', at: 'wrist', point: [20, 92] }],
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: 176, fore: -80, upper2: 176, fore2: 178 }, { torso: 0, thigh: 174, shin: 180, upper: 176, fore: 70, upper2: 176, fore2: 178 }],
}
const externalRotationCable: Figure = { ...externalRotation, props: [{ type: 'cable', at: 'wrist', point: [20, 92] }] }
const internalRotation: Figure = { ...externalRotation, props: [{ type: 'band', at: 'wrist', point: [250, 92] }], frames: [externalRotation.frames[1], externalRotation.frames[0]] }
const internalRotationCable: Figure = { ...internalRotation, props: [{ type: 'cable', at: 'wrist', point: [250, 92] }] }
const cubanPress: Figure = {
  ...uprightDumbbell, sweep: ['upper', 'fore', 'upper2', 'fore2'],
  frames: [{ torso: 0, thigh: 176, shin: 180, upper: 110, fore: 200 }, { torso: 0, thigh: 176, shin: 180, upper: 30, fore: 5 }],
}
const uprightOneArm = oneArm(uprightDumbbell, 186, 190)
const PRESS_DIP = { torso: 5, thigh: 162, shin: 196, foot: 90 }
const pushPress: Figure = {
  view: 'side', work: ['shoulders', 'legs'], props: [{ type: 'plate', at: 'wrist', front: true, size: 22 }], period: 2000,
  frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, { ...STAND, foot: 115, upper: 2, fore: 0 }],
}
const pushPressKettlebell: Figure = { ...pushPress, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] }
const pushPressKettlebellOne = oneArm(pushPressKettlebell, 180, 180)
const pressBehindNeck: Figure = { ...overheadPress, frames: [{ ...STAND, ...armsOnBar }, { ...STAND, upper: 2, fore: 0 }] }
const pushPressBehindNeck: Figure = { ...pushPress, frames: [{ ...PRESS_DIP, ...armsOnBar }, { ...STAND, foot: 115, upper: 2, fore: 0 }] }
const bradfordPress: Figure = { ...overheadPress, frames: [{ ...STAND, upper: 158, fore: 8 }, { ...STAND, upper: -20, fore: -40 }] }
const seatedPressBar: Figure = { ...seatedPress, props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 82, 100] }, { type: 'plate', at: 'wrist', front: true, size: 20 }] }
const machinePress: Figure = { ...seatedPress, props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 82, 100] }, { type: 'grip', at: 'wrist', front: true }] }
const cablePress: Figure = { ...overheadPress, props: [{ type: 'cable', at: 'wrist', point: [100, 214] }] }
const cablePressSeated: Figure = { ...seatedPress, props: [{ type: 'seat', span: [86, 146], y: 184, back: [80, 82, 100] }, { type: 'cable', at: 'wrist', point: [80, 214] }] }
const cablePressAlternate = alternate(cablePress)
const antiGravityPress: Figure = {
  view: 'side', work: ['shoulders'], anchor: { joint: 'toe', at: [60, 219] },
  props: [{ type: 'bench', span: [45, 125], y: 101, tilt: -45 }, { type: 'plate', at: 'wrist', front: true, size: 18 }],
  frames: [
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: 170, fore: -10 },
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: 45, fore: 45 },
  ],
}
const landmineJammer: Figure = {
  view: 'side', work: ['shoulders', 'chest'], props: [{ type: 'cable', at: 'wrist', point: [0, 214] }],
  frames: [{ ...LUNGE_TOP, thigh: 160, torso: 12, upper: 165, fore: 20 }, { ...LUNGE_TOP, thigh: 160, torso: 18, upper: 52, fore: 50 }],
}
const landmineJammerOne = oneArm(landmineJammer, 180, 180)
const sidePress: Figure = {
  view: 'front', work: ['shoulders'], props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [
    { torso: 0, thigh: 170, shin: 182, upper: 150, fore: 0, upper2: 180, fore2: 180 },
    { torso: -12, head: -10, thigh: 170, shin: 182, upper: 5, fore: 2, upper2: 180, fore2: 180 },
  ],
}
const seeSawPress: Figure = {
  ...sidePress, props: [{ type: 'dumbbell', at: 'wrist', front: true }, { type: 'dumbbell', at: 'wrist2', front: true }],
  frames: [
    { torso: 8, thigh: 170, shin: 182, upper: 150, fore: 0, upper2: 5, fore2: 2 },
    { torso: -8, thigh: 170, shin: 182, upper: 5, fore: 2, upper2: 150, fore2: 0 },
  ],
}
const paraPress: Figure = oneArm({ ...overheadPress, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }], frames: [{ ...STAND, upper: 120, fore: -20 }, { ...STAND, upper: 2, fore: 0 }] }, 180, 180)
const halo: Figure = {
  view: 'front', work: ['shoulders'], props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }], period: 2000,
  frames: [
    { torso: 0, thigh: 174, shin: 180, upper: 40, fore: -95 },
    { torso: 0, thigh: 174, shin: 180, upper: 150, fore: -40 },
  ],
}
const haloExtension: Figure = { ...halo, frames: [halo.frames[0], { torso: 0, thigh: 174, shin: 180, upper: 10, fore: -30 }] }
const pirateShips: Figure = {
  view: 'front', work: ['shoulders'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [
    { torso: 0, thigh: 162, shin: 184, upper: 60, fore: 60, upper2: -90, fore2: -60 },
    { torso: 0, thigh: 162, shin: 184, upper: -90, fore: -60, upper2: 60, fore2: 60 },
  ],
}
const turkishGetUp: Figure = {
  view: 'side', work: ['shoulders', 'core'], ...onFloor, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }], period: 3200,
  frames: [
    { ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: 2, fore: 0, upper2: 110, fore2: 92 },
    { torso: -35, head: -25, thigh: 45, shin: 150, foot: 95, upper: 2, fore: 0, upper2: -160, fore2: -172 },
  ],
}
const battleRopes: Figure = {
  view: 'side', work: ['shoulders', 'arms'], props: [{ type: 'cable', at: 'wrist', point: [260, 214] }], period: 700,
  frames: [
    { torso: 22, head: 30, thigh: 142, shin: 202, foot: 90, upper: 70, fore: 70 },
    { torso: 22, head: 30, thigh: 142, shin: 202, foot: 90, upper: 145, fore: 140 },
  ],
}
const crucifixHold: Figure = { ...lateralRaise, period: HOLD, frames: [lateralRaise.frames[1], { ...lateralRaise.frames[1], upper: 96, fore: 100 }] }
const carDrivers: Figure = {
  view: 'side', work: ['shoulders'], props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }], period: 1600,
  frames: [{ ...STAND, upper: 86, fore: 86 }, { ...STAND, upper: 94, fore: 92 }],
}
const backwardWalkArmsUp: Figure = {
  view: 'side', work: ['shoulders', 'legs'], props: [{ type: 'cable', at: 'wrist', point: [260, 200] }], period: 1400,
  frames: [
    { torso: -4, thigh: 160, shin: 185, thigh2: -165, shin2: -160, foot: 90, foot2: 120, upper: 20, fore: 20 },
    { torso: -4, thigh: -165, shin: -160, thigh2: 160, shin2: 185, foot: 120, foot2: 90, upper: 20, fore: 20 },
  ],
}

// Espalda
const straightArmPulldown: Figure = {
  view: 'side', work: ['back'], props: [{ type: 'cable', at: 'wrist', point: [230, -10] }],
  frames: [
    { torso: 22, head: 25, thigh: 170, shin: 186, foot: 90, upper: 42, fore: 40 },
    { torso: 22, head: 25, thigh: 170, shin: 186, foot: 90, upper: 188, fore: 188 },
  ],
}
const kneelingPulldown: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'knee', at: [110, 214] }, props: [{ type: 'cable', at: 'wrist', point: [150, -40] }],
  frames: [
    { torso: 2, head: 0, thigh: 178, shin: -90, foot: -100, upper: 18, fore: 12 },
    { torso: -6, head: 0, thigh: 178, shin: -90, foot: -100, upper: 168, fore: 18 },
  ],
}
const kneelingPulldownOne = oneArm(kneelingPulldown, 170, 170)
const muscleUp: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'wrist', at: [132, -40] }, props: [{ type: 'bar', span: [80, 190], y: -42 }], period: 3000,
  frames: [
    { torso: 2, head: 0, thigh: 184, shin: -165, foot: 180, upper: 2, fore: 0 },
    { torso: 12, head: 10, thigh: 190, shin: -160, foot: 180, upper: 182, fore: 178 },
  ],
}
const ropeClimb: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'wrist', at: [134, -40] }, props: [{ type: 'cable', at: 'ankle', point: [134, -120] }], period: 3000,
  frames: [
    { torso: 2, head: 0, thigh: 140, shin: 190, foot: 120, upper: 2, fore: 0 },
    { torso: -4, head: 0, thigh: 110, shin: 190, foot: 120, upper: 160, fore: 12 },
  ],
}
const pullUpWeighted: Figure = { ...pullUp, props: [...pullUp.props, { type: 'plate', at: 'hip', angle: 180, offset: 20, size: 14, front: true }] }
const pullUpOneArm = oneArm(pullUp, 180, 175)
const invertedRowStraps: Figure = { ...invertedRow, props: [{ type: 'cable', at: 'wrist', point: [70, -60] }] }
// Remo tumbado boca abajo en banco inclinado.
const proneRow: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'toe', at: [60, 219] },
  props: [{ type: 'bench', span: [45, 125], y: 101, tilt: -45 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: 180, fore: 180 },
    { torso: 45, head: 60, thigh: -150, shin: -160, foot: 120, upper: -110, fore: 170 },
  ],
}
const proneRowBar: Figure = { ...proneRow, props: [{ type: 'bench', span: [45, 125], y: 101, tilt: -45 }, { type: 'plate', at: 'wrist', front: true, size: 20 }] }
const proneFlatRow: Figure = {
  view: 'side', work: ['back', 'arms'], anchor: { joint: 'hip', at: [100, 140] }, props: [{ type: 'bench', span: [40, 200], y: 150 }, { type: 'plate', at: 'wrist', front: true, size: 20 }],
  frames: [
    { torso: 90, head: 95, thigh: -90, shin: -90, foot: 180, upper: 180, fore: 180 },
    { torso: 90, head: 95, thigh: -90, shin: -90, foot: 180, upper: -100, fore: 175 },
  ],
}
const proneShrug: Figure = { ...proneRow, period: 1600, frames: [proneRow.frames[0], { ...proneRow.frames[0], upper: 172, shrug: -6 }] }
const renegadeRow: Figure = {
  ...pushUp, work: ['back', 'core'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [
    { torso: 73.1, head: 78, thigh: -106.9, shin: -106.9, foot: 180, upper: 180, fore: 180, upper2: 180, fore2: 180 },
    { torso: 73.1, head: 78, thigh: -106.9, shin: -106.9, foot: 180, upper: -120, fore: 170, upper2: 180, fore2: 180 },
  ],
}
const barRowOneArm = oneArm(barbellRow, 180, 180)
const standingRow: Figure = {
  view: 'side', work: ['back', 'arms'], props: [{ type: 'cable', at: 'wrist', point: [260, 200] }],
  frames: [
    { torso: 20, head: 25, thigh: 150, shin: 196, foot: 90, upper: 100, fore: 100 },
    { torso: 12, head: 15, thigh: 150, shin: 196, foot: 90, upper: -140, fore: 80 },
  ],
}

// Antebrazo
const wristCurlSeated: Figure = {
  view: 'side', work: ['forearms'], anchor: { joint: 'hip', at: [100, 172] }, period: 1400,
  props: [{ type: 'seat', span: [70, 130], y: 184 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [
    { torso: 28, head: 45, thigh: 90, shin: 180, foot: 90, upper: 160, fore: 96 },
    { torso: 28, head: 45, thigh: 90, shin: 180, foot: 90, upper: 160, fore: 78 },
  ],
}
const wristCurlSeatedBar: Figure = { ...wristCurlSeated, props: [{ type: 'seat', span: [70, 130], y: 184 }, { type: 'plate', at: 'wrist', front: true, size: 16 }] }
const wristCurlCable: Figure = { ...wristCurlSeated, props: [{ type: 'seat', span: [70, 130], y: 184 }, { type: 'cable', at: 'wrist', point: [200, 214] }] }
const wristCurlBench: Figure = {
  view: 'side', work: ['forearms'], anchor: { joint: 'knee', at: [100, 214] }, period: 1400,
  props: [{ type: 'bench', span: [140, 200], y: 168 }, { type: 'plate', at: 'wrist', front: true, size: 16 }],
  frames: [
    { torso: 60, head: 70, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 96 },
    { torso: 60, head: 70, thigh: 180, shin: -90, foot: -100, upper: 180, fore: 80 },
  ],
}
const wristCurlBenchDumbbell: Figure = { ...wristCurlBench, props: [{ type: 'bench', span: [140, 200], y: 168 }, { type: 'dumbbell', at: 'wrist', front: true }] }
const wristCurlBehind: Figure = { ...curlBarbell, work: ['forearms'], period: 1400, frames: [{ ...STAND, upper: 192, fore: 192 }, { ...STAND, upper: 192, fore: 180 }] }
const wristRoller: Figure = {
  view: 'side', work: ['forearms'], props: [{ type: 'grip', at: 'wrist', front: true }, { type: 'cable', at: 'wrist', point: [198, 196] }, { type: 'plate', point: [198, 204], size: 12 }], period: 1200,
  frames: [{ ...STAND, upper: 90, fore: 90 }, { ...STAND, upper: 94, fore: 86 }],
}
const plateHold: Figure = { ...calfStand, work: ['forearms'], period: HOLD, props: [{ type: 'plate', at: 'wrist', front: true, size: 18 }], frames: [{ ...STAND, upper: 180, fore: 180 }, { ...STAND, upper: 180, fore: 180, shrug: 2 }] }
const lyingPronation: Figure = { ...lyingCurl, work: ['forearms'], period: 1400, frames: [{ ...LYING, torso: -84, upper: 100, fore: 0 }, { ...LYING, torso: -84, upper: 100, fore: 15 }] }

// Cuello
const neckProne: Figure = {
  view: 'side', work: ['shoulders'], anchor: { joint: 'hip', at: [100, 158] }, shadow: 100,
  props: [{ type: 'bench', span: [40, 160], y: 168 }, { type: 'plate', at: 'head', size: 10, front: true }],
  frames: [{ ...PRONE, head: 150, upper: 180, fore: 180 }, { ...PRONE, head: 70, upper: 180, fore: 180 }],
}
const neckSupine: Figure = {
  view: 'side', work: ['shoulders'], anchor: { joint: 'hip', at: [128, 160] }, shadow: 100,
  props: [{ type: 'bench', span: [60, 180], y: 168 }, { type: 'plate', at: 'head', size: 10, front: true }],
  frames: [{ ...LYING, head: -140, upper: 150, fore: 150 }, { ...LYING, head: -40, upper: 150, fore: 150 }],
}
const neckHarness: Figure = {
  view: 'side', work: ['shoulders'], anchor: { joint: 'hip', at: [100, 172] },
  props: [{ type: 'seat', span: [70, 130], y: 184 }, { type: 'cable', at: 'head', point: [170, 200] }, { type: 'plate', point: [170, 204], size: 10 }],
  frames: [{ torso: 30, head: 130, thigh: 90, shin: 180, foot: 90, upper: 160, fore: 100 }, { torso: 30, head: 30, thigh: 90, shin: 180, foot: 90, upper: 160, fore: 100 }],
}

// ---------------------------------------------------------------- olímpicos y balísticos
const HANG = { torso: 38, head: 55, thigh: 166, shin: 190, foot: 90, upper: 180, fore: 180 }
const RACK_LOW = { torso: 8, head: 5, thigh: 140, shin: 208, foot: 90, upper: 100, fore: -20 }
const clean: Figure = {
  sweep: ['upper', 'fore', 'upper2', 'fore2'], view: 'side', work: ['legs', 'back', 'shoulders'], props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }], period: 2200,
  frames: [DEADLIFT_LOW, RACK_LOW],
}
const hangClean: Figure = { ...clean, frames: [HANG, RACK_LOW] }
const cleanBlocks: Figure = { ...clean, props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }], frames: [{ ...DEADLIFT_LOW, torso: 50, thigh: 125, shin: 205 }, RACK_LOW] }
const splitClean: Figure = { ...clean, frames: [DEADLIFT_LOW, { ...RACK_LOW, thigh: 110, shin: 190, thigh2: -170, shin2: -110, foot2: 150 }] }
const cleanDumbbell: Figure = { ...hangClean, props: [{ type: 'dumbbell', at: 'wrist', front: true }] }
const cleanKettlebell: Figure = {
  ...clean, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [{ ...swing.frames[0] }, { ...STAND, upper: 165, fore: 12 }],
}
const cleanKettlebellAlternate = alternate(cleanKettlebell)
const cleanKettlebellOne = oneArm(cleanKettlebell, 180, 180)
const pull: Figure = { ...clean, frames: [DEADLIFT_LOW, { ...STAND, foot: 140, upper: 182, fore: 182, shrug: 6 }] }
const hangShrug: Figure = { ...clean, work: ['back'], frames: [HANG, { ...STAND, foot: 135, upper: 180, fore: 180, shrug: 8 }] }
const OVERHEAD_SQUAT = { torso: 22, head: 15, thigh: 92, shin: 208, foot: 90, upper: -8, fore: -8 }
const snatch: Figure = { ...clean, frames: [DEADLIFT_LOW, OVERHEAD_SQUAT] }
const powerSnatch: Figure = { ...clean, frames: [DEADLIFT_LOW, { torso: 10, head: 5, thigh: 145, shin: 205, foot: 90, upper: -4, fore: -4 }] }
const hangSnatch: Figure = { ...clean, frames: [HANG, OVERHEAD_SQUAT] }
const muscleSnatch: Figure = { ...clean, frames: [HANG, { ...STAND, upper: -4, fore: -4 }] }
const splitSnatch: Figure = { ...clean, frames: [DEADLIFT_LOW, { torso: 4, thigh: 110, shin: 190, thigh2: -170, shin2: -110, foot: 90, foot2: 150, upper: -6, fore: -6 }] }
const snatchBlocks: Figure = { ...cleanBlocks, frames: [{ ...DEADLIFT_LOW, torso: 50, thigh: 125, shin: 205 }, OVERHEAD_SQUAT] }
const snatchBalance: Figure = { ...clean, frames: [{ ...PRESS_DIP, ...armsOnBar }, OVERHEAD_SQUAT] }
const overheadSquat: Figure = { ...clean, work: ['legs', 'shoulders', 'core'], frames: [{ ...STAND, upper: -4, fore: -4 }, OVERHEAD_SQUAT] }
const overheadSquatKettlebell: Figure = oneArm({ ...overheadSquat, props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }] }, 170, 150)
const snatchKettlebell: Figure = oneArm({ ...cleanKettlebell, frames: [swing.frames[0], { ...STAND, upper: 2, fore: 0 }] }, 180, 180)
const snatchKettlebellDouble: Figure = { ...cleanKettlebell, frames: [swing.frames[0], { ...STAND, upper: 2, fore: 0 }] }
const splitSnatchKettlebell: Figure = oneArm({ ...cleanKettlebell, frames: [swing.frames[0], { torso: 4, thigh: 110, shin: 190, thigh2: -170, shin2: -110, foot: 90, foot2: 150, upper: 2, fore: 0 }] }, 180, 180)
const JERK_SPLIT = { torso: 2, thigh: 140, shin: 185, thigh2: -155, shin2: -125, foot: 90, foot2: 150, upper: -2, fore: -2 }
const splitJerk: Figure = { ...pushPress, frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, JERK_SPLIT] }
const powerJerk: Figure = { ...pushPress, frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, { torso: 6, thigh: 145, shin: 205, foot: 90, upper: -2, fore: -2 }] }
const squatJerk: Figure = { ...pushPress, frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, OVERHEAD_SQUAT] }
const jerkDip: Figure = { ...pushPress, work: ['legs'], frames: [{ ...STAND, upper: 158, fore: 8 }, { ...PRESS_DIP, upper: 158, fore: 8 }] }
const jerkBalance: Figure = { ...pushPress, frames: [{ ...STAND, thigh: 160, shin: 185, thigh2: -170, shin2: -150, foot2: 140, upper: -2, fore: -2 }, JERK_SPLIT] }
const cleanAndJerk: Figure = { ...clean, frames: [DEADLIFT_LOW, JERK_SPLIT] }
const cleanAndPress: Figure = { ...clean, frames: [DEADLIFT_LOW, { ...STAND, upper: 2, fore: 0 }] }
const jerkKettlebell: Figure = { ...pushPressKettlebell, frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, { torso: 6, thigh: 145, shin: 205, foot: 90, upper: -2, fore: -2 }] }
const jerkKettlebellOne = oneArm(jerkKettlebell, 180, 180)
const splitJerkKettlebellOne = oneArm({ ...pushPressKettlebell, frames: [{ ...PRESS_DIP, upper: 158, fore: 8 }, JERK_SPLIT] }, 180, 180)
const cleanJerkKettlebellOne = oneArm({ ...cleanKettlebell, frames: [swing.frames[0], { torso: 6, thigh: 145, shin: 205, foot: 90, upper: -2, fore: -2 }] }, 180, 180)
const thruster: Figure = {
  view: 'side', work: ['legs', 'shoulders'], props: [{ type: 'kettlebell', at: 'wrist', front: true, up: true }],
  frames: [{ ...SQUAT, torso: 25, upper: 150, fore: -5 }, { ...STAND, upper: 2, fore: 0 }],
}
const verticalSwing: Figure = { ...swing, sweep: ['upper', 'fore', 'upper2', 'fore2'], props: [{ type: 'dumbbell', at: 'wrist', front: true }], frames: [swing.frames[0], { ...STAND, upper: 10, fore: 5 }] }

// ---------------------------------------------------------------- piernas (ampliación)
const squatBoxBar: Figure = { ...squatBox }
const squatFrontBox: Figure = { ...squatFront, props: [boxBehind, ...squatFront.props] }
const zercher: Figure = {
  ...squatFront, props: [{ type: 'plate', at: 'elbow', front: true, size: 21 }],
  frames: [{ ...STAND, upper: 160, fore: 40 }, { ...SQUAT, torso: 25, upper: 150, fore: 35 }],
}
const frankenstein: Figure = { ...squatFront, frames: [{ ...STAND, upper: 90, fore: 90 }, { ...SQUAT, torso: 25, upper: 90, fore: 90 }] }
const squatPlateFront: Figure = {
  ...squatGoblet, props: [{ type: 'plate', at: 'wrist', front: true, size: 16 }],
  frames: [{ ...STAND, upper: 168, fore: 12 }, { ...SQUAT, torso: 30, upper: 95, fore: 92 }],
}
const hackBarbell: Figure = {
  ...squatDumbbells, props: [{ type: 'plate', at: 'wrist' }],
  frames: [{ ...STAND, upper: 190, fore: 190 }, { ...SQUAT, torso: 25, upper: 195, fore: 195 }],
}
const hackMachine: Figure = {
  ...squatBarbell, props: [{ type: 'rest', at: 'hip', to: 'shoulder', rel: 'torso', angle: -90, offset: 13 }],
  frames: [{ ...STAND, torso: -8, thigh: 165, shin: 190, upper: -150, fore: -20 }, { ...SQUAT, torso: -5, head: 0, thigh: 80, shin: 215, upper: -150, fore: -20 }],
}
const sissySquat: Figure = {
  view: 'side', work: ['legs'], props: [{ type: 'plate', at: 'wrist', front: true, size: 14 }],
  frames: [{ ...STAND, upper: 168, fore: 12 }, { torso: -18, head: -5, thigh: 125, shin: 235, foot: 130, upper: 165, fore: 12 }],
}
const pistol: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [
    { ...STAND, thigh2: 150, shin2: 150, upper: 165, fore: 20 },
    { torso: 48, head: 40, thigh: 72, shin: 218, foot: 90, thigh2: 82, shin2: 82, upper: 150, fore: 25 },
  ],
}
const pistolSmith: Figure = { ...pistol, props: [backBar], frames: [{ ...pistol.frames[0], ...armsOnBar }, { ...pistol.frames[1], ...armsOnBar }] }
const pistolBox: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'ankle', at: [150, 160] }, props: [{ type: 'box', span: [110, 190], y: 165 }],
  frames: [
    { ...STAND, thigh2: 178, shin2: 178, upper: 90, fore: 90 },
    { torso: 45, head: 40, thigh: 80, shin: 212, foot: 90, thigh2: 150, shin2: 180, upper: 90, fore: 90 },
  ],
}
const kneelingSquat: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'knee', at: [110, 214] }, props: [backBar],
  frames: [
    { torso: 2, head: 0, thigh: 180, shin: -90, foot: -100, ...armsOnBar },
    { torso: 40, head: 45, thigh: 112, shin: -90, foot: -100, ...armsOnBar },
  ],
}
const kneelingJump: Figure = {
  view: 'side', work: ['glutes', 'legs'], props: [backBar], period: 2000,
  frames: [
    { torso: 30, head: 30, thigh: 170, shin: -90, foot: -100, ...armsOnBar },
    { ...SQUAT, ...armsOnBar },
  ],
}
const stepUpKnee: Figure = {
  ...stepUp, props: [{ type: 'box', span: [118, 200], y: 196 }],
  frames: [{ ...stepUp.frames[0], upper: 200, fore: 60 }, { ...STAND, thigh2: 95, shin2: 175, foot2: 110, upper: 150, fore: 60 }],
}
const stepUpBar: Figure = { ...stepUp, props: [{ type: 'box', span: [118, 200], y: 196 }, backBar], frames: [{ ...stepUp.frames[0], ...armsOnBar }, { ...stepUp.frames[1], ...armsOnBar }] }
const singleLegRdl: Figure = {
  view: 'side', work: ['legs', 'glutes'], props: [{ type: 'kettlebell', at: 'wrist', front: true }],
  frames: [
    { ...STAND, thigh2: 182, shin2: 182, upper: 180, fore: 180 },
    { torso: 88, head: 85, thigh: 172, shin: 184, foot: 90, thigh2: -92, shin2: -92, foot2: 180, upper: 180, fore: 180 },
  ],
}
const bulgarianBar: Figure = { ...bulgarian, props: [{ type: 'bench', span: [30, 94], y: 190 }, backBar], frames: bulgarian.frames.map((p) => ({ ...p, ...armsOnBar })) as [Pose, Pose] }
const suspendedSplit: Figure = { ...bulgarian, props: [{ type: 'cable', at: 'ankle2', point: [40, -40] }], frames: bulgarian.frames.map((p) => ({ ...p, upper: 90, fore: 90 })) as [Pose, Pose] }
const sideLungeBar: Figure = {
  ...sideLungeStretch, props: [{ type: 'barFront', front: true }], period: 2600,
  frames: [{ torso: 0, thigh: 150, shin: 180, upper: 100, fore: -8 }, { torso: 0, torsoLen: 0.9, thigh: 100, shin: 172, thigh2: 128, shin2: 130, upper: 100, fore: -8 }],
}
const jeffersonSquat: Figure = {
  ...plieSquat, props: [{ type: 'barFront', front: true }],
  frames: [{ torso: 0, thigh: 158, shin: 182, upper: 180, fore: 180 }, { torso: 0, torsoLen: 0.9, thigh: 118, shin: 172, upper: 180, fore: 180 }],
}
const beltSquat: Figure = { ...squatDumbbells, props: [{ type: 'box', span: [60, 100], y: 196 }, { type: 'box', span: [160, 200], y: 196 }, { type: 'plate', at: 'hip', angle: 180, offset: 40, size: 16, front: true }], anchor: { joint: 'ankle', at: [150, 191] }, frames: [{ ...STAND, upper: 90, fore: 90 }, { ...SQUAT, upper: 90, fore: 90 }] }
const lyingMachineSquat: Figure = { ...legPress }
const weightedJump: Figure = { ...jumpSquat, props: [backBar], frames: [{ ...SQUAT, ...armsOnBar }, { ...STAND, foot: 140, ...armsOnBar, lift: 18 }] }
const hipFlexionBand: Figure = {
  view: 'side', work: ['legs'], props: [{ type: 'band', at: 'ankle', point: [40, 214] }],
  frames: [{ ...STAND, upper: 170, fore: 150 }, { ...STAND, thigh: 90, shin: 180, thigh2: 182, shin2: 182, foot: 90, upper: 170, fore: 150 }],
}
const standingKickback: Figure = {
  view: 'side', work: ['glutes'], props: [{ type: 'cable', at: 'ankle', point: [220, 214] }],
  frames: [{ ...STAND, torso: 10, thigh: 182, shin: 182, upper: 90, fore: 90 }, { ...STAND, torso: 14, thigh: -145, shin: -145, thigh2: 182, shin2: 182, foot: 150, upper: 90, fore: 90 }],
}
const standingKickbackBand: Figure = { ...standingKickback, props: [{ type: 'band', at: 'ankle', point: [220, 214] }] }
const standingKickbackBody: Figure = { ...standingKickback, props: [] }
const standingLegCurl: Figure = {
  view: 'side', work: ['legs'], props: [{ type: 'pad', at: 'ankle', angle: -90, offset: 8, front: true }],
  frames: [{ ...STAND, torso: 10, thigh: 182, shin: 182, upper: 90, fore: 90 }, { ...STAND, torso: 10, thigh: 185, shin: -60, thigh2: 182, shin2: 182, foot: 20, upper: 90, fore: 90 }],
}
const bandLegCurlSeated: Figure = { ...seatedLegCurl, props: [{ type: 'seat', span: [66, 140], y: 184, back: [58, 92, 90] }, { type: 'band', at: 'ankle', point: [250, 200] }] }
const pullThrough: Figure = {
  view: 'side', work: ['glutes', 'legs'], props: [{ type: 'cable', at: 'wrist', point: [20, 214] }],
  frames: [{ ...RDL_LOW, torso: 75, thigh: 160, shin: 188, upper: 205, fore: 205 }, { ...STAND, upper: 175, fore: 175 }],
}
const pullThroughBand: Figure = { ...pullThrough, props: [{ type: 'band', at: 'wrist', point: [20, 214] }] }
const goodMorningPins: Figure = { ...goodMorningBar, props: [{ type: 'bar', span: [160, 215], y: 97 }, backBar], frames: [goodMorningBar.frames[1], goodMorningBar.frames[0]] }
const goodMorningSeated: Figure = {
  view: 'side', work: ['back', 'glutes'], anchor: { joint: 'hip', at: [100, 172] }, props: [{ type: 'seat', span: [70, 130], y: 184 }, backBar],
  frames: [{ torso: 0, thigh: 90, shin: 180, foot: 90, ...armsOnBar }, { torso: 75, head: 80, thigh: 90, shin: 180, foot: 90, ...armsOnBar }],
}
const reverseHyper: Figure = {
  view: 'side', work: ['glutes', 'back'], anchor: { joint: 'hip', at: [120, 110] }, props: [{ type: 'bench', span: [110, 220], y: 120 }],
  frames: [
    { torso: 90, head: 95, thigh: 180, shin: 180, foot: 90, upper: 180, fore: 180 },
    { torso: 90, head: 95, thigh: -85, shin: -85, foot: 180, upper: 180, fore: 180 },
  ],
}
const ballLegLift: Figure = {
  ...reverseHyper, anchor: { joint: 'hip', at: [120, 150] }, props: [{ type: 'ball', point: [128, 188], size: 32 }],
  frames: [
    { torso: 118, head: 125, thigh: -128, shin: -128, foot: 130, upper: 135, fore: 135 },
    { torso: 118, head: 125, thigh: -90, shin: -90, foot: 180, upper: 135, fore: 135 },
  ],
}
const hyperextension: Figure = {
  view: 'side', work: ['back', 'glutes'], anchor: { joint: 'hip', at: [120, 105] },
  props: [{ type: 'pad', at: 'hip', angle: 135, offset: 12, size: 11 }, { type: 'pad', at: 'ankle', angle: 45, offset: 8, size: 7 }, { type: 'bar', span: [30, 70], y: 188 }],
  frames: [
    { torso: 150, head: 155, thigh: -135, shin: -135, foot: -45, upper: 255, fore: 45 },
    { torso: 45, head: 50, thigh: -135, shin: -135, foot: -45, upper: 150, fore: -60 },
  ],
}
const ballHyper: Figure = {
  view: 'side', work: ['back'], anchor: { joint: 'hip', at: [120, 172] }, props: [{ type: 'ball', point: [125, 196], size: 24 }, { type: 'plate', at: 'wrist', front: true, size: 12 }],
  frames: [
    { torso: 135, head: 140, thigh: -110, shin: -110, foot: 180, upper: 100, fore: -40 },
    { torso: 72, head: 70, thigh: -110, shin: -110, foot: 180, upper: 40, fore: -100 },
  ],
}
// Aductores y abductores: de frente.
const adduction: Figure = {
  view: 'front', work: ['legs'], props: [{ type: 'cable', at: 'ankle', point: [250, 214] }],
  frames: [{ torso: 0, thigh: 150, shin: 150, thigh2: 180, shin2: 180, upper: 176, fore: 178, shift: -10 }, { torso: 0, thigh: 190, shin: 190, thigh2: 180, shin2: 180, upper: 176, fore: 178, shift: -10 }],
}
const adductionBand: Figure = { ...adduction, props: [{ type: 'band', at: 'ankle', point: [250, 214] }] }
const abductorMachine: Figure = {
  view: 'front', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [140, 140] }, props: [seatFront, { type: 'pad', at: 'knee', size: 7, front: true }],
  frames: [{ ...SEATED_FRONT, thighLen: 0.45, thigh: 170, upper: 190, fore: 180 }, { ...SEATED_FRONT, thighLen: 0.45, thigh: 115, shin: 165, upper: 190, fore: 180 }],
}
const adductorMachine: Figure = { ...abductorMachine, frames: [abductorMachine.frames[1], abductorMachine.frames[0]] }
const monsterWalk: Figure = {
  view: 'front', work: ['glutes'], props: [{ type: 'band', at: 'knee', to: 'knee2' }], period: 1600,
  frames: [
    { torso: 0, thigh: 162, shin: 184, thigh2: 170, shin2: 182, upper: 170, fore: 150, shift: -6 },
    { torso: 0, thigh: 170, shin: 182, thigh2: 162, shin2: 184, upper: 170, fore: 150, shift: 6 },
  ],
}
// Gemelos
const calfPress: Figure = { ...legPress, work: ['calves'], period: 1800, frames: [{ ...legPress.frames[1], foot: -10 }, { ...legPress.frames[1], foot: -60 }] }
const donkeyCalf: Figure = {
  view: 'side', work: ['calves'], anchor: { joint: 'toe', at: [150, 204] }, period: 1800,
  props: [{ type: 'box', span: [140, 198], y: 207 }, { type: 'box', span: [230, 262], y: 130 }],
  frames: [{ torso: 90, head: 90, thigh: 180, shin: 180, foot: 60, upper: 100, fore: 100 }, { torso: 90, head: 90, thigh: 180, shin: 180, foot: 135, upper: 100, fore: 100 }],
}
const tibialisRaise: Figure = { ...calfStand, frames: [{ ...STAND, upper: 180, fore: 180 }, { ...STAND, foot: 55, upper: 180, fore: 180 }] }
const balanceBoard: Figure = {
  view: 'front', work: ['calves', 'core'], props: [{ type: 'grip', point: [130, 218] }], period: 2400,
  frames: [{ torso: -3, thigh: 168, shin: 184, upper: 120, fore: 110, shift: -4 }, { torso: 3, thigh: 168, shin: 184, upper: 120, fore: 110, shift: 4 }],
}
// Strongman
const stoneLoad: Figure = {
  view: 'side', work: ['back', 'legs', 'glutes'], props: [{ type: 'box', span: [200, 250], y: 130 }, { type: 'ball', at: 'wrist', angle: 150, offset: 4, size: 20, front: true }], period: 3000,
  frames: [{ torso: 52, head: 60, thigh: 100, shin: 210, foot: 90, upper: 150, fore: 100 }, { ...STAND, torso: 0, upper: 130, fore: 40 }],
}
const tireFlip: Figure = {
  view: 'side', work: ['legs', 'back'], props: [{ type: 'plate', at: 'wrist', angle: 90, offset: 26, size: 30, front: true }], period: 3000,
  frames: [{ torso: 45, head: 55, thigh: 105, shin: 205, foot: 90, upper: 160, fore: 150 }, { ...LUNGE_TOP, torso: 25, upper: 80, fore: 70 }],
}
const RUN_A = { thigh: 130, shin: 195, thigh2: -155, shin2: -110, foot: 90, foot2: 150 }
const RUN_B = { thigh: -155, shin: -110, thigh2: 130, shin2: 195, foot: 150, foot2: 90 }
const sledPush: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [110, 126] }, period: 1200,
  props: [{ type: 'box', span: [226, 290], y: 170 }, { type: 'bar', span: [222, 232], y: 120 }],
  frames: [{ torso: 60, head: 70, ...RUN_A, upper: 110, fore: 110 }, { torso: 60, head: 70, ...RUN_B, upper: 110, fore: 110 }],
}
const sledDrag: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [150, 118] }, period: 1300,
  props: [{ type: 'cable', at: 'hip', point: [30, 196] }, { type: 'box', span: [-10, 34], y: 196 }],
  frames: [{ torso: 22, head: 25, ...RUN_A, upper: 150, fore: 80 }, { torso: 22, head: 25, ...RUN_B, upper: 200, fore: 120 }],
}
const backwardDrag: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [120, 122] }, period: 1400,
  props: [{ type: 'cable', at: 'wrist', point: [250, 200] }, { type: 'box', span: [246, 290], y: 196 }],
  frames: [
    { torso: 25, head: 30, thigh: 150, shin: 195, thigh2: 190, shin2: 175, foot: 90, upper: 115, fore: 110 },
    { torso: 25, head: 30, thigh: 190, shin: 175, thigh2: 150, shin2: 195, foot: 90, upper: 115, fore: 110 },
  ],
}
const bearCrawl: Figure = {
  view: 'side', work: ['legs', 'core'], hands: true, period: 1400, props: [{ type: 'cable', at: 'hip', point: [-10, 200] }, { type: 'box', span: [-50, -6], y: 196 }],
  frames: [
    { torso: 95, head: 100, thigh: 150, shin: -150, thigh2: 190, shin2: -140, foot: 90, upper: 170, fore: 175, upper2: 190, fore2: 185 },
    { torso: 95, head: 100, thigh: 190, shin: -140, thigh2: 150, shin2: -150, foot: 90, upper: 190, fore: 185, upper2: 170, fore2: 175 },
  ],
}
const yokeWalk: Figure = { ...farmersWalk, work: ['legs', 'back'], props: [backBar], frames: farmersWalk.frames.map((p) => ({ ...p, ...armsOnBar })) as [Pose, Pose] }
const conanWheel: Figure = { ...farmersWalk, work: ['legs', 'back'], props: [{ type: 'grip', at: 'wrist', front: true }], frames: farmersWalk.frames.map((p) => ({ ...p, torso: 12, upper: 150, fore: 50 })) as [Pose, Pose] }
const logLift: Figure = { ...cleanAndPress, props: [{ type: 'plate', at: 'wrist', front: true, size: 20 }] }
const sidePressBell: Figure = { ...paraPress }

// ---------------------------------------------------------------- cardio y pliometría
// Carrera: cadera fija y piernas y brazos alternos (brazo contrario a la pierna).
const ARMS_A = { upper: -140, fore: 150, upper2: 150, fore2: 40 }
const ARMS_B = { upper: 150, fore: 40, upper2: -140, fore2: 150 }
const run: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [130, 128] }, period: 900, props: [],
  frames: [{ torso: 10, head: 10, ...RUN_A, ...ARMS_A }, { torso: 10, head: 10, ...RUN_B, ...ARMS_B }],
}
const sprint: Figure = { ...run, anchor: { joint: 'hip', at: [130, 127] }, frames: [{ torso: 32, head: 40, ...RUN_A, ...ARMS_A }, { torso: 32, head: 40, ...RUN_B, ...ARMS_B }] }
const WALK_A = { thigh: 160, shin: 185, thigh2: -165, shin2: -160, foot: 90, foot2: 120 }
const WALK_B = { thigh: -165, shin: -160, thigh2: 160, shin2: 185, foot: 120, foot2: 90 }
const walk: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [130, 125] }, period: 1400, props: [],
  frames: [{ torso: 3, ...WALK_A, upper: 195, fore: 185, upper2: 165, fore2: 150 }, { torso: 3, ...WALK_B, upper: 165, fore: 150, upper2: 195, fore2: 185 }],
}
const treadmill: Prop[] = [{ type: 'box', span: [20, 250], y: 212 }, { type: 'bar', span: [196, 236], y: 120 }]
const treadmillWalk: Figure = { ...walk, anchor: { joint: 'hip', at: [130, 115] }, props: treadmill }
const treadmillRun: Figure = { ...run, anchor: { joint: 'hip', at: [130, 118] }, props: treadmill }
const skipping: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [130, 108] }, period: 900, props: [],
  frames: [
    { torso: 4, thigh: 92, shin: 180, thigh2: 182, shin2: 182, foot: 90, foot2: 140, ...ARMS_A },
    { torso: 4, thigh: 182, shin: 182, thigh2: 92, shin2: 180, foot: 140, foot2: 90, ...ARMS_B },
  ],
}
const buttKickSingle: Figure = {
  ...skipping,
  frames: [
    { torso: 8, thigh: 188, shin: -30, thigh2: 182, shin2: 182, foot: 20, foot2: 140, ...ARMS_A },
    { torso: 8, thigh: 182, shin: 182, thigh2: 188, shin2: -30, foot: 140, foot2: 20, ...ARMS_B },
  ],
}
const wallDrill: Figure = {
  ...skipping, props: [{ type: 'box', span: [236, 250], y: -10 }],
  frames: [
    { torso: 45, head: 45, thigh: 110, shin: 180, thigh2: -150, shin2: -150, foot: 90, foot2: 150, upper: 70, fore: 75 },
    { torso: 45, head: 45, thigh: -150, shin: -150, thigh2: 110, shin2: 180, foot: 150, foot2: 90, upper: 70, fore: 75 },
  ],
}
const bike: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [110, 118] }, period: 1000,
  props: [{ type: 'seat', span: [92, 128], y: 126 }, { type: 'bar', span: [186, 206], y: 96 }],
  frames: [
    { torso: 40, head: 55, thigh: 100, shin: 172, thigh2: 150, shin2: 200, foot: 100, upper: 105, fore: 95 },
    { torso: 40, head: 55, thigh: 150, shin: 200, thigh2: 100, shin2: 172, foot: 100, upper: 105, fore: 95 },
  ],
}
const recumbentBike: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [100, 160] }, period: 1000,
  props: [{ type: 'seat', span: [76, 126], y: 170, back: [66, 90, 80] }],
  frames: [
    { torso: -22, thigh: 70, shin: 120, thigh2: 92, shin2: 95, foot: 10, upper: 160, fore: 110 },
    { torso: -22, thigh: 92, shin: 95, thigh2: 70, shin2: 120, foot: 10, upper: 160, fore: 110 },
  ],
}
const rower: Figure = {
  view: 'side', work: ['legs', 'back'], anchor: { joint: 'ankle', at: [220, 200] }, period: 2000,
  props: [{ type: 'box', span: [40, 250], y: 212 }, { type: 'grip', at: 'hip', angle: 180, offset: 10 }, { type: 'cable', at: 'wrist', point: [250, 186] }],
  frames: [
    { torso: 22, head: 30, thigh: 50, shin: 150, foot: 20, upper: 100, fore: 95 },
    { torso: -20, head: -10, thigh: 95, shin: 95, foot: 20, upper: -135, fore: 80 },
  ],
}
const elliptical: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [130, 108] }, period: 1600,
  props: [{ type: 'box', span: [50, 220], y: 206 }, { type: 'bar', span: [190, 214], y: 80 }],
  frames: [
    { torso: 5, ...WALK_A, upper: 150, fore: 70, upper2: 170, fore2: 100 },
    { torso: 5, ...WALK_B, upper: 170, fore: 100, upper2: 150, fore2: 70 },
  ],
}
const stairClimber: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [130, 112] }, period: 1400,
  props: [{ type: 'bar', span: [160, 200], y: 118 }],
  frames: [
    { torso: 12, thigh: 115, shin: 190, thigh2: 182, shin2: 182, foot: 90, upper: 160, fore: 120 },
    { torso: 12, thigh: 182, shin: 182, thigh2: 115, shin2: 190, foot: 90, upper: 160, fore: 120 },
  ],
}
const ropeJump: Figure = {
  view: 'front', work: ['calves', 'legs'], period: 700,
  props: [{ type: 'band', at: 'wrist', point: [130, 224] }, { type: 'band', at: 'wrist2', point: [130, 224] }],
  frames: [{ torso: 0, thigh: 178, shin: 180, upper: 160, fore: 110 }, { torso: 0, thigh: 178, shin: 180, upper: 160, fore: 110, lift: 12 }],
}
const skating: Figure = {
  view: 'front', work: ['legs', 'glutes'], period: 1600, props: [],
  frames: [
    { torso: -6, torsoLen: 0.8, thigh: 172, shin: 182, thigh2: 125, shin2: 125, upper: 150, fore: 160, upper2: -30, fore2: -20, shift: 20 },
    { torso: 6, torsoLen: 0.8, thigh: 125, shin: 125, thigh2: 172, shin2: 182, upper: -30, fore: -20, upper2: 150, fore2: 160, shift: -20 },
  ],
}
const broadJump: Figure = {
  view: 'side', work: ['legs', 'glutes'], period: 2200, arc: 40, props: [], x: 90,
  frames: [
    { ...SQUAT, torso: 45, upper: -150, fore: -160 },
    { ...SQUAT, torso: 30, upper: 60, fore: 70, shift: 100 },
  ],
}
const hurdleHop: Figure = { ...broadJump, props: [{ type: 'box', span: [134, 150], y: 190 }] }
const lateralJump: Figure = {
  view: 'front', work: ['legs', 'glutes'], period: 2200, arc: 35, props: [], x: 170,
  frames: [
    { torso: 0, torsoLen: 0.85, thigh: 160, shin: 192, upper: 200, fore: 200 },
    { torso: 0, torsoLen: 0.85, thigh: 160, shin: 192, upper: 150, fore: 140, shift: -80 },
  ],
}
const lateralBound: Figure = {
  ...lateralJump,
  frames: [
    { torso: 6, torsoLen: 0.85, thigh: 165, shin: 190, thigh2: 150, shin2: 150, upper: 160, fore: 150 },
    { torso: -6, torsoLen: 0.85, thigh: 150, shin: 150, thigh2: 165, shin2: 190, upper: 160, fore: 150, shift: -80 },
  ],
}
const lateralBoxJump: Figure = { ...lateralJump, props: [{ type: 'box', span: [60, 120], y: 180 }], frames: [lateralJump.frames[0], { ...lateralJump.frames[1], lift: 42 }] }
const carioca: Figure = {
  view: 'front', work: ['legs'], period: 1200, props: [],
  frames: [
    { torso: 0, thigh: 190, shin: 185, thigh2: 160, shin2: 180, upper: 120, fore: 110, shift: 10 },
    { torso: 0, thigh: 160, shin: 180, thigh2: 190, shin2: 185, upper: 120, fore: 110, shift: -10 },
  ],
}
const tuckJump: Figure = {
  view: 'side', work: ['legs', 'core'], period: 1800, props: [],
  frames: [{ ...SQUAT, torso: 35, upper: -150, fore: -160 }, { torso: 5, thigh: 45, shin: 170, foot: 120, upper: 90, fore: 80, lift: 50 }],
}
const starJump: Figure = {
  view: 'front', work: ['legs', 'shoulders'], period: 1600, props: [],
  frames: [
    { torso: 0, torsoLen: 0.9, thigh: 170, shin: 186, upper: 178, fore: 178 },
    { torso: 0, thigh: 145, shin: 145, upper: 40, fore: 35, lift: 35 },
  ],
}
const LUNGE_SWAP = { torso: 4, thigh: 182, shin: -98, thigh2: 98, shin2: 182, foot: 170, foot2: 90 }
const splitJump: Figure = {
  view: 'side', work: ['legs', 'glutes'], anchor: { joint: 'hip', at: [140, 145] }, period: 1800, arc: 40, props: [],
  frames: [{ ...LUNGE_LOW, upper: 200, fore: 150, upper2: 150, fore2: 60 }, { ...LUNGE_SWAP, upper: 150, fore: 60, upper2: 200, fore2: 150 }],
}
const buttKick: Figure = {
  view: 'side', work: ['legs'], period: 1400, props: [],
  frames: [{ ...SQUAT, torso: 25, thigh: 130, shin: 200, upper: -150, fore: -160 }, { ...STAND, thigh: 186, shin: -25, foot: 30, upper: 40, fore: 30, lift: 40 }],
}
const depthJump: Figure = {
  view: 'side', work: ['legs', 'glutes'], period: 2400, props: [{ type: 'box', span: [100, 156], y: 182 }],
  frames: [{ ...STAND, upper: 180, fore: 175, lift: 40 }, { ...SQUAT, torso: 35, upper: -150, fore: -160, shift: 80 }],
}
const boxJumpBench: Figure = { ...boxJump, props: [{ type: 'bench', span: [150, 236], y: 166 }] }
const overheadThrow: Figure = {
  view: 'side', work: ['shoulders', 'core'], props: [{ type: 'ball', at: 'wrist', size: 11, front: true }], period: 1800,
  frames: [{ ...STAND, torso: -8, thigh: 165, shin: 192, upper: -20, fore: -45 }, { ...LUNGE_TOP, torso: 12, upper: 70, fore: 65 }],
}
const slam: Figure = {
  view: 'side', work: ['core', 'shoulders'], props: [{ type: 'ball', at: 'wrist', size: 11, front: true }], period: 1600,
  frames: [{ ...STAND, foot: 120, upper: 5, fore: 0 }, { ...SQUAT, torso: 62, head: 75, upper: 150, fore: 150 }],
}
const slamOneArm = oneArm(slam, 180, 180)
const sledgehammer: Figure = { ...slam, props: [{ type: 'grip', at: 'wrist', front: true }, { type: 'plate', at: 'wrist', angle: 0, offset: 0, size: 9, front: true }] }
const scoopThrow: Figure = {
  ...slam, frames: [{ ...SQUAT, torso: 50, head: 60, upper: 175, fore: 175 }, { ...STAND, foot: 140, upper: 35, fore: 30, lift: 6 }],
}
const backwardThrow: Figure = {
  ...slam, sweep: ['upper', 'fore', 'upper2', 'fore2'], frames: [{ ...SQUAT, torso: 50, head: 60, upper: 175, fore: 175 }, { ...STAND, torso: -12, head: -25, foot: 140, upper: -25, fore: -35, lift: 8 }],
}
const supineThrow: Figure = {
  view: 'side', work: ['core', 'shoulders'], ...onFloor, props: [{ type: 'ball', at: 'wrist', size: 10, front: true }], period: 1800,
  frames: [{ ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: -88, fore: -90 }, { torso: -40, head: -25, thigh: 45, shin: 150, foot: 95, upper: 45, fore: 42 }],
}
const supineThrowOne = oneArm(supineThrow, 92, 90)
const supineChestThrow: Figure = {
  view: 'side', work: ['chest', 'arms'], ...onFloor, props: [{ type: 'ball', at: 'wrist', size: 10, front: true }], period: 1400,
  frames: [{ ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: 60, fore: -60 }, { ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: 4, fore: 2 }],
}
const kneelingArms: Figure = {
  view: 'side', work: ['shoulders'], anchor: { joint: 'knee', at: [120, 214] }, period: 900, props: [],
  frames: [{ torso: 2, thigh: 180, shin: -90, foot: -100, ...ARMS_A }, { torso: 2, thigh: 180, shin: -90, foot: -100, ...ARMS_B }],
}
const chestSqueeze: Figure = {
  view: 'front', work: ['chest'], period: HOLD, props: [],
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: -160, fore: -80 }, { torso: 0, thigh: 174, shin: 180, upper: -155, fore: -85 }],
}

// ---------------------------------------------------------------- correcciones de la revisión
const machineDip: Figure = {
  ...machinePress, work: ['arms'],
  frames: [{ torso: -4, thigh: 90, shin: 180, foot: 90, upper: -150, fore: 150 }, { torso: -4, thigh: 90, shin: 180, foot: 90, upper: 178, fore: 178 }],
}
const machineTricepsExtension: Figure = { ...preacherMachine, work: ['arms'], frames: [preacherMachine.frames[1], preacherMachine.frames[0]] }

const twistBody: Figure = { ...twistStanding, props: [], period: 2000 }
const seatedTwistBall: Figure = {
  ...seatedTwistBar, props: [{ type: 'ball', point: [140, 184], size: 24 }],
  frames: [{ ...SEATED_FRONT, torso: -6, upper: -160, fore: -80 }, { ...SEATED_FRONT, torso: 6, upper: -160, fore: -80 }],
}
const spinalTwistSeated: Figure = { ...russianTwist, props: [], period: HOLD }
const floorArmsBack: Figure = {
  view: 'side', work: ['chest', 'shoulders'], anchor: { joint: 'hip', at: [100, 206] }, shadow: 90, props: [], period: HOLD,
  frames: [
    { torso: -5, head: 0, thigh: 60, shin: 150, foot: 95, upper: -160, fore: -170 },
    { torso: 12, head: 10, thigh: 60, shin: 150, foot: 95, upper: -145, fore: -160 },
  ],
}
const lyingGroin: Figure = {
  ...kneesToChest, work: ['legs'],
  frames: [{ ...LYING_FLOOR, thigh: 45, shin: 150, foot: 95, upper: 92, fore: 90 }, { ...LYING_FLOOR, thigh: 72, shin: 125, foot: 60, upper: 92, fore: 90 }],
}
const rearFlyCableHigh: Figure = {
  view: 'front', work: ['shoulders', 'back'], props: [{ type: 'cable', at: 'wrist', point: [20, 95] }, { type: 'cable', at: 'wrist2', point: [240, 95] }],
  frames: [{ torso: 0, thigh: 174, shin: 180, upper: -120, fore: -100 }, { torso: 0, thigh: 174, shin: 180, upper: 92, fore: 92 }],
}
const inclineCablePress: Figure = { ...incline, props: [...inclineBench, { type: 'cable', at: 'wrist', point: [60, 214] }] }
const inclinePullover: Figure = {
  ...incline, work: ['back'], sweep: ['upper', 'fore', 'upper2', 'fore2'], props: [...inclineBench, { type: 'cable', at: 'wrist', point: [10, 40] }],
  frames: [{ ...LYING, torso: -58, head: -58, upper: -80, fore: -80 }, { ...LYING, torso: -58, head: -58, upper: 110, fore: 110 }],
}
const reverseFlyStanding: Figure = {
  ...standingRow,
  frames: [{ torso: 20, head: 25, thigh: 150, shin: 196, foot: 90, upper: 95, fore: 95 }, { torso: 12, head: 15, thigh: 150, shin: 196, foot: 90, upper: 200, fore: 200 }],
}
const wristBarRotation: Figure = { ...carDrivers, work: ['forearms'], props: [{ type: 'grip', at: 'wrist', front: true }] }
const hopOneLeg: Figure = {
  ...broadJump,
  frames: [{ ...broadJump.frames[0], thigh2: 170, shin2: 250 }, { ...broadJump.frames[1], thigh2: 170, shin2: 250 }],
}
const lateralBoundBox: Figure = { ...lateralBound, props: [{ type: 'box', span: [90, 130], y: 190 }] }
const flutterProne: Figure = {
  view: 'side', work: ['glutes'], anchor: { joint: 'hip', at: [120, 122] }, props: [{ type: 'bench', span: [110, 240], y: 132 }], period: 1400,
  frames: [
    { torso: 90, head: 95, thigh: -115, shin: -115, thigh2: -140, shin2: -140, foot: 180, upper: 180, fore: 180 },
    { torso: 90, head: 95, thigh: -140, shin: -140, thigh2: -115, shin2: -115, foot: 180, upper: 180, fore: 180 },
  ],
}

const legUpStretch: Figure = {
  view: 'side', work: ['legs'], anchor: { joint: 'hip', at: [100, 115] }, props: [{ type: 'box', span: [184, 236], y: 158 }], period: HOLD,
  frames: [
    { torso: 2, thigh: 110, shin: 110, thigh2: 180, shin2: 180, foot: 20, foot2: 90, upper: 170, fore: 150 },
    { torso: 45, head: 60, thigh: 110, shin: 110, thigh2: 180, shin2: 180, foot: 20, foot2: 90, upper: 150, fore: 140 },
  ],
}

// ---------------------------------------------------------------- 0.0.4: tumbados de lado y detalles
// Tumbado de lado: vista de frente girada 90° (cabeza a la izquierda, lado cercano arriba).
const SIDE_LYING = { torso: 0, thigh: 180, shin: 180, thigh2: 180, shin2: 180, upper2: -8, fore2: -8 }
const sideLying = { view: 'front' as const, turn: -90, anchor: { joint: 'hip' as JointName, at: [160, 193] as [number, number] }, shadow: 110 }
const sideLyingLateral: Figure = {
  ...sideLying, work: ['shoulders'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...SIDE_LYING, upper: 176, fore: 176 }, { ...SIDE_LYING, upper: 92, fore: 94 }],
}
const sideLyingRotate: Figure = {
  ...sideLying, work: ['shoulders'], props: [{ type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...SIDE_LYING, upper: 178, fore: -95 }, { ...SIDE_LYING, upper: 178, fore: 95 }],
}
const sideJackknife: Figure = {
  ...sideLying, work: ['core'], props: [],
  frames: [
    { ...SIDE_LYING, upper: 30, fore: -120 },
    { ...SIDE_LYING, torso: 28, head: 28, thigh: 150, shin: 150, upper: 55, fore: -100 },
  ],
}
const sideLyingReach: Figure = {
  ...sideLying, sweep: ['upper', 'fore'], work: ['back', 'core'], props: [], period: HOLD,
  frames: [{ ...SIDE_LYING, upper: 176, fore: 176 }, { ...SIDE_LYING, upper: -8, fore: -12 }],
}
const sideLyingLegUp: Figure = {
  ...sideLying, work: ['legs'], props: [], period: HOLD,
  frames: [{ ...SIDE_LYING, upper: 176, fore: 176 }, { ...SIDE_LYING, thigh: 105, shin: 100, upper: 120, fore: 105 }],
}
const sideLyingBall: Figure = {
  ...sideLying, work: ['core'], anchor: { joint: 'hip', at: [160, 166] }, shadow: 90,
  props: [{ type: 'ball', point: [165, 196], size: 26 }],
  frames: [
    { ...SIDE_LYING, torso: -25, head: -25, thigh: 190, shin: 190, thigh2: 170, shin2: 170, upper: 20, fore: -120, upper2: -30, fore2: -60 },
    { ...SIDE_LYING, torso: 22, head: 22, thigh: 190, shin: 190, thigh2: 170, shin2: 170, upper: 20, fore: -120, upper2: -30, fore2: -60 },
  ],
}
// Boca abajo en banco inclinado: elevación de brazos al frente y aperturas.
const proneFrontRaise: Figure = { ...proneRow, work: ['shoulders'], frames: [proneRow.frames[0], { ...proneRow.frames[0], upper: 55, fore: 55 }] }
const rearFlyBench: Figure = { ...rearFly, props: [{ type: 'box', span: [104, 176], y: 132 }, ...rearFly.props] }
// Curl de pie con el brazo apoyado en el respaldo de un banco inclinado.
const preacherStanding: Figure = {
  view: 'side', work: ['arms'], props: [{ type: 'bench', span: [128, 180], y: 92, tilt: 48 }, { type: 'dumbbell', at: 'wrist', front: true }],
  frames: [{ ...STAND, torso: 20, head: 30, upper: 138, fore: 140, upper2: 180, fore2: 180 }, { ...STAND, torso: 20, head: 30, upper: 138, fore: 12, upper2: 180, fore2: 180 }],
}
// Crunch inverso y abdominal con press en banco declinado.
const declineReverseCrunch: Figure = {
  view: 'side', work: ['core'], anchor: { joint: 'shoulder', at: [72, 166] }, shadow: 100, props: [{ type: 'bench', span: [36, 150], y: 158, tilt: -14 }],
  frames: [
    { torso: -104, head: -104, thigh: 80, shin: 85, foot: 20, upper: -120, fore: -60 },
    { torso: -125, head: -110, thigh: -25, shin: 60, foot: -20, upper: -120, fore: -60 },
  ],
}
const declinePressSitUp: Figure = {
  ...declineCrunch, props: [...declineBench, { type: 'plate', at: 'wrist', front: true, size: 18 }],
  frames: [
    { torso: -104, head: -100, thigh: 62, shin: 165, foot: 90, upper: 50, fore: -70 },
    { torso: -40, head: -25, thigh: 62, shin: 165, foot: 90, upper: 4, fore: 2 },
  ],
}
const dropPush: Figure = { ...plyoPushUp, props: [{ type: 'box', span: [150, 206], y: 196 }] }

// @@PATRONES@@

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
  Barbell_Ab_Rollout: abRolloutBar,
  'Barbell_Ab_Rollout_-_On_Knees': abRolloutBar,
  Barbell_Rollout_from_Bench: abRolloutBar,
  Ab_Roller: abRollout,
  Suspended_Fallout: fallout,
  Barbell_Side_Bend: sideBendBar,
  Dumbbell_Side_Bend: sideBend,
  Weighted_Ball_Side_Bend: sideLyingBall,
  'One-Arm_High-Pulley_Cable_Side_Bends': sideBendCable,
  Landmine_180s: landmineArc,
  Seated_Barbell_Twist: seatedTwistBar,
  Air_Bike: airBike,
  Elbow_to_Knee: airBike,
  Wind_Sprints: airBike,
  Alternate_Heel_Touchers: crunchReach,
  'Bent-Knee_Hip_Raise': reverseCrunch,
  Reverse_Crunch: reverseCrunch,
  Decline_Reverse_Crunch: declineReverseCrunch,
  Smith_Machine_Hip_Raise: bottomsUp,
  Cable_Reverse_Crunch: reverseCrunchCable,
  Bottoms_Up: bottomsUp,
  Cocoons: cocoon,
  Tuck_Crunch: cocoon,
  'Crunch_-_Hands_Overhead': crunchOverhead,
  'Crunch_-_Legs_On_Exercise_Ball': crunchBallLegs,
  Decline_Crunch: declineCrunch,
  Decline_Oblique_Crunch: declineCrunch,
  'Flat_Bench_Leg_Pull-In': reverseCrunch,
  'Seated_Flat_Bench_Leg_Pull-In': legTuckBench,
  'Leg_Pull-In': legTuck,
  Seated_Leg_Tucks: legTuck,
  Flat_Bench_Lying_Leg_Raise: benchLegRaise,
  Gorilla_Chin_Crunch: gorillaChin,
  Hanging_Pike: hangingPike,
  'Jackknife_Sit-Up': jackknife,
  Side_Jackknife: sideJackknife,
  'Janda_Sit-Up': sitUp,
  Oblique_Crunches: crunch,
  'Oblique_Crunches_-_On_The_Floor': crunch,
  Bosu_Ball_Cable_Crunch_With_Side_Bends: crunch,
  Russian_Twist: russianTwist,
  Plate_Twist: russianTwistPlate,
  Cable_Russian_Twists: russianTwistCable,
  Medicine_Ball_Full_Twist: twistStanding,
  Spell_Caster: twistDumbbell,
  Side_Bridge: sidePlank,
  Spider_Crawl: mountainClimbers,
  Cable_Crunch: cableCrunchKneeling,
  Kneeling_Cable_Crunch_With_Alternating_Oblique_Twists: cableCrunchKneeling,
  Rope_Crunch: cableCrunchKneeling,
  Standing_Rope_Crunch: cableCrunchStanding,
  Cable_Seated_Crunch: seatedCrunch,
  Ab_Crunch_Machine: machineCrunch,
  Cable_Judo_Flip: woodChop,
  Standing_Cable_Wood_Chop: woodChop,
  Standing_Cable_Lift: cableLift,
  Pallof_Press: pallofPress,
  Pallof_Press_With_Rotation: pallofPress,
  Exercise_Ball_Crunch: ballCrunch,
  'Exercise_Ball_Pull-In': ballPullIn,
  Suspended_Reverse_Crunch: suspendedPullIn,
  Advanced_Kettlebell_Windmill: windmill,
  Kettlebell_Windmill: windmill,
  Double_Kettlebell_Windmill: windmillDouble,
  Bent_Press: bentPress,
  Kettlebell_Figure_8: kbPassLegs,
  Kettlebell_Pass_Between_The_Legs: kbPassLegs,
  Weighted_Crunches: crunchWeighted,
  Knee_Hip_Raise_On_Parallel_Bars: kneeRaiseBars,
  'Otis-Up': pressSitUp,
  'Press_Sit-Up': declinePressSitUp,
  'Weighted_Sit-Ups_-_With_Bands': sitUpBand,
  'Butt-Ups': buttUps,
  Flutter_Kicks: flutterProne,
  Scissor_Kick: scissorKick,
  Quad_Stretch: quadStretch,
  Standing_Elevated_Quad_Stretch: quadStretchElevated,
  Standing_Toe_Touches: forwardFold,
  Standing_Hamstring_and_Calf_Stretch: forwardFoldHold,
  Hamstring_Stretch: lyingHamstring,
  Kneeling_Hip_Flexor: kneelingLunge,
  Intermediate_Hip_Flexor_and_Quad_Stretch: kneelingLungeReach,
  Crossover_Reverse_Lunge: lungeBodyweight,
  Standing_Hip_Flexors: standingHipFlexor,
  Runners_Stretch: runnersStretch,
  Worlds_Greatest_Stretch: worldsGreatest,
  Calf_Stretch_Hands_Against_Wall: calfWall,
  Standing_Gastrocnemius_Calf_Stretch: calfWall,
  Calf_Stretch_Elbows_Against_Wall: calfWallElbows,
  Standing_Soleus_And_Achilles_Stretch: soleusStretch,
  Seated_Calf_Stretch: seatedReach,
  Seated_Hamstring_and_Calf_Stretch: seatedReach,
  Seated_Floor_Hamstring_Stretch: seatedReach,
  Seated_Hamstring: seatedReach,
  Chair_Leg_Extended_Stretch: seatedReachChair,
  Chair_Lower_Back_Stretch: chairFold,
  Chair_Upper_Body_Stretch: chairArmsBack,
  Seated_Front_Deltoid: floorArmsBack,
  Seated_Biceps: floorArmsBack,
  Seated_Overhead_Stretch: chairStretchUp,
  Seated_Glute: figureFourChair,
  The_Straddle: straddle,
  Adductor_Groin: lyingGroin,
  Side_Lying_Groin_Stretch: sideLyingLegUp,
  Lying_Bent_Leg_Groin: lyingGroin,
  Groin_and_Back_Stretch: butterflyFold,
  Intermediate_Groin_Stretch: lyingHamstring,
  Groiners: mountainClimbers,
  Side_Leg_Raises: sideLegRaise,
  Standing_Hip_Circles: hipCircles,
  Knee_Circles: kneeCircles,
  Cat_Stretch: catStretch,
  All_Fours_Quad_Stretch: allFoursQuad,
  Glute_Kickback: kickback,
  Rear_Leg_Raises: standingKickbackBody,
  Hip_Circles_prone: hipCirclesProne,
  Kneeling_Forearm_Stretch: forearmStretch,
  Childs_Pose: childsPose,
  Hug_A_Ball: hugBall,
  Pyramid: downDogBall,
  Inchworm: inchworm,
  Superman: superman,
  One_Half_Locust: halfLocust,
  Lying_Prone_Quadriceps: proneQuad,
  Lower_Back_Curl: cobra,
  Hug_Knees_To_Chest: kneesToChest,
  One_Knee_To_Chest: oneKneeToChest,
  Ankle_On_The_Knee: figureFourLying,
  Lying_Glute: figureFourLying,
  'Leg-Up_Hamstring_Stretch': legUpStretch,
  Lying_Hamstring: lyingHamstring,
  '90_90_Hamstring': hamstring9090,
  Lying_Crossover: lyingTwist,
  Iron_Crosses_stretch: lyingTwist,
  Dancers_Stretch: lyingTwist,
  Knee_Across_The_Body: lyingTwist,
  Torso_Rotation: seatedTwistBall,
  On_Your_Side_Quad_Stretch: lyingQuadSide,
  'On-Your-Back_Quad_Stretch': lyingQuadSide,
  Toe_Touchers: toeTouchers,
  Pelvic_Tilt_Into_Bridge: bridge,
  Butt_Lift_Bridge: bridge,
  Barbell_Glute_Bridge: bridgeBar,
  Hip_Lift_with_Band: bridgeBand,
  Physioball_Hip_Bridge: bridgeBall,
  Looking_At_Ceiling: camel,
  Overhead_Stretch: reachUp,
  Upward_Stretch: reachUp,
  Standing_Biceps_Stretch: armsBackStretch,
  Chest_And_Front_Of_Shoulder_Stretch: armsBackStretch,
  Elbows_Back: elbowsBack,
  Behind_Head_Chest_Stretch: behindHead,
  Dynamic_Chest_Stretch: armsOpen,
  Chest_Stretch_on_Stability_Ball: hugBall,
  Arm_Circles: armCircles,
  Round_The_World_Shoulder_Stretch: frontRaiseOverheadBar,
  Shoulder_Circles: shoulderCircles,
  Shoulder_Raise: shoulderCircles,
  Elbow_Circles: elbowCircles,
  Shoulder_Stretch: crossBodyStretch,
  Triceps_Stretch: tricepsStretch,
  Overhead_Triceps: tricepsStretch,
  Tricep_Side_Stretch: crossBodyStretch,
  Standing_Lateral_Stretch: lateralStretch,
  Side_Wrist_Pull: lateralStretch,
  Overhead_Lat: lateralStretchBoth,
  'Side-Lying_Floor_Stretch': sideLyingReach,
  Chin_To_Chest_Stretch: neckForward,
  Side_Neck_Stretch: neckSide,
  'Isometric_Neck_Exercise_-_Front_And_Back': neckIsoFront,
  'Isometric_Neck_Exercise_-_Sides': neckIsoSide,
  Stomach_Vacuum: standingTall,
  Standing_Pelvic_Tilt: pelvicTilt,
  Front_Leg_Raises: frontLegSwing,
  One_Arm_Against_Wall: wallLat,
  Middle_Back_Stretch: twistBody,
  Upper_Back_Stretch: roundBack,
  Spinal_Stretch: spinalTwistSeated,
  Dynamic_Back_Stretch: twistBody,
  One_Handed_Hang: oneHandHang,
  Wrist_Circles: wristCircles,
  Ankle_Circles: ankleCircles,
  Sit_Squats: squatBodyweight,
  'Quadriceps-SMR': smrQuad,
  'Adductor': smrQuad,
  'Hamstring-SMR': smrHam,
  'Calves-SMR': smrCalf,
  'Peroneals-SMR': smrCalf,
  'Anterior_Tibialis-SMR': smrQuad,
  'Lower_Back-SMR': smrBack,
  'Rhomboids-SMR': smrBack,
  'Latissimus_Dorsi-SMR': smrSide,
  'Iliotibial_Tract-SMR': smrSide,
  'Piriformis-SMR': smrHam,
  'IT_Band_and_Glute_Stretch': figureFourLying,
  'Brachialis-SMR': smrArm,
  'Neck-SMR': smrNeck,
  'Foot-SMR': smrFoot,
  Peroneals_Stretch: seatedReach,
  Posterior_Tibialis_Stretch: seatedReach,
  Windmills: windmillStretch,
  'Upper_Back-Leg_Grab': seatedReach,
  Decline_Barbell_Bench_Press: declinePress,
  'Wide-Grip_Decline_Barbell_Bench_Press': declinePress,
  Decline_Smith_Press: declinePress,
  Smith_Machine_Decline_Press: declinePress,
  Leverage_Decline_Chest_Press: machineDeclinePress,
  Decline_Dumbbell_Bench_Press: declinePressDumbbell,
  Decline_Dumbbell_Flyes: declineFlyes,
  'Bent-Arm_Barbell_Pullover': pulloverBentArm,
  'Bent-Arm_Dumbbell_Pullover': pulloverBentArm,
  'Straight-Arm_Dumbbell_Pullover': pullover,
  'Wide-Grip_Decline_Barbell_Pullover': pulloverDecline,
  Front_Raise_And_Pullover: frontRaisePullover,
  Around_The_Worlds: aroundWorld,
  'Incline_Push-Up': inclinePushUp,
  'Incline_Push-Up_Medium': inclinePushUp,
  'Incline_Push-Up_Reverse_Grip': inclinePushUp,
  'Incline_Push-Up_Wide': inclinePushUp,
  'Incline_Push-Up_Close-Grip': inclinePushUp,
  'Incline_Push-Up_Depth_Jump': inclinePushUp,
  'Clock_Push-Up': pushUp,
  'Single-Arm_Push-Up': pushUp,
  Isometric_Wipers: pushUp,
  Bodyweight_Flyes: pushUp,
  Drop_Push: dropPush,
  'Plyo_Push-up': plyoPushUp,
  Plyo_Kettlebell_Pushups: kettlebellPushUp,
  'Push-Ups_With_Feet_On_An_Exercise_Ball': pushUpBall,
  'Suspended_Push-Up': pushUpSuspended,
  Push_Up_to_Side_Plank: pushUpSidePlank,
  'Body-Up': bodyUp,
  Body_Tricep_Press: inclinePushUp,
  Low_Cable_Crossover: cableCrossLow,
  'Single-Arm_Cable_Crossover': cableCrossOneArm,
  Machine_Bench_Press: machineChestPress,
  Leverage_Chest_Press: machineChestPress,
  Cable_Chest_Press: standingCablePress,
  Leverage_Incline_Chest_Press: machineInclinePress,
  Incline_Cable_Chest_Press: inclineCablePress,
  Standing_Cable_Chest_Press: standingCablePress,
  Forward_Drag_with_Press: standingCablePress,
  Svend_Press: plateSqueezePress,
  Bench_Press_with_Chains: benchPress,
  Chain_Press: benchPress,
  'Extended_Range_One-Arm_Kettlebell_Floor_Press': floorPressOneArm,
  'Leg-Over_Floor_Press': floorPressOneArm,
  Parallel_Bar_Dip: dipsTriceps,
  Ring_Dips: dipsTriceps,
  Dip_Machine: machineDip,
  Weighted_Bench_Dip: benchDips,
  'Decline_Close-Grip_Bench_To_Skull_Crusher': declineSkull,
  Decline_EZ_Bar_Triceps_Extension: declineSkull,
  Decline_Dumbbell_Triceps_Extension: declineSkullDumbbell,
  Incline_Barbell_Triceps_Extension: inclineSkull,
  Cable_Incline_Triceps_Extension: inclineSkullCable,
  Cable_Lying_Triceps_Extension: skullCable,
  Chain_Handle_Extension: skullCrusherDumbbell,
  JM_Press: jmPress,
  'Lying_Close-Grip_Barbell_Triceps_Press_To_Chin': jmPress,
  'Close-Grip_EZ-Bar_Press': benchPress,
  Tate_Press: skullCrusherDumbbell,
  One_Arm_Pronated_Dumbbell_Triceps_Extension: skullOneArm,
  One_Arm_Supinated_Dumbbell_Triceps_Extension: skullOneArm,
  Cable_Rope_Overhead_Triceps_Extension: overheadTricepsCable,
  Triceps_Overhead_Extension_with_Rope: overheadTricepsCable,
  Low_Cable_Triceps_Extension: overheadTricepsCable,
  'Standing_Low-Pulley_One-Arm_Triceps_Extension': overheadTricepsOneArm,
  Standing_Towel_Triceps_Extension: overheadTriceps,
  Speed_Band_Overhead_Triceps: overheadTricepsBand,
  Sled_Overhead_Triceps_Extension: overheadTricepsCable,
  Seated_Triceps_Press: seatedOverheadTriceps,
  Kneeling_Cable_Triceps_Extension: kneelingCableTriceps,
  Tricep_Dumbbell_Kickback: tricepsKickback,
  'Standing_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': tricepsKickback,
  'Standing_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': tricepsKickback,
  'Seated_Bent-Over_One-Arm_Dumbbell_Triceps_Extension': tricepsKickbackSeated,
  'Seated_Bent-Over_Two-Arm_Dumbbell_Triceps_Extension': tricepsKickbackSeated,
  Machine_Triceps_Extension: machineTricepsExtension,
  Preacher_Curl: preacher,
  Reverse_Barbell_Preacher_Curls: preacher,
  Cable_Preacher_Curl: preacherCable,
  One_Arm_Dumbbell_Preacher_Curl: preacherDumbbell,
  Preacher_Hammer_Dumbbell_Curl: preacherDumbbell,
  'Two-Arm_Dumbbell_Preacher_Curl': preacherDumbbell,
  Zottman_Preacher_Curl: preacherDumbbell,
  'Standing_One-Arm_Dumbbell_Curl_Over_Incline_Bench': preacherStanding,
  Machine_Preacher_Curls: preacherMachine,
  Machine_Bicep_Curl: machineCurl,
  Spider_Curl: spiderCurl,
  Lying_High_Bench_Barbell_Curl: spiderCurl,
  Dumbbell_Prone_Incline_Curl: spiderCurlDumbbell,
  Incline_Dumbbell_Curl: inclineCurl,
  Flexor_Incline_Dumbbell_Curls: inclineCurl,
  Incline_Hammer_Curls: inclineCurl,
  Incline_Inner_Biceps_Curl: inclineCurl,
  Alternate_Incline_Dumbbell_Curl: inclineCurlAlternate,
  Barbell_Curls_Lying_Against_An_Incline: inclineCurlBar,
  Lying_Supine_Dumbbell_Curl: lyingCurl,
  Concentration_Curls: concentrationCurl,
  'Seated_Close-Grip_Concentration_Barbell_Curl': concentrationCurlBar,
  Standing_Concentration_Curl: concentrationStanding,
  Seated_Dumbbell_Curl: seatedCurl,
  Seated_Dumbbell_Inner_Biceps_Curl: seatedCurl,
  Drag_Curl: dragCurl,
  Reverse_Plate_Curls: curlPlate,
  High_Cable_Curls: highCableCurl,
  Overhead_Cable_Curl: highCableCurl,
  Lying_Cable_Curl: lyingCableCurl,
  'Lying_Close-Grip_Bar_Curl_On_High_Pulley': skullCable,
  Front_Dumbbell_Raise: frontRaise,
  'Front_Two-Dumbbell_Raise': frontRaise,
  Single_Dumbbell_Raise: frontRaise,
  Dumbbell_Raise: lateralRaise,
  Alternating_Deltoid_Raise: frontRaiseAlternate,
  Front_Plate_Raise: frontRaisePlate,
  Front_Cable_Raise: frontRaiseCable,
  'Standing_Dumbbell_Straight-Arm_Front_Delt_Raise_Above_Head': frontRaiseOverhead,
  Standing_Front_Barbell_Raise_Over_Head: frontRaiseOverheadBar,
  Front_Incline_Dumbbell_Raise: inclineFrontRaise,
  Straight_Raises_on_Incline_Bench: proneFrontRaise,
  Barbell_Incline_Shoulder_Raise: inclineShoulderRaise,
  Smith_Incline_Shoulder_Raise: inclineShoulderRaise,
  Dumbbell_Incline_Shoulder_Raise: inclineShoulderRaiseDumbbell,
  'One-Arm_Incline_Lateral_Raise': sideLyingLateral,
  'Lying_One-Arm_Lateral_Raise': sideLyingLateral,
  Iron_Cross: lateralRaise,
  Side_Laterals_to_Front_Raise: lateralRaise,
  Crucifix: crucifixHold,
  Reverse_Flyes: rearFly,
  Reverse_Flyes_With_External_Rotation: rearFly,
  Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench: rearFly,
  Dumbbell_Lying_Rear_Lateral_Raise: rearFlyBench,
  Lying_Rear_Delt_Raise: rearFlyBench,
  'Dumbbell_Lying_One-Arm_Rear_Lateral_Raise': sideLyingLateral,
  'Seated_Bent-Over_Rear_Delt_Raise': rearFlySeated,
  Cable_Rear_Delt_Fly: rearFlyCableHigh,
  'Bent_Over_Low-Pulley_Side_Lateral': rearFlyCable,
  'Back_Flyes_-_With_Bands': rearFlyBand,
  Reverse_Machine_Flyes: reverseMachineFly,
  Band_Pull_Apart: bandPullApart,
  Barbell_Rear_Delt_Row: barbellRow,
  External_Rotation_with_Band: externalRotation,
  External_Rotation_with_Cable: externalRotationCable,
  External_Rotation: sideLyingRotate,
  Internal_Rotation_with_Band: internalRotation,
  Cable_Internal_Rotation: internalRotationCable,
  Cuban_Press: cubanPress,
  'Dumbbell_One-Arm_Upright_Row': uprightOneArm,
  'Smith_Machine_One-Arm_Upright_Row': uprightOneArm,
  Low_Pulley_Row_To_Neck: uprightCable,
  Push_Press: pushPress,
  'Push_Press_-_Behind_the_Neck': pushPressBehindNeck,
  Standing_Barbell_Press_Behind_Neck: pressBehindNeck,
  Bradford_Rocky_Presses: bradfordPress,
  Standing_Bradford_Press: bradfordPress,
  Seated_Barbell_Military_Press: seatedPressBar,
  Smith_Machine_Overhead_Shoulder_Press: seatedPressBar,
  Machine_Shoulder_Military_Press: machinePress,
  Leverage_Shoulder_Press: machinePress,
  Cable_Shoulder_Press: cablePress,
  Seated_Cable_Shoulder_Press: cablePressSeated,
  Alternating_Cable_Shoulder_Press: cablePressAlternate,
  'Anti-Gravity_Press': antiGravityPress,
  Landmine_Linear_Jammer: landmineJammer,
  'Single-Arm_Linear_Jammer': landmineJammerOne,
  'See-Saw_Press_Alternating_Side_Press': seeSawPress,
  'One-Arm_Kettlebell_Military_Press_To_The_Side': sidePress,
  'One-Arm_Kettlebell_Para_Press': paraPress,
  'One-Arm_Kettlebell_Push_Press': pushPressKettlebellOne,
  Double_Kettlebell_Push_Press: pushPressKettlebell,
  Kettlebell_Halo: halo,
  Kettlebell_Halo_With_Overhead_Extension: haloExtension,
  Kettlebell_Pirate_Ships: pirateShips,
  'Kettlebell_Turkish_Get-Up_Lunge_style': turkishGetUp,
  'Kettlebell_Turkish_Get-Up_Squat_style': turkishGetUp,
  Battling_Ropes: battleRopes,
  Car_Drivers: carDrivers,
  Sled_Overhead_Backward_Walk: backwardWalkArmsUp,
  'Straight-Arm_Pulldown': straightArmPulldown,
  'Rope_Straight-Arm_Pulldown': straightArmPulldown,
  Cable_Incline_Pushdown: inclinePullover,
  Kneeling_High_Pulley_Row: kneelingPulldown,
  'Kneeling_Single-Arm_High_Pulley_Row': kneelingPulldownOne,
  Shotgun_Row: seatedRowOneArm,
  'Wide-Grip_Pulldown_Behind_The_Neck': pulldown,
  Leverage_High_Row: pulldown,
  Leverage_Iso_Row: seatedRow,
  'Wide-Grip_Rear_Pull-Up': pullUp,
  Gironda_Sternum_Chins: pullUp,
  'Rocky_Pull-Ups_Pulldowns': pullUp,
  Side_To_Side_Chins: pullUp,
  Mixed_Grip_Chin: pullUp,
  Weighted_Pull_Ups: pullUpWeighted,
  'One_Arm_Chin-Up': pullUpOneArm,
  Muscle_Up: muscleUp,
  Kipping_Muscle_Up: muscleUp,
  Rope_Climb: ropeClimb,
  London_Bridges: invertedRowStraps,
  Inverted_Row_with_Straps: invertedRowStraps,
  Suspended_Row: invertedRowStraps,
  Bodyweight_Mid_Row: invertedRowStraps,
  Incline_Bench_Pull: proneRowBar,
  Dumbbell_Incline_Row: proneRow,
  Lying_Cambered_Barbell_Row: proneFlatRow,
  'Lying_T-Bar_Row': proneRowBar,
  Straight_Bar_Bench_Mid_Rows: proneFlatRow,
  Middle_Back_Shrug: proneShrug,
  Alternating_Renegade_Row: renegadeRow,
  'Bent_Over_One-Arm_Long_Bar_Row': barRowOneArm,
  'One-Arm_Long_Bar_Row': barRowOneArm,
  Sled_Row: standingRow,
  Sled_Reverse_Flye: reverseFlyStanding,
  'Calf-Machine_Shoulder_Shrug': shrugBarbell,
  Finger_Curls: wristCurlSeatedBar,
  'Seated_Palm-Up_Barbell_Wrist_Curl': wristCurlSeatedBar,
  'Seated_Palms-Down_Barbell_Wrist_Curl': wristCurlSeatedBar,
  'Palms-Down_Wrist_Curl_Over_A_Bench': wristCurlBench,
  'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench': wristCurlBench,
  'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench': wristCurlBenchDumbbell,
  'Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench': wristCurlBenchDumbbell,
  'Seated_Dumbbell_Palms-Down_Wrist_Curl': wristCurlSeated,
  'Seated_Dumbbell_Palms-Up_Wrist_Curl': wristCurlSeated,
  'Seated_One-Arm_Dumbbell_Palms-Down_Wrist_Curl': wristCurlSeated,
  'Seated_One-Arm_Dumbbell_Palms-Up_Wrist_Curl': wristCurlSeated,
  Cable_Wrist_Curl: wristCurlCable,
  'Seated_Two-Arm_Palms-Up_Low-Pulley_Wrist_Curl': wristCurlCable,
  'Standing_Palms-Up_Barbell_Behind_The_Back_Wrist_Curl': wristCurlBehind,
  Wrist_Rotations_with_Straight_Bar: wristBarRotation,
  Dumbbell_Lying_Pronation: lyingPronation,
  Dumbbell_Lying_Supination: lyingPronation,
  Wrist_Roller: wristRoller,
  Plate_Pinch: plateHold,
  Standing_Olympic_Plate_Hand_Squeeze: plateHold,
  Rickshaw_Carry: farmersWalk,
  Lying_Face_Down_Plate_Neck_Resistance: neckProne,
  Lying_Face_Up_Plate_Neck_Resistance: neckSupine,
  Seated_Head_Harness_Neck_Resistance: neckHarness,
  Clean: clean,
  Power_Clean: clean,
  Power_Clean_from_Blocks: cleanBlocks,
  Clean_from_Blocks: cleanBlocks,
  Hang_Clean: hangClean,
  'Hang_Clean_-_Below_the_Knees': hangClean,
  Smith_Machine_Hang_Power_Clean: hangClean,
  Rack_Delivery: hangClean,
  Split_Clean: splitClean,
  Dumbbell_Clean: cleanDumbbell,
  Kettlebell_Dead_Clean: cleanKettlebellOne,
  Kettlebell_Hang_Clean: cleanKettlebellOne,
  'One-Arm_Kettlebell_Clean': cleanKettlebellOne,
  'One-Arm_Open_Palm_Kettlebell_Clean': cleanKettlebellOne,
  Open_Palm_Kettlebell_Clean: cleanKettlebellOne,
  'Bottoms-Up_Clean_From_The_Hang_Position': cleanKettlebellOne,
  'Two-Arm_Kettlebell_Clean': cleanKettlebell,
  Alternating_Hang_Clean: cleanKettlebellAlternate,
  Double_Kettlebell_Alternating_Hang_Clean: cleanKettlebellAlternate,
  Clean_Pull: pull,
  Snatch_Pull: pull,
  Clean_Shrug: hangShrug,
  Snatch_Shrug: hangShrug,
  Snatch: snatch,
  Power_Snatch: powerSnatch,
  Hang_Snatch: hangSnatch,
  'Hang_Snatch_-_Below_Knees': hangSnatch,
  Muscle_Snatch: muscleSnatch,
  Split_Snatch: splitSnatch,
  Snatch_from_Blocks: snatchBlocks,
  Power_Snatch_from_Blocks: snatchBlocks,
  Snatch_Balance: snatchBalance,
  Heaving_Snatch_Balance: snatchBalance,
  Overhead_Squat: overheadSquat,
  'One-Arm_Overhead_Kettlebell_Squats': overheadSquatKettlebell,
  'One-Arm_Kettlebell_Snatch': snatchKettlebell,
  Double_Kettlebell_Snatch: snatchKettlebellDouble,
  'One-Arm_Kettlebell_Split_Snatch': splitSnatchKettlebell,
  Split_Jerk: splitJerk,
  Power_Jerk: powerJerk,
  Squat_Jerk: squatJerk,
  Jerk_Dip_Squat: jerkDip,
  Jerk_Balance: jerkBalance,
  Clean_and_Jerk: cleanAndJerk,
  Clean_and_Press: cleanAndPress,
  Double_Kettlebell_Jerk: jerkKettlebell,
  'Two-Arm_Kettlebell_Jerk': jerkKettlebell,
  'One-Arm_Kettlebell_Jerk': jerkKettlebellOne,
  'One-Arm_Kettlebell_Split_Jerk': splitJerkKettlebellOne,
  'One-Arm_Kettlebell_Clean_and_Jerk': cleanJerkKettlebellOne,
  Kettlebell_Thruster: thruster,
  Vertical_Swing: verticalSwing,
  Barbell_Squat_To_A_Bench: squatBoxBar,
  Box_Squat_with_Bands: squatBoxBar,
  Box_Squat_with_Chains: squatBoxBar,
  Front_Barbell_Squat_To_A_Bench: squatFrontBox,
  Reverse_Band_Power_Squat: squatBarbell,
  Speed_Squats: squatBarbell,
  Zercher_Squats: zercher,
  Frankenstein_Squat: frankenstein,
  Squat_with_Plate_Movers: squatPlateFront,
  Barbell_Hack_Squat: hackBarbell,
  Hack_Squat: hackMachine,
  Narrow_Stance_Hack_Squats: hackMachine,
  Weighted_Sissy_Squat: sissySquat,
  Kettlebell_Pistol_Squat: pistol,
  Smith_Machine_Pistol_Squat: pistolSmith,
  'Single-Leg_High_Box_Squat': pistolBox,
  Kneeling_Squat: kneelingSquat,
  Kneeling_Jump_Squat: kneelingJump,
  'Step-up_with_Knee_Raise': stepUpKnee,
  Barbell_Step_Ups: stepUpBar,
  Power_Stairs: stepUp,
  'Kettlebell_One-Legged_Deadlift': singleLegRdl,
  One_Leg_Barbell_Squat: bulgarianBar,
  Suspended_Split_Squat: suspendedSplit,
  Barbell_Side_Split_Squat: sideLungeBar,
  Jefferson_Squats: jeffersonSquat,
  Weighted_Squat: beltSquat,
  Lying_Machine_Squat: lyingMachineSquat,
  Smith_Machine_Leg_Press: legPress,
  Weighted_Jump_Squat: weightedJump,
  Hip_Flexion_with_Band: hipFlexionBand,
  'One-Legged_Cable_Kickback': standingKickback,
  Hip_Extension_with_Bands: standingKickbackBand,
  Leg_Lift: standingKickbackBody,
  Standing_Leg_Curl: standingLegCurl,
  Seated_Band_Hamstring_Curl: bandLegCurlSeated,
  Prone_Manual_Hamstring: lyingLegCurl,
  Natural_Glute_Ham_Raise: nordic,
  Glute_Ham_Raise: nordic,
  Platform_Hamstring_Slides: ballLegCurl,
  Pull_Through: pullThrough,
  Band_Good_Morning_Pull_Through: pullThroughBand,
  Good_Morning_off_Pins: goodMorningPins,
  Hanging_Bar_Good_Morning: goodMorningBar,
  Seated_Good_Mornings: goodMorningSeated,
  Reverse_Hyperextension: reverseHyper,
  Downward_Facing_Balance: ballLegLift,
  Hyperextensions_Back_Extensions: hyperextension,
  Hyperextensions_With_No_Hyperextension_Bench: hyperextension,
  Weighted_Ball_Hyperextension: ballHyper,
  Cable_Hip_Adduction: adduction,
  Band_Hip_Adductions: adductionBand,
  Thigh_Abductor: abductorMachine,
  Thigh_Adductor: adductorMachine,
  Monster_Walk: monsterWalk,
  Cable_Deadlifts: deadlift,
  Deadlift_with_Bands: deadlift,
  Deadlift_with_Chains: deadlift,
  Reverse_Band_Deadlift: deadlift,
  Axle_Deadlift: deadlift,
  Trap_Bar_Deadlift: deadlift,
  Car_Deadlift: deadlift,
  Rickshaw_Deadlift: deadlift,
  'One-Arm_Side_Deadlift': deadlift,
  Reverse_Band_Sumo_Deadlift: sumoDeadlift,
  Calf_Press: calfPress,
  Calf_Press_On_The_Leg_Press_Machine: calfPress,
  Donkey_Calf_Raises: donkeyCalf,
  Smith_Machine_Reverse_Calf_Raises: tibialisRaise,
  Balance_Board: balanceBoard,
  Atlas_Stones: stoneLoad,
  Atlas_Stone_Trainer: stoneLoad,
  Keg_Load: stoneLoad,
  Sandbag_Load: stoneLoad,
  Tire_Flip: tireFlip,
  Sled_Push: sledPush,
  Prowler_Sprint: sledPush,
  'Sled_Drag_-_Harness': sledDrag,
  Backward_Drag: backwardDrag,
  Bear_Crawl_Sled_Drags: bearCrawl,
  Yoke_Walk: yokeWalk,
  Conans_Wheel: conanWheel,
  Log_Lift: logLift,
  Circus_Bell: sidePressBell,
  Trail_Running_Walking: run,
  Running_Treadmill: treadmillRun,
  Jogging_Treadmill: treadmillRun,
  Walking_Treadmill: treadmillWalk,
  Bicycling: bike,
  Bicycling_Stationary: bike,
  Recumbent_Bike: recumbentBike,
  Rowing_Stationary: rower,
  Elliptical_Trainer: elliptical,
  Stairmaster: stairClimber,
  Step_Mill: stairClimber,
  Rope_Jumping: ropeJump,
  Skating: skating,
  Lunge_Sprint: sprint,
  'Linear_3-Part_Start_Technique': sprint,
  'Single-Cone_Sprint_Drill': sprint,
  'Side_Hop-Sprint': sprint,
  Chest_Push_with_Run_Release: chestPass,
  Fast_Skipping: skipping,
  Box_Skip: skipping,
  Bench_Sprint: stairClimber,
  Moving_Claw_Series: buttKickSingle,
  Single_Leg_Butt_Kick: buttKickSingle,
  Linear_Acceleration_Wall_Drill: wallDrill,
  Standing_Long_Jump: broadJump,
  Frog_Hops: broadJump,
  'Single-Leg_Hop_Progression': hopOneLeg,
  'Single-Leg_Stride_Jump': stairClimber,
  Alternate_Leg_Diagonal_Bound: lateralBound,
  Stride_Jump_Crossover: lateralBoundBox,
  'Single_Leg_Push-off': stairClimber,
  Hurdle_Hops: hurdleHop,
  Front_Cone_Hops_or_hurdle_hops: hurdleHop,
  Side_Standing_Long_Jump: lateralJump,
  Lateral_Cone_Hops: lateralJump,
  Side_to_Side_Box_Shuffle: lateralBoundBox,
  Lateral_Bound: lateralBound,
  'Single-Leg_Lateral_Hop': lateralBound,
  Lateral_Box_Jump: lateralBoxJump,
  Carioca_Quick_Step: carioca,
  Knee_Tuck_Jump: tuckJump,
  Star_Jump: starJump,
  Split_Jump: splitJump,
  Scissors_Jump: splitJump,
  Double_Leg_Butt_Kick: buttKick,
  Depth_Jump_Leap: depthJump,
  Linear_Depth_Jump: depthJump,
  Quick_Leap: boxJump,
  Bench_Jump: boxJumpBench,
  Dumbbell_Seated_Box_Jump: boxJump,
  Chest_Push_from_3_point_stance: chestPass,
  Chest_Push_multiple_response: chestPass,
  Chest_Push_single_response: chestPass,
  Medicine_Ball_Chest_Pass: chestPass,
  Return_Push_from_Stance: chestPass,
  Heavy_Bag_Thrust: chestPass,
  'Standing_Two-Arm_Overhead_Throw': overheadThrow,
  Catch_and_Overhead_Throw: overheadThrow,
  Overhead_Slam: slam,
  'One-Arm_Medicine_Ball_Slam': slamOneArm,
  Sledgehammer_Swings: sledgehammer,
  Medicine_Ball_Scoop_Throw: scoopThrow,
  Backward_Medicine_Ball_Throw: backwardThrow,
  'Supine_Two-Arm_Overhead_Throw': supineThrow,
  'Supine_One-Arm_Overhead_Throw': supineThrowOne,
  Supine_Chest_Throw: supineChestThrow,
  Kneeling_Arm_Drill: kneelingArms,
  Isometric_Chest_Squeezes: chestSqueeze,
  // @@MAPA@@
}

// Ejercicios propios de Serix (funcional y en casa, ver scripts/catalog/extra_exercises.json): usan la
// figura del ejercicio del catálogo que más se les parece, a veces con otro material (o sin él).
const crabWalk: Figure = {
  // Boca arriba sobre manos y pies, con la cadera en alto: avanza una mano y el pie contrario.
  view: 'side', work: ['arms', 'glutes', 'core'], hands: true, period: 1400, props: [],
  frames: [
    { torso: -62, head: -40, thigh: 70, shin: 170, thigh2: 92, shin2: 185, foot: 90, upper: 195, fore: 185, upper2: 178, fore2: 175 },
    { torso: -62, head: -40, thigh: 92, shin: 185, thigh2: 70, shin2: 170, foot: 90, upper: 178, fore: 175, upper2: 195, fore2: 185 },
  ],
}
const hollowHold: Figure = {
  // Boca arriba con hombros y piernas despegados del suelo y los brazos por encima de la cabeza.
  view: 'side', work: ['core'], anchor: { joint: 'hip', at: [140, 208] }, shadow: 110, period: 4000, props: [],
  frames: [
    { torso: -78, head: -70, thigh: 72, shin: 72, foot: 30, upper: -76, fore: -76 },
    { torso: -77, head: -69, thigh: 73, shin: 73, foot: 30, upper: -75, fore: -75 },
  ],
}
const hollowRock: Figure = {
  ...hollowHold, period: 1400,
  frames: [
    { torso: -86, head: -78, thigh: 64, shin: 64, foot: 30, upper: -84, fore: -84 },
    { torso: -68, head: -60, thigh: 82, shin: 82, foot: 30, upper: -66, fore: -66 },
  ],
}
const wallSit: Figure = {
  // Espalda contra la pared, muslos paralelos al suelo; casi quieto (es isométrico).
  view: 'side', work: ['legs'], period: 4000, props: [{ type: 'box', span: [62, 76], y: 40 }],
  frames: [
    { torso: 0, head: 0, thigh: 90, shin: 180, foot: 90, upper: 90, fore: 90 },
    { torso: -1, head: -1, thigh: 91, shin: 180, foot: 90, upper: 88, fore: 88 },
  ],
}
const lSit: Figure = {
  // En paralelas bajas: brazos estirados y piernas rectas, en horizontal.
  view: 'side', work: ['core', 'arms'], anchor: { joint: 'wrist', at: [120, 190] }, period: 3000,
  props: [{ type: 'box', span: [108, 132], y: 192 }],
  frames: [
    { torso: 0, head: 0, thigh: 96, shin: 96, foot: 60, upper: 180, fore: 180 },
    { torso: -2, head: -2, thigh: 88, shin: 88, foot: 60, upper: 182, fore: 182 },
  ],
}
const pikePushUp: Figure = {
  // Cadera arriba (en V invertida): la cabeza baja hacia el suelo entre las manos.
  view: 'side', work: ['shoulders', 'arms'], anchor: { joint: 'wrist', at: [150, 218] }, hands: true, shadow: 110, props: [],
  frames: [
    { torso: 115, head: 130, thigh: -152, shin: -152, foot: 100, upper: 180, fore: 180 },
    { torso: 140, head: 155, thigh: -158, shin: -158, foot: 100, upper: -145, fore: 150 },
  ],
}
const shadowBox: Figure = {
  // En guardia, un pie adelantado: golpe recto con un brazo mientras el otro protege la cara.
  view: 'side', work: ['shoulders', 'core'], period: 800, props: [],
  frames: [
    { torso: 6, head: 4, thigh: 166, shin: 182, thigh2: 194, shin2: 184, foot: 90, upper: 92, fore: 90, upper2: 150, fore2: 25 },
    { torso: 2, head: 2, thigh: 166, shin: 182, thigh2: 194, shin2: 184, foot: 90, upper: 150, fore: 25, upper2: 92, fore2: 90 },
  ],
}
const SAME_AS: Record<string, string | Figure | [string, Prop[]]> = {
  Wall_Ball: ['Kettlebell_Thruster', [{ type: 'ball', at: 'wrist', size: 11, front: true }]],
  Burpee: 'Freehand_Jump_Squat',
  Burpee_Box_Jump_Over: 'Front_Box_Jump',
  Double_Unders: 'Rope_Jumping',
  Toes_To_Bar: 'Hanging_Leg_Raise',
  Knees_To_Elbows: 'Hanging_Leg_Raise',
  Kipping_Pull_Up: 'Pullups',
  Chest_To_Bar_Pull_Up: 'Pullups',
  Kipping_Handstand_Push_Up: 'Handstand_Push-Ups',
  Wall_Walk: 'Handstand_Push-Ups',
  American_Kettlebell_Swing: 'One-Arm_Kettlebell_Swings',
  Russian_Kettlebell_Swing: 'One-Arm_Kettlebell_Swings',
  Barbell_Thruster: ['Kettlebell_Thruster', [{ type: 'plate', at: 'wrist', front: true, size: 22 }]],
  Dumbbell_Thruster: ['Kettlebell_Thruster', [{ type: 'dumbbell', at: 'wrist', front: true }]],
  Devil_Press: ['One-Arm_Kettlebell_Swings', [{ type: 'dumbbell', at: 'wrist', front: true }]],
  Man_Maker: 'Pushups',
  Box_Step_Over: ['Dumbbell_Step_Ups', FIGURES.Dumbbell_Step_Ups.props.filter((p) => p.type === 'box')],
  GHD_Sit_Up: 'Jackknife_Sit-Up',
  L_Sit: lSit,
  Rowing_Machine: 'Rowing_Stationary',
  Assault_Bike: 'Bicycling_Stationary',
  Ski_Erg: 'Straight-Arm_Pulldown',
  Squat_Clean: 'Clean',
  Hollow_Hold: hollowHold,
  Hollow_Rock: hollowRock,
  V_Up: 'Jackknife_Sit-Up',
  Jumping_Jacks: 'Star_Jump',
  High_Knees: 'Fast_Skipping',
  Skater_Jumps: 'Lateral_Bound',
  Wall_Sit: wallSit,
  Pike_Push_Up: pikePushUp,
  Archer_Push_Up: 'Pushups',
  Plank_Shoulder_Taps: 'Plank',
  Plank_Jacks: 'Mountain_Climbers',
  Bear_Crawl: ['Bear_Crawl_Sled_Drags', []],
  Crab_Walk: crabWalk,
  Bird_Dog: 'Glute_Kickback',
  Reverse_Snow_Angels: 'Superman',
  Backpack_Row: 'Bent_Over_Two-Dumbbell_Row',
  Towel_Door_Row: 'Inverted_Row',
  Pistol_Squat: ['Kettlebell_Pistol_Squat', []],
  Single_Leg_Deadlift: ['Kettlebell_One-Legged_Deadlift', []],
  Bodyweight_Bulgarian_Split_Squat: 'Split_Squats',
  Shuttle_Run: ['Running_Treadmill', []],
  Shadow_Boxing: shadowBox,
  Sprawl: 'Freehand_Jump_Squat',
}
for (const [id, like] of Object.entries(SAME_AS)) {
  FIGURES[id] = typeof like === 'string' ? FIGURES[like] : Array.isArray(like) ? { ...FIGURES[like[0]], props: like[1] } : like
}

// Ejercicios en los que se avanza (caminar, correr, arrastrar, gatear): sus pies y manos no se clavan
// al suelo en la animación (ver plantedPoints en figureEngine.ts).
const GAIT = /walk|run(?!ner)|jog|treadmill|crawl|drag|carry|march|sprint|skip(?!ping_rope)|inchworm|sled|yoke|farmers|conans|stair|step_mill|elliptical|bike|cycling|recumbent/i
// La misma figura puede servir a varios ejercicios: solo cuenta como «de avanzar» si lo son todos (una
// zancada fija comparte figura con la zancada caminando y ahí se ve mejor con los pies quietos).
const users = new Map<Figure, string[]>()
for (const [id, figure] of Object.entries(FIGURES)) users.set(figure, [...(users.get(figure) ?? []), id])
for (const [figure, ids] of users) if (ids.every((id) => GAIT.test(id))) figure.gait = true

export { FLOOR }
