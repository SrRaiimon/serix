import { useId } from 'react'
import type { Exercise } from '../lib/catalog'
import { DECOR, HEAD, REGIONS, SILHOUETTE } from './muscleShapes'
import { t } from '../lib/i18n'

// Mapa muscular propio (dibujo original, sin imágenes de terceros). Cada músculo se pinta con una
// intensidad: principal (naranja con brillo), secundario, ligera o sin trabajar. Los colores base
// salen de variables CSS (tema claro/oscuro).

type View = 'front' | 'back'
type Muscles = Pick<Exercise, 'muscle' | 'secondaryMuscles'>
/** p = principal, s = secundario, l = ligero, m = sin resaltar. */
export type Paint = 'p' | 's' | 'l' | 'm'

const BACK_MUSCLES = new Set(['triceps', 'lats', 'upper-back', 'spine', 'glutes', 'hamstrings', 'traps', 'calves'])

// Encuadre de la miniatura según la zona del músculo principal (x, y, ancho y alto del viewBox).
const CROP = { upper: '10 44 180 180', core: '10 110 180 180', hips: '10 180 180 180', legs: '10 250 180 180' }
const ZONE: Record<string, keyof typeof CROP> = {
  abs: 'core', spine: 'core', glutes: 'hips', abductors: 'hips', adductors: 'hips', quads: 'hips', hamstrings: 'hips', calves: 'legs',
}

/** Los oblicuos no son un músculo del catálogo: siguen al abdomen. */
const alias = (name: string) => (name === 'obliques' ? 'abs' : name)

function exercisePaint({ muscle, secondaryMuscles }: Muscles): (name: string) => Paint {
  const secondary = new Set(secondaryMuscles)
  return (name) => {
    const key = alias(name)
    return key === muscle ? 'p' : secondary.has(key) ? 's' : 'm'
  }
}

/** Degradados de cada dibujo, con identificadores únicos para que no choquen entre miniaturas. */
function Defs({ id, glow }: { id: string; glow: boolean }) {
  return (
    <defs>
      <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" className="mm-stop-m1" />
        <stop offset="1" className="mm-stop-m2" />
      </linearGradient>
      <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffa06b" />
        <stop offset="0.55" stopColor="#ff6a3d" />
        <stop offset="1" stopColor="#e8481f" />
      </linearGradient>
      <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffb48f" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ff7a4d" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffb08a" stopOpacity="0.6" />
        <stop offset="1" stopColor="#ff8a5c" stopOpacity="0.45" />
      </linearGradient>
      {glow && (
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      )}
    </defs>
  )
}

function Figure({ view, paint, id, glow }: { view: View; paint: (name: string) => Paint; id: string; glow: boolean }) {
  const regions = Object.entries(REGIONS[view]).map(([name, d]) => [name, d, DECOR.has(name) ? 'm' : paint(name)] as const)
  const half = (
    <>
      <path d={SILHOUETTE} className="mm-body" />
      {regions.filter(([, , p]) => p !== 'p').map(([name, d, p]) => <path key={name} d={d} fill={`url(#${id}${p})`} />)}
      {/* Los principales se dibujan al final para que su brillo quede por encima de lo demás. */}
      {regions.filter(([, , p]) => p === 'p').map(([name, d]) => <path key={name} d={d} fill={`url(#${id}p)`} filter={glow ? `url(#${id}g)` : undefined} />)}
    </>
  )
  return (
    <>
      <path d={HEAD} fill={`url(#${id}m)`} className="mm-head" />
      <path d={HEAD} fill={`url(#${id}m)`} className="mm-head" transform="translate(200,0) scale(-1,1)" />
      {half}
      <g transform="translate(200,0) scale(-1,1)">{half}</g>
    </>
  )
}

function Views({ paint, label }: { paint: (name: string) => Paint; label: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 420 450" role="img" aria-label={label}>
      <Defs id={id} glow />
      <ellipse cx="100" cy="430" rx="60" ry="6" className="mm-shadow" />
      <ellipse cx="320" cy="430" rx="60" ry="6" className="mm-shadow" />
      <Figure view="front" paint={paint} id={id} glow />
      <g transform="translate(220,0)"><Figure view="back" paint={paint} id={id} glow /></g>
    </svg>
  )
}

/** Frente y espalda con el músculo principal y los secundarios resaltados. */
export function MuscleMap({ exercise }: { exercise: Muscles & Pick<Exercise, 'name'> }) {
  return (
    <div className="muscle-map">
      <Views paint={exercisePaint(exercise)} label={`${t('Músculos que trabaja', 'Muscles worked')}: ${exercise.name}`} />
      <div className="mm-legend">
        <span><i className="mm-key-primary" /> {t('Principal', 'Primary')}</span>
        {exercise.secondaryMuscles.length > 0 && <span><i className="mm-key-secondary" /> {t('Secundarios', 'Secondary')}</span>}
      </div>
    </div>
  )
}

/** Series semanales a partir de las que un músculo se considera bien trabajado, poco o nada. */
export const HEAT_LEVELS = { high: 10, medium: 4 }

export function heatPaint(load: Record<string, number>): (name: string) => Paint {
  return (name) => {
    const sets = load[alias(name)] ?? 0
    return sets >= HEAT_LEVELS.high ? 'p' : sets >= HEAT_LEVELS.medium ? 's' : sets > 0 ? 'l' : 'm'
  }
}

/** Mapa de calor: cuanto más trabajado el músculo en el periodo, más intenso el naranja. */
export function MuscleHeatMap({ load }: { load: Record<string, number> }) {
  return (
    <div className="muscle-map">
      <Views paint={heatPaint(load)} label={t('Músculos trabajados en los últimos 7 días', 'Muscles worked in the last 7 days')} />
      <div className="mm-legend">
        <span><i className="mm-key-light" /> 1-3</span>
        <span><i className="mm-key-secondary" /> 4-9</span>
        <span><i className="mm-key-primary" /> {t('10+ series', '10+ sets')}</span>
      </div>
    </div>
  )
}

/** Miniatura: la vista (frente o espalda) y la zona del cuerpo donde está el músculo principal. */
export function MuscleThumb({ exercise, size }: { exercise: Muscles; size: number }) {
  const id = useId().replace(/:/g, '')
  const view: View = BACK_MUSCLES.has(exercise.muscle) ? 'back' : 'front'
  return (
    <svg className="thumb muscle-thumb" width={size} height={size} viewBox={CROP[ZONE[exercise.muscle] ?? 'upper']} aria-hidden="true">
      <Defs id={id} glow={false} />
      <Figure view={view} paint={exercisePaint(exercise)} id={id} glow={false} />
    </svg>
  )
}
