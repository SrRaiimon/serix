import { t } from './i18n'
import type { Segment } from './intervals'

// Calentamientos guiados de unos 5 o 10 minutos según lo que toque entrenar. Movimientos generales de
// movilidad y activación, descritos con palabras propias; se siguen con el temporizador de intervalos
// (cada movimiento es un tramo con su nombre y una indicación, y entre uno y otro 5 s para cambiar).

export type WarmupFocus = 'full' | 'upper' | 'legs'
export const WARMUP_FOCUS: WarmupFocus[] = ['full', 'upper', 'legs']

interface Move {
  name: [es: string, en: string]
  cue: [es: string, en: string]
}

const M = {
  jacks: { name: ['Saltos de tijera', 'Jumping jacks'], cue: ['A ritmo suave, para subir pulsaciones.', 'At an easy pace, to raise your heart rate.'] },
  jog: { name: ['Trote en el sitio', 'Jog in place'], cue: ['Suave, subiendo poco a poco las rodillas.', 'Easy, gradually lifting the knees higher.'] },
  armCircles: { name: ['Círculos de brazos', 'Arm circles'], cue: ['Hacia delante y luego hacia atrás, cada vez más amplios.', 'Forwards then backwards, getting bigger each time.'] },
  catCow: { name: ['Gato y vaca', 'Cat-cow'], cue: ['A cuatro patas: redondea la espalda y luego arquéala, despacio.', 'On all fours: round your back, then arch it, slowly.'] },
  thoracic: { name: ['Giros de espalda a cuatro patas', 'Quadruped thoracic rotations'], cue: ['Mano en la nuca, gira el codo hacia el techo. Cambia de lado a mitad.', 'Hand behind your head, rotate the elbow to the ceiling. Switch sides halfway.'] },
  scapPush: { name: ['Flexiones escapulares', 'Scapular push-ups'], cue: ['En plancha con brazos rectos: junta y separa los omóplatos.', 'Plank with straight arms: squeeze and spread your shoulder blades.'] },
  ytw: { name: ['Y-T-W boca abajo', 'Prone Y-T-W'], cue: ['Tumbado boca abajo, dibuja una Y, una T y una W con los brazos.', 'Lying face down, make a Y, a T and a W with your arms.'] },
  inchworm: { name: ['Gusano', 'Inchworm'], cue: ['De pie, baja las manos al suelo, camina hasta la plancha y vuelve.', 'Standing, hands to the floor, walk out to a plank and back.'] },
  easyPush: { name: ['Flexiones suaves', 'Easy push-ups'], cue: ['Pocas y controladas; con las rodillas apoyadas si hace falta.', 'A few, controlled; on your knees if needed.'] },
  hipCircles: { name: ['Círculos de cadera', 'Hip circles'], cue: ['Manos en la cintura, círculos amplios en los dos sentidos.', 'Hands on hips, wide circles in both directions.'] },
  legSwings: { name: ['Balanceo de piernas', 'Leg swings'], cue: ['Apoyado en la pared, adelante y atrás. Cambia de pierna a mitad.', 'Holding a wall, forwards and back. Switch legs halfway.'] },
  lungeTwist: { name: ['Zancada con giro', 'Lunge with twist'], cue: ['Zancada larga y gira el tronco hacia la pierna de delante. Alterna.', 'Long lunge and rotate your torso toward the front leg. Alternate.'] },
  bridge: { name: ['Puente de glúteo', 'Glute bridge'], cue: ['Tumbado boca arriba, sube la cadera apretando el glúteo.', 'Lying on your back, lift your hips squeezing your glutes.'] },
  ankle: { name: ['Movilidad de tobillo', 'Ankle mobility'], cue: ['Lleva la rodilla por encima de la punta del pie sin levantar el talón. Cambia a mitad.', 'Drive your knee over your toes without lifting the heel. Switch halfway.'] },
  squat: { name: ['Sentadillas sin peso', 'Bodyweight squats'], cue: ['Bajando hondo y despacio, con el pecho arriba.', 'Going deep and slow, chest up.'] },
} satisfies Record<string, Move>

const ROUTINES: Record<WarmupFocus, Move[]> = {
  full: [M.jacks, M.armCircles, M.hipCircles, M.catCow, M.lungeTwist, M.inchworm, M.squat, M.scapPush],
  upper: [M.jacks, M.armCircles, M.catCow, M.thoracic, M.scapPush, M.ytw, M.inchworm, M.easyPush],
  legs: [M.jog, M.hipCircles, M.legSwings, M.catCow, M.lungeTwist, M.bridge, M.ankle, M.squat],
}

// Vuelta a la calma: estiramientos suaves al terminar, sin rebotes. Cada uno se mantiene respirando
// despacio; en los de un lado, se cambia a mitad.
const S = {
  breathe: { name: ['Respiración lenta', 'Slow breathing'], cue: ['De pie o tumbado: coge aire en 4 s y suéltalo en 6 s.', 'Standing or lying down: breathe in for 4 s and out for 6 s.'] },
  chest: { name: ['Pecho en el marco de la puerta', 'Doorway chest stretch'], cue: ['Antebrazo en el marco, da un paso adelante hasta notar el pecho. Cambia a mitad.', 'Forearm on the door frame, step forward until you feel your chest. Switch halfway.'] },
  lats: { name: ['Dorsal colgado o apoyado', 'Lat stretch'], cue: ['Agarra un soporte alto y deja caer la cadera hacia atrás, brazos estirados.', 'Hold something high and sit your hips back, arms straight.'] },
  shoulder: { name: ['Hombro cruzado', 'Cross-body shoulder'], cue: ['Lleva un brazo estirado por delante del pecho y sujétalo con el otro. Cambia a mitad.', 'Bring one straight arm across your chest and hold it with the other. Switch halfway.'] },
  triceps: { name: ['Tríceps por detrás de la cabeza', 'Overhead triceps'], cue: ['Codo hacia el techo, mano a la espalda; empuja suave el codo. Cambia a mitad.', 'Elbow to the ceiling, hand down your back; gently push the elbow. Switch halfway.'] },
  child: { name: ['Postura del niño', "Child's pose"], cue: ['De rodillas, siéntate en los talones y estira los brazos al frente.', 'Kneeling, sit back on your heels and reach your arms forward.'] },
  quads: { name: ['Cuádriceps de pie', 'Standing quad stretch'], cue: ['Coge el empeine y acerca el talón al glúteo, rodillas juntas. Cambia a mitad.', 'Hold your foot and bring the heel to your glutes, knees together. Switch halfway.'] },
  hamstrings: { name: ['Isquios sentado', 'Seated hamstring stretch'], cue: ['Una pierna estirada, inclínate desde la cadera con la espalda recta. Cambia a mitad.', 'One leg straight, lean forward from the hips with a straight back. Switch halfway.'] },
  hipFlexor: { name: ['Flexor de cadera en zancada', 'Kneeling hip flexor'], cue: ['Rodilla de atrás en el suelo, aprieta el glúteo y lleva la cadera adelante. Cambia a mitad.', 'Back knee down, squeeze your glute and push your hips forward. Switch halfway.'] },
  glutes: { name: ['Glúteo tumbado (figura 4)', 'Figure-4 glute stretch'], cue: ['Tobillo sobre la rodilla contraria y acerca las piernas al pecho. Cambia a mitad.', 'Ankle over the opposite knee and pull your legs to your chest. Switch halfway.'] },
  calves: { name: ['Gemelo en la pared', 'Wall calf stretch'], cue: ['Pierna de atrás estirada y el talón en el suelo. Cambia a mitad.', 'Back leg straight with the heel down. Switch halfway.'] },
} satisfies Record<string, Move>

const COOLDOWNS: Record<WarmupFocus, Move[]> = {
  full: [S.chest, S.lats, S.quads, S.hamstrings, S.glutes, S.breathe],
  upper: [S.chest, S.lats, S.shoulder, S.triceps, S.child, S.breathe],
  legs: [S.quads, S.hamstrings, S.hipFlexor, S.glutes, S.calves, S.breathe],
}

/** Tramos de la vuelta a la calma (como el calentamiento, con estiramientos según lo entrenado). */
export function cooldownSegments(focus: WarmupFocus, seconds: number, prep: number): Segment[] {
  return segmentsOf(COOLDOWNS[focus], seconds, prep)
}

export const focusLabel = (f: WarmupFocus) => (f === 'full' ? t('Cuerpo completo', 'Full body') : f === 'upper' ? t('Torso', 'Upper body') : t('Pierna', 'Legs'))

const SWITCH = 5

/** Tramos del calentamiento: cada movimiento `seconds` segundos y 5 s para cambiar al siguiente. */
export function warmupSegments(focus: WarmupFocus, seconds: number, prep: number): Segment[] {
  return segmentsOf(ROUTINES[focus], seconds, prep)
}

function segmentsOf(moves: Move[], seconds: number, prep: number): Segment[] {
  const segments: Segment[] = prep > 0 ? [{ kind: 'prep', seconds: prep, round: 0, label: t(...moves[0].name) }] : []
  moves.forEach((m, i) => {
    segments.push({ kind: 'work', seconds, round: i + 1, label: t(...m.name), cue: t(...m.cue) })
    const next = moves[i + 1]
    if (next) segments.push({ kind: 'rest', seconds: SWITCH, round: i + 1, label: t(...next.name) })
  })
  return segments
}

/** Qué calentar según los músculos del entrenamiento. */
export function focusFor(muscles: string[]): WarmupFocus {
  const legs = muscles.filter((m) => ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'].includes(m)).length
  const upper = muscles.length - legs
  if (legs > 0 && legs >= upper * 2) return 'legs'
  if (upper > 0 && upper >= legs * 2) return 'upper'
  return 'full'
}
