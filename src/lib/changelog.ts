// Novedades de cada versión, para enseñarlas una vez al actualizar (Inicio) y en Perfil → Novedades.
// Solo lo que se nota al usar la app, en pocas palabras; la más nueva primero.

export interface Release {
  version: string
  items: [es: string, en: string][]
}

export const CHANGELOG: Release[] = [
  {
    version: '0.0.71',
    items: [
      ['Con la app abierta en dos pestañas, los cambios se juntan bien: lo que borras no vuelve y lo que cambias en la otra no se pierde.', 'With the app open in two tabs, changes are merged properly: what you delete stays deleted and what you change in the other tab is kept.'],
      ['Programas y Biblioteca más adecuados: sin dominadas si no tienes barra, sin nórdico ni pino para quien empieza, y un ejercicio parecido cuando falta material en vez de dejar el hueco.', 'Better programs and library: no pull-ups without a bar, no Nordic curls or handstands for beginners, and a similar exercise when equipment is missing instead of leaving a gap.'],
      ['Series y descansos según el ejercicio: goblet o prensa nunca a 3 repeticiones, aislamientos con menos descanso y cada sesión ajustada a tus minutos.', 'Sets and rests that fit each exercise: goblet squats or leg press never at 3 reps, shorter rests for isolation work and every session fitted to your minutes.'],
      ['Inicio aún más ligero: las novedades caben en una línea y el aviso para instalar solo sale si no hay otro.', 'An even lighter Home: news fits in one line and the install prompt only shows when there is no other notice.'],
      ['Cifras más claras: duración de las rutinas más realista, «con tu peso» en dominadas y fondos, toneladas levantadas en Perfil y cuánto suman o restan las calorías de cada día.', 'Clearer figures: more realistic routine durations, "incl. bodyweight" on pull-ups and dips, tonnes lifted in Profile and how much each day adds or subtracts in calories.'],
    ],
  },
  {
    version: '0.0.70',
    items: [
      ['Inicio más despejado: un solo aviso a la vez y el entrenador te enseña su consejo principal (el resto, a un toque).', 'A cleaner Home screen: one notice at a time, and the coach shows its main tip (the rest are one tap away).'],
      ['Calorías según lo que gastas: los días sin entreno restan el gasto medio de tus entrenos y nunca bajan de tu metabolismo en reposo. Si tienes días de entreno marcados, hoy ya cuenta como día de entreno.', 'Calories based on what you burn: rest days subtract your average workout burn and never go below your resting metabolism. If you have training days set, today already counts as a training day.'],
      ['Programas más adecuados: nada de ejercicios de experto ni dominadas sin barra para quien empieza, un solo básico pesado de espalda por día y como mucho 10 series de un músculo por sesión.', 'Better-fitting programs: no expert exercises or pull-ups without a bar for beginners, one heavy back-loading lift per day and at most 10 sets per muscle per session.'],
      ['El peso muerto sube de 5 en 5 kg, el modo porcentaje mira tus últimos 90 días (tras una pausa, un 10 % menos) y en el 5/3/1 un AMRAP saltado cuenta como fallido.', 'Deadlifts go up 5 kg at a time, percentage mode looks at your last 90 days (10% less after a break) and in 5/3/1 a skipped AMRAP counts as missed.'],
      ['Con la app abierta en dos pestañas, los cambios de las dos se juntan en vez de pisarse.', 'With the app open in two tabs, changes from both are combined instead of overwritten.'],
      ['Mejor con lector de pantalla: cada pantalla anuncia su título y los días de la semana se leen enteros.', 'Better with screen readers: every screen announces its title and weekdays are read in full.'],
    ],
  },
  {
    version: '0.0.69',
    items: [
      ['Perfil más corto: los ajustes van en cuatro apartados (General, Entrenamiento, Avisos y sonido, Tus datos).', 'Shorter Profile: settings are grouped into four sections (General, Training, Alerts and sound, Your data).'],
      ['Bienvenida más ligera: el nombre y el aviso de salud pasan al último paso, junto a tu plan.', 'Lighter welcome: your name and the health notice move to the last step, next to your plan.'],
      ['Calorías del entreno más realistas (cuentan los descansos) y el 5/3/1 baja el máximo un 10 % si fallas un AMRAP.', 'More realistic workout calories (rests are taken into account) and 5/3/1 lowers the training max by 10% if you miss an AMRAP.'],
      ['Saltos de peso más pequeños en sentadilla goblet y zancadas, y el modo porcentaje usa tu 1RM de los últimos 90 días.', 'Smaller weight jumps on goblet squats and lunges, and percentage mode uses your 1RM from the last 90 days.'],
      ['Con la app abierta en dos pestañas ya no se pisan los datos, y las copias antiguas se actualizan al importarlas.', 'With the app open in two tabs, data no longer gets overwritten, and old backups are updated when imported.'],
    ],
  },
  {
    version: '0.0.68',
    items: [
      ['Progresión más lista: tiene en cuenta el esfuerzo (RPE), sube menos en ejercicios de aislamiento y, si te atascas 3 veces, baja un 10 % para volver a subir.', 'Smarter progression: it takes effort (RPE) into account, uses smaller jumps on isolation exercises and, if you stall 3 times, drops 10% to climb again.'],
      ['Al marcar una serie con un toque te dice qué se ha apuntado (con «Deshacer»), el peso pasa solo a las series siguientes y avisa si una serie con barra va sin peso.', 'Ticking a set with one tap tells you what was logged (with "Undo"), the weight carries over to the next sets and it warns you if a barbell set has no weight.'],
      ['«Perder grasa» mantiene cargas pesadas en los básicos, el 5×5 hace una sola serie de peso muerto y quien empieza con 5-6 días recibe un reparto más llevadero.', '"Lose fat" keeps heavy loads on the main lifts, 5×5 does a single deadlift set and beginners choosing 5-6 days get a gentler split.'],
      ['Las actualizaciones a mitad de entreno ya no rompen ninguna pantalla, ni sin conexión.', 'Updates arriving mid-workout no longer break any screen, even offline.'],
    ],
  },
  {
    version: '0.0.67',
    items: [
      ['Más seguro con tus datos: si el móvil no deja leerlos al abrir, la app ya no guarda nada encima, y te avisa si un guardado falla.', 'Safer with your data: if the phone will not let the app read it on opening, nothing is saved over it, and you are told if a save fails.'],
      ['Marca una serie con un solo toque: si no escribes las repeticiones, se apuntan las del objetivo.', 'Tick a set with one tap: if you do not type the reps, the target reps are logged.'],
      ['Entreno e Inicio más despejados: lo que toca hoy, arriba; Perfil ordenado por grupos.', 'Cleaner workout and Home screens: today\'s workout on top; Profile organised into groups.'],
      ['Calorías más exactas los días que entrenas (no se suma el entreno dos veces) y opción «Sedentario».', 'More accurate calories on training days (the workout is no longer counted twice) and a "Sedentary" option.'],
      ['Las pruebas de los sábados se adaptan a tu nivel y los WOD indican qué peso usar.', 'Saturday tests adapt to your level and WODs suggest what weight to use.'],
      ['Botones más fáciles de tocar y mejor con lector de pantalla.', 'Buttons that are easier to tap and better screen reader support.'],
    ],
  },
  {
    version: '0.0.66',
    items: [
      ['Tu entrenador: cada semana te propone cambios concretos (cambiar un ejercicio atascado, una semana más suave, más o menos series) y los aplica con un toque.', 'Your coach: every week it suggests concrete changes (swap a stuck exercise, an easier week, more or fewer sets) and applies them with one tap.'],
      ['WOD del día: un entreno funcional distinto cada día (AMRAP, EMOM o por tiempo) con cronómetro, y una prueba los sábados para medirte.', 'Workout of the day: a different functional workout every day (AMRAP, EMOM or for time) with a timer, and a test on Saturdays to measure yourself.'],
      ['Meta de peso corporal con fecha: a qué ritmo vas y si llegas a tiempo.', 'Body weight goal with a date: your pace and whether you will make it in time.'],
      ['Liga semanal con amigos: puntos por constancia, no por kilos, y coronas para el ganador.', 'Weekly league with friends: points for consistency, not kilos, and crowns for the winner.'],
      ['Serix en francés y portugués (Perfil → Ajustes → Idioma).', 'Serix in French and Portuguese (Profile → Settings → Language).'],
      ['Usar sin conexión: descarga de una vez el escáner y los productos del súper (Perfil → Tus datos).', 'Use offline: download the scanner and supermarket products in one go (Profile → Your data).'],
      ['Inicio te avisa de los días sin entrenar y del grupo muscular que llevas tiempo sin tocar, y muñecos nuevos para hollow, L-sit, sentadilla en la pared, flexión en pica y boxeo.', 'Home tells you about days without training and the muscle group you have not trained for a while, plus new figures for hollow, L-sit, wall sit, pike push-up and boxing.'],
    ],
  },
  {
    version: '0.0.65',
    items: [
      ['46 ejercicios nuevos de funcional y para casa: burpees, wall balls, thrusters, pies a la barra, comba doble, remo con toalla, sentadilla pistol…', '46 new functional and at-home exercises: burpees, wall balls, thrusters, toes to bar, double unders, towel door rows, pistol squats…'],
      ['En Ejercicios, filtros «Funcional» y «En casa».', 'In Exercises, "Functional" and "At home" filters.'],
      ['Programas nuevos en la biblioteca: Funcional · 3 días y HIIT en casa · 3 días.', 'New programs in the library: Functional · 3 days and Home HIIT · 3 days.'],
    ],
  },
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
