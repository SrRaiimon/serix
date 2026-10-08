// Novedades de cada versión, para enseñarlas una vez al actualizar (Inicio) y en Perfil → Novedades.
// Solo lo que se nota al usar la app, en pocas palabras; la más nueva primero.

export interface Release {
  version: string
  items: [es: string, en: string][]
}

export const CHANGELOG: Release[] = [
  {
    version: '0.0.64',
    items: [
      ['Modo foco en el entreno: solo la serie que toca, con números y botones grandes.', 'Focus mode in workouts: just the current set, with big numbers and buttons.'],
      ['Tempo de las repeticiones (p. ej. 3-1-1) con pitidos que marcan el ritmo.', 'Rep tempo (e.g. 3-1-1) with beeps that keep the pace.'],
      ['Mancuernas: apunta el peso de cada una y el peso movido cuenta las dos.', 'Dumbbells: log the weight of each one and the total counts both.'],
      ['Fotos de progreso con guía: tu foto anterior en transparente para ponerte igual.', 'Guided progress photos: your previous photo faded on top so you line up the same.'],
      ['«Lo que te hace rendir mejor»: sueño, hora y descanso según tus entrenos.', '"What makes you perform better": sleep, time and rest from your workouts.'],
      ['Menú de toda la semana, suplementos, ayuno intermitente y escanear varios productos seguidos.', 'A whole-week menu, supplements, intermittent fasting and scanning several products in a row.'],
      ['Retos de comida con amigos: días apuntando y días cumpliendo la proteína.', 'Food challenges with friends: days logging and days hitting protein.'],
      ['El muñeco de los ejercicios se mueve mejor: los pies y las manos de apoyo ya no patinan y la prensa de piernas apoya bien.', 'The exercise figure moves better: supporting feet and hands no longer slide and the leg press sits right.'],
    ],
  },
  {
    version: '0.0.63',
    items: [
      ['Contar un fallo o proponer una idea: escríbelo y elige si me lo mandas por Instagram, LinkedIn o GitHub.', 'Report a bug or suggest an idea: write it and choose Instagram, LinkedIn or GitHub to send it to me.'],
    ],
  },
  {
    version: '0.0.62',
    items: [
      ['Perfil → Ayuda: mis redes para contarme un fallo o una idea.', 'Profile → Help: my social links to report a bug or share an idea.'],
    ],
  },
  {
    version: '0.0.61',
    items: [
      ['Metas de fuerza en Progreso: «100 kg en banca» con previsión de cuándo llegas.', 'Strength goals in Progress: "100 kg bench" with a forecast of when you get there.'],
      ['Gráficas de todas tus medidas y la tendencia del peso (media de 7 días).', 'Charts for all your measurements and your weight trend (7-day average).'],
      ['Elige qué rutina toca cada día (Perfil → Días de entreno) y programa por % de tu máximo.', 'Choose which routine goes on each day (Profile → Training days) and program by % of your max.'],
      ['Comidas a tu manera: añade «Almuerzo» o «Recena» y renómbralas (Comidas → Más).', 'Meals your way: add mid-morning or a late snack and rename them (Food → More).'],
      ['Comparte un récord como imagen y tus alimentos o recetas con un enlace.', 'Share a record as an image and your foods or recipes with a link.'],
      ['Aviso cuando tu racha de semanas está en peligro.', 'A heads-up when your weekly streak is at risk.'],
    ],
  },
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
