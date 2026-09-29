import { useId } from 'react'
import type { Exercise } from '../lib/catalog'
import { DECOR, HEAD, REGIONS, SILHOUETTE } from './muscleShapes'

// Mapa muscular propio (dibujo original, sin imágenes de terceros): músculo principal en naranja con
// brillo y secundarios en naranja suave. Los colores base salen de variables CSS (tema claro/oscuro).

type View = 'front' | 'back'
type Muscles = Pick<Exercise, 'muscle' | 'secondaryMuscles'>

const BACK_MUSCLES = new Set(['triceps', 'lats', 'upper-back', 'spine', 'glutes', 'hamstrings', 'traps', 'calves'])

// Encuadre de la miniatura según la zona del músculo principal (x, y, ancho y alto del viewBox).
const CROP = { upper: '10 44 180 180', core: '10 110 180 180', hips: '10 180 180 180', legs: '10 250 180 180' }
const ZONE: Record<string, keyof typeof CROP> = {
  abs: 'core', spine: 'core', glutes: 'hips', abductors: 'hips', adductors: 'hips', quads: 'hips', hamstrings: 'hips', calves: 'legs',
}

function muscleSets({ muscle, secondaryMuscles }: Muscles) {
  const primary = new Set([muscle])
  if (primary.has('abs')) primary.add('obliques')
  const secondary = new Set(secondaryMuscles.filter((m) => !primary.has(m)))
  if (secondary.has('abs')) secondary.add('obliques')
  return { primary, secondary }
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
      {glow && (
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      )}
    </defs>
  )
}

function Figure({ view, muscles, id, glow }: { view: View; muscles: Muscles; id: string; glow: boolean }) {
  const { primary, secondary } = muscleSets(muscles)
  const regions = Object.entries(REGIONS[view])
  const base = regions.filter(([name]) => DECOR.has(name) || !primary.has(name))
  const highlighted = regions.filter(([name]) => !DECOR.has(name) && primary.has(name))
  const fill = (name: string) => (!DECOR.has(name) && secondary.has(name) ? `url(#${id}s)` : `url(#${id}m)`)
  const half = (
    <>
      <path d={SILHOUETTE} className="mm-body" />
      {base.map(([name, d]) => <path key={name} d={d} fill={fill(name)} />)}
      {/* El principal se dibuja al final para que su brillo quede por encima de lo demás. */}
      {highlighted.map(([name, d]) => <path key={name} d={d} fill={`url(#${id}p)`} filter={glow ? `url(#${id}g)` : undefined} />)}
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

/** Frente y espalda con el músculo principal y los secundarios resaltados. */
export function MuscleMap({ exercise }: { exercise: Muscles & Pick<Exercise, 'name'> }) {
  const id = useId()
  const hasSecondary = muscleSets(exercise).secondary.size > 0
  return (
    <div className="muscle-map">
      <svg viewBox="0 0 420 450" role="img" aria-label={`Músculos que trabaja: ${exercise.name}`}>
        <Defs id={id} glow />
        <ellipse cx="100" cy="430" rx="60" ry="6" className="mm-shadow" />
        <ellipse cx="320" cy="430" rx="60" ry="6" className="mm-shadow" />
        <Figure view="front" muscles={exercise} id={id} glow />
        <g transform="translate(220,0)"><Figure view="back" muscles={exercise} id={id} glow /></g>
      </svg>
      <div className="mm-legend">
        <span><i className="mm-key-primary" /> Principal</span>
        {hasSecondary && <span><i className="mm-key-secondary" /> Secundarios</span>}
      </div>
    </div>
  )
}

/** Miniatura: la vista (frente o espalda) y la zona del cuerpo donde está el músculo principal. */
export function MuscleThumb({ exercise, size }: { exercise: Muscles; size: number }) {
  const id = useId()
  const view: View = BACK_MUSCLES.has(exercise.muscle) ? 'back' : 'front'
  return (
    <svg className="thumb muscle-thumb" width={size} height={size} viewBox={CROP[ZONE[exercise.muscle] ?? 'upper']} aria-hidden="true">
      <Defs id={id} glow={false} />
      <Figure view={view} muscles={exercise} id={id} glow={false} />
    </svg>
  )
}
