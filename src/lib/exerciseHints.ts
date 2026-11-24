import { weight, type Unit } from './format'
import { t } from './i18n'
import type { SessionExercise } from './store'

/** Lo que se enseña bajo cada ejercicio de la rutina sobre lo que cambia hoy (↑ +2,5 kg, ↓ −5 kg…); vacío si no cambia nada. */
export function todayWhy(planned: SessionExercise, unit: Unit): string {
  const auto = planned.auto
  return planned.deload ? t('Descarga', 'Deload')
    : auto?.kind === 'up' && auto.assist ? t(`↓ −${weight(auto.from - auto.to, unit)} de ayuda`, `↓ −${weight(auto.from - auto.to, unit)} assistance`)
    : auto?.kind === 'up' ? `↑ +${weight(auto.to - auto.from, unit)}`
      // Bajada por estancamiento (doble progresión): decía «Igual que antes» con 55 kg cuando antes eran 60.
      : auto?.kind === 'down' ? `↓ −${weight(auto.from - auto.to, unit)}`
      : auto?.kind === 'reps' ? (auto.harder ? t('Prueba una variante', 'Try a harder variation') : `↑ ${auto.to} reps`)
      : auto?.kind === 'wave' && auto.reset ? t('5/3/1 · TM −10 %', '5/3/1 · TM −10%')
      : auto?.kind === 'wave' ? t(`5/3/1 · sem. ${auto.week}`, `5/3/1 · wk ${auto.week}`)
        : auto?.kind === 'hold' && auto.mode === 'double' ? t(`Meta: ${planned.repsMax} reps`, `Goal: ${planned.repsMax} reps`)
          : auto?.kind === 'hold' ? t('Repite el peso', 'Repeat the weight')
            // Sin cambio, nada: «Igual que antes» repetido en cada fila era ruido.
            : ''
}

/**
 * ¿Se ofrece la descarga por estancamiento? No si ya hay descarga, una sugerencia de subida, la semana del 5/3/1 o una bajada
 * automática (era el mismo aviso dos veces), ni con series ya hechas.
 */
export function stallOffered(exercise: SessionExercise, hint: string | null | undefined, stalled: object | null | undefined): boolean {
  return !exercise.deload && !hint && !!stalled && exercise.auto?.kind !== 'wave' && exercise.auto?.kind !== 'down' && !exercise.sets.some((x) => x.done)
}
