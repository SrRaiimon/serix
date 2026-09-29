import type { Exercise } from '../lib/catalog'

// Mapa muscular propio (dibujo original, sin imágenes de terceros). Cada vista mide 200 x 400 con el
// eje de simetría en x = 100: solo se define la mitad izquierda y se refleja. Las claves de los
// músculos son las del catálogo.

type View = 'front' | 'back'

const OUTLINE = 'M100,62 L91,62 Q90,56 90,52 Q80,66 70,70 Q58,74 56,88 Q52,104 52,118 Q50,134 48,148 '
  + 'Q44,170 42,190 Q40,200 42,206 Q46,212 50,206 Q52,196 54,190 Q60,168 62,150 Q64,134 66,120 '
  + 'Q70,112 72,108 Q76,130 76,150 Q74,164 72,176 Q70,200 72,226 Q74,250 76,262 Q72,290 74,318 '
  + 'Q76,340 78,358 Q74,368 80,372 L94,372 Q96,366 94,358 Q94,330 96,300 Q96,280 94,266 Q98,240 98,214 L100,200'

const ARMS = {
  upper: 'M58,108 Q54,124 54,138 Q58,146 62,142 Q66,128 68,110 Q64,104 58,108 Z',
  forearms: 'M52,150 Q46,168 44,188 Q48,192 52,188 Q58,170 62,152 Q58,146 52,150 Z',
}

const REGIONS: Record<View, Record<string, string>> = {
  front: {
    neck: 'M92,52 Q93,58 95,62 L91,62 Z',
    traps: 'M91,62 Q82,66 72,70 Q84,70 94,66 Z',
    delts: 'M72,70 Q58,74 56,90 Q56,100 58,106 Q66,98 70,88 Q74,78 78,72 Z',
    pectorals: 'M99,76 Q88,72 78,74 Q70,84 70,100 Q76,110 90,110 Q98,108 99,100 Z',
    biceps: ARMS.upper,
    forearms: ARMS.forearms,
    abs: 'M91,112 L99,112 L99,124 L91,124 Z M91,127 L99,127 L99,139 L91,139 Z M91,142 L99,142 L99,154 L91,154 Z M91,157 Q95,176 99,182 L99,157 Z',
    obliques: 'M88,112 Q80,112 76,118 Q78,140 78,156 Q84,166 88,170 Z',
    abductors: 'M76,178 Q72,194 73,212 Q76,198 80,184 Z',
    quads: 'M79,184 Q74,208 76,238 Q79,256 88,258 Q96,252 96,232 Q96,206 90,188 Z',
    adductors: 'M92,190 Q98,200 98,214 Q96,226 96,232 Q94,212 90,198 Z',
    calves: 'M78,274 Q74,296 78,320 Q82,334 86,336 Q90,318 90,296 Q88,280 84,272 Z',
  },
  back: {
    neck: 'M92,52 Q93,58 95,62 L91,62 Z',
    traps: 'M100,56 L92,58 Q84,66 72,70 Q84,76 92,92 Q96,104 100,112 Z',
    delts: 'M72,70 Q58,74 56,90 Q56,100 58,106 Q66,98 70,88 Q74,80 76,74 Z',
    triceps: ARMS.upper,
    forearms: ARMS.forearms,
    'upper-back': 'M76,76 Q72,88 74,100 Q82,100 90,94 Q84,82 76,76 Z',
    lats: 'M74,102 Q72,120 78,146 Q86,150 96,140 Q98,124 92,98 Q84,104 74,102 Z',
    spine: 'M96,140 Q90,150 88,166 Q94,172 99,172 L99,120 Q98,130 96,140 Z',
    abductors: 'M75,176 Q71,188 72,200 Q75,190 78,178 Z',
    glutes: 'M78,176 Q73,190 76,206 Q88,214 99,208 L99,178 Q88,172 78,176 Z',
    hamstrings: 'M76,212 Q72,232 76,252 Q84,260 94,254 Q98,236 96,214 Q86,218 76,212 Z',
    calves: 'M78,270 Q72,290 76,312 Q82,322 88,318 Q92,300 90,282 Q86,270 78,270 Z',
  },
}

const DETAILS: Record<View, string> = {
  front: 'M99,74 L99,112 M78,262 Q86,268 94,264',
  back: 'M100,62 L100,176 M80,262 Q86,266 94,262',
}

const BACK_MUSCLES = new Set(['triceps', 'lats', 'upper-back', 'spine', 'glutes', 'hamstrings', 'traps', 'calves'])

// Encuadre de la miniatura según la zona del músculo principal (x, y, ancho y alto del viewBox).
const CROP: Record<string, string> = {
  upper: '10 40 180 180', core: '10 90 180 180', hips: '10 150 180 180', legs: '10 200 180 180',
}
const ZONE: Record<string, keyof typeof CROP> = {
  abs: 'core', spine: 'core', glutes: 'hips', abductors: 'hips', adductors: 'hips', quads: 'hips', hamstrings: 'hips', calves: 'legs',
}

function Figure({ view, primary, secondary }: { view: View; primary: Set<string>; secondary: Set<string> }) {
  const half = (
    <>
      <path d={OUTLINE} className="mm-body" />
      {Object.entries(REGIONS[view]).map(([name, d]) => (
        <path key={name} d={d} className={primary.has(name) ? 'mm-muscle mm-primary' : secondary.has(name) ? 'mm-muscle mm-secondary' : 'mm-muscle'} />
      ))}
      <path d={DETAILS[view]} className="mm-detail" />
    </>
  )
  return (
    <>
      <ellipse cx="100" cy="32" rx="16" ry="20" className="mm-body mm-head" />
      {half}
      <g transform="translate(200,0) scale(-1,1)">{half}</g>
    </>
  )
}

function sets(exercise: Pick<Exercise, 'muscle' | 'secondaryMuscles'>) {
  const primary = new Set([exercise.muscle])
  if (primary.has('abs')) primary.add('obliques')
  const secondary = new Set(exercise.secondaryMuscles.filter((m) => !primary.has(m)))
  if (secondary.has('abs')) secondary.add('obliques')
  return { primary, secondary }
}

/** Frente y espalda con el músculo principal y los secundarios resaltados. */
export function MuscleMap({ exercise }: { exercise: Pick<Exercise, 'name' | 'muscle' | 'secondaryMuscles'> }) {
  const { primary, secondary } = sets(exercise)
  return (
    <div className="muscle-map">
      <svg viewBox="0 0 420 380" role="img" aria-label={`Músculos que trabaja: ${exercise.name}`}>
        <Figure view="front" primary={primary} secondary={secondary} />
        <g transform="translate(220,0)"><Figure view="back" primary={primary} secondary={secondary} /></g>
      </svg>
      <div className="mm-legend">
        <span><i className="mm-primary" /> Principal</span>
        {secondary.size > 0 && <span><i className="mm-secondary" /> Secundarios</span>}
      </div>
    </div>
  )
}

/** Miniatura: la vista (frente o espalda) y la zona del cuerpo donde está el músculo principal. */
export function MuscleThumb({ exercise, size }: { exercise: Pick<Exercise, 'muscle' | 'secondaryMuscles'>; size: number }) {
  const { primary, secondary } = sets(exercise)
  const view: View = BACK_MUSCLES.has(exercise.muscle) ? 'back' : 'front'
  return (
    <svg className="thumb muscle-thumb" width={size} height={size} viewBox={CROP[ZONE[exercise.muscle] ?? 'upper']} aria-hidden="true">
      <Figure view={view} primary={primary} secondary={secondary} />
    </svg>
  )
}
