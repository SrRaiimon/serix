// Novedades de cada versión, para enseñarlas una vez al actualizar (Inicio) y en Perfil → Novedades.
// Solo lo que se nota al usar la app, en pocas palabras; la más nueva primero.

export interface Release {
  version: string
  items: [es: string, en: string][]
}

export const CHANGELOG: Release[] = [
  {
    version: '0.0.60',
    items: [
      ['Si una pantalla falla, ya no se queda en blanco: puedes recargar, volver a Inicio o guardar tu copia.', 'If a screen fails it no longer goes blank: you can reload, go Home or save your backup.'],
      ['Perfil → Ayuda: cuenta un fallo o propón una idea.', 'Profile → Help: report a bug or suggest an idea.'],
      ['Letra más grande en Perfil → Ajustes.', 'Bigger text in Profile → Settings.'],
      ['Busca en tu historial por ejercicio, nombre o peso.', 'Search your history by exercise, name or weight.'],
      ['En iPhone, aviso claro: instálala para que Safari no borre tus datos.', 'On iPhone, a clear notice: install it so Safari does not delete your data.'],
    ],
  },
  {
    version: '0.0.59',
    items: [
      ['Cuenta atrás en las series por tiempo (plancha…): se marcan solas.', 'Countdown for timed sets (plank…): they tick themselves.'],
      ['Al terminar: comparación con la última vez, calorías gastadas y estiramientos guiados.', 'When you finish: comparison with last time, calories burned and guided stretches.'],
      ['Tus días de entreno en el calendario del móvil, con aviso.', 'Your training days in your phone calendar, with a reminder.'],
      ['«¿Cómo estás hoy?» antes de entrenar, informe del mes en PDF y lista de la compra de la semana.', '"How do you feel today?" before training, monthly PDF report and weekly shopping list.'],
    ],
  },
  {
    version: '0.0.58',
    items: [
      ['Edita un entreno ya terminado o apunta uno que se te olvidó (Progreso → Historial).', 'Edit a finished workout or log one you forgot (Progress → History).'],
      ['Botones −/+ para el peso, notas por serie y «Repetir este entrenamiento».', '−/+ weight buttons, notes per set and "Repeat this workout".'],
      ['Días fijos de entreno, resumen de la semana los lunes y logros de comida.', 'Fixed training days, weekly recap on Mondays and food achievements.'],
    ],
  },
  {
    version: '0.0.57',
    items: [
      ['Buscador de ejercicios que entiende plurales y nombres de gimnasio («multipower», «pájaros»…).', 'Exercise search that understands plurals and gym slang.'],
      ['Dominadas y fondos cuentan tu peso corporal en marcas y estadísticas.', 'Pull-ups and dips count your bodyweight in records and stats.'],
    ],
  },
]

/** -1, 0 o 1 comparando versiones «0.0.57». */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0) ? -1 : 1
  return 0
}

/** Lo nuevo desde la última versión vista (como mucho las 3 últimas); sin haber visto ninguna, solo la actual. */
export function unseenReleases(seen: string | undefined, current: string): Release[] {
  const upTo = CHANGELOG.filter((r) => compareVersions(r.version, current) <= 0)
  if (!seen) return upTo.slice(0, 1)
  return upTo.filter((r) => compareVersions(r.version, seen) > 0).slice(0, 3)
}
