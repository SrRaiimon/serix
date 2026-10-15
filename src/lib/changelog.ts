import { compareVersions } from './versions'
// Novedades de cada versión, para enseñarlas una vez al actualizar (Inicio) y en Perfil → Novedades.
// Solo lo que se nota al usar la app, en pocas palabras; la más nueva primero.

export interface Release {
  version: string
  items: [es: string, en: string][]
}

export const CHANGELOG: Release[] = [
  {
    version: '0.0.86',
    items: [
      ['Inicio explica por qué cambia el objetivo de calorías el día que entrenas, y en dominadas y fondos los récords muestran el lastre («+12,5 kg»).', 'Home explains why your calorie goal changes on training days, and pull-up and dip records show the added weight ("+12.5 kg").'],
      ['El menú de cada ejercicio solo enseña lo que le aplica (sin «máquina asistida» en el peso muerto, por ejemplo).', 'Each exercise\'s menu only shows what applies to it (no "assisted machine" on deadlifts, for example).'],
    ],
  },
  {
    version: '0.0.85',
    items: [
      ['Programas en casa más exigentes desde intermedio (búlgara en vez de sentadilla al aire) y días más completos: si falta material para un ejercicio, otro parecido en su lugar.', 'Tougher home programs from intermediate up (Bulgarian split squats instead of air squats) and fuller days: if equipment is missing for an exercise, a similar one takes its place.'],
      ['En el gimnasio, la segunda sentadilla del día es prensa o hack en vez de goblet, el hip thrust va a 6-10 repeticiones y las mancuernas suben a pesos que existen (24 → 26 kg).', 'In the gym, the day\'s second squat is a leg press or hack squat instead of a goblet, hip thrusts go at 6-10 reps and dumbbells go up to weights that exist (24 → 26 kg).'],
      ['El cuestionario ya no se salta preguntas si tocas dos opciones seguidas, y el logo y los iconos de los avisos se ven también sin conexión.', 'The setup no longer skips questions if you tap two options in a row, and the logo and notification icons also show offline.'],
      ['El menú de opciones de un ejercicio se puede desplazar en pantallas pequeñas y en el cuestionario se distinguen los días sugeridos de los elegidos.', 'An exercise\'s options menu scrolls on small screens, and in the setup suggested days look different from the ones you picked.'],
    ],
  },
  {
    version: '0.0.84',
    items: [
      ['Las pestañas con muchas opciones (como el resumen para compartir) ya no cortan el texto.', 'Tabs with many options (like the shareable summary) no longer cut off their text.'],
    ],
  },
  {
    version: '0.0.83',
    items: [
      ['Programas en casa con mejor criterio: isquios de verdad sin máquina (peso muerto a una pierna), el nórdico a pocas repeticiones y nada de pino salvo para avanzados.', 'Smarter home programs: real hamstring work without machines (single-leg deadlift), Nordic curls at low reps and no handstand work unless you are advanced.'],
      ['La bienvenida carga bastante menos y en Inicio, si ya has hecho la rutina, ves tu duración media.', 'The welcome screen loads much less, and on Home you see your average time once you have done the routine.'],
    ],
  },
  {
    version: '0.0.82',
    items: [
      ['Cuestionario más útil: cada objetivo muestra sus repeticiones y descansos, el resumen te enseña tu primer entreno, puedes deslizar entre preguntas y si cierras la app vuelves donde ibas.', 'A more useful setup: each goal shows its reps and rest, the summary shows your first workout, you can swipe between questions and if you close the app you pick up where you left off.'],
    ],
  },
  {
    version: '0.0.81',
    items: [
      ['Icono nuevo: una mancuerna más clara. Si tienes la app en la pantalla de inicio, bórrala y vuelve a añadirla para verlo.', 'New icon: a clearer dumbbell. If you have the app on your home screen, remove it and add it again to see it.'],
    ],
  },
  {
    version: '0.0.80',
    items: [
      ['Arreglos para el icono de la app en iPhone.', 'Fixes for the app icon on iPhone.'],
    ],
  },
  {
    version: '0.0.79',
    items: [
      ['En el cuestionario puedes tocar los días de la semana que entrenas, y el icono para iPhone se pide de nuevo para que salga la mancuerna en vez de una letra.', 'In the setup you can tap the weekdays you train, and the iPhone icon is requested again so the dumbbell shows instead of a letter.'],
    ],
  },
  {
    version: '0.0.78',
    items: [
      ['Vista previa del programa más clara (cifras, días numerados y su duración), un paso de comidas a juego y el icono de la app mejor declarado para Android e iPhone.', 'A clearer program preview (figures, numbered days and their length), a matching food step and the app icon declared better for Android and iPhone.'],
    ],
  },
  {
    version: '0.0.77',
    items: [
      ['La app se actualiza a la última versión al abrirla: por un fallo podía quedarse una versión atrás.', 'The app updates to the latest version when you open it: a bug could leave it one version behind.'],
    ],
  },
  {
    version: '0.0.76',
    items: [
      ['Un cuestionario inicial rediseñado, con el estilo de la app: cifras grandes para elegir días y minutos, tu semana dibujada y un resumen final con tu plan.', 'A redesigned setup in the app\'s style: big numbers to choose days and minutes, your week drawn out and a final summary of your plan.'],
    ],
  },
  {
    version: '0.0.75',
    items: [
      ['Cuestionario inicial más rápido y claro: sabes en qué paso vas, el objetivo y la experiencia pasan solos al elegirlos y al final puedes tocar cualquier respuesta para cambiarla.', 'A quicker, clearer setup: you see which step you are on, goal and experience move on by themselves when chosen, and at the end you can tap any answer to change it.'],
      ['Al elegir días y minutos ves qué semana te saldrá («Torso / Pierna») y cuántos ejercicios por sesión, y cada tipo de material explica qué incluye.', 'When choosing days and minutes you see which week you will get ("Upper / Lower") and how many exercises per session, and each equipment option explains what it includes.'],
    ],
  },
  {
    version: '0.0.74',
    items: [
      ['Programas en casa más completos: remo con toalla o mochila, sin estiramientos colados como series de fuerza y en el gimnasio un peso muerto rumano o hip thrust antes que el swing.', 'More complete home programs: towel or backpack rows, no stretches sneaking in as strength sets, and in the gym a Romanian deadlift or hip thrust before the swing.'],
      ['En dominadas y fondos verás «tu peso + 12,5 kg» en vez de totales con decimales, y la columna «Última vez» del entreno ya no se corta.', 'On pull-ups and dips you will see "bodyweight + 12.5 kg" instead of totals with decimals, and the workout\'s "Last time" column no longer gets cut off.'],
      ['En ejercicios sin peso el entreno solo pide repeticiones y la progresión nunca te propone menos de lo que ya haces.', 'Bodyweight exercises only ask for reps, and progression never suggests fewer than you already do.'],
      ['Los programas de la Biblioteca ajustan series y repeticiones al ejercicio que te toca con tu material.', 'Library programs adjust sets and reps to the exercise you get with your equipment.'],
      ['Mejor con teclado y lector de pantalla: las hojas y menús se anuncian, reciben el foco y se cierran con Escape.', 'Better with keyboard and screen reader: sheets and menus are announced, take focus and close with Escape.'],
    ],
  },
  {
    version: '0.0.73',
    items: [
      ['La app se pinta antes al abrirla: los estilos van dentro de la página en vez de pedirse aparte.', 'The app draws sooner when you open it: styles come inside the page instead of a separate request.'],
      ['Calcular tus calorías en la bienvenida carga mucho menos.', 'Working out your calories in the welcome flow loads much less.'],
    ],
  },
  {
    version: '0.0.72',
    items: [
      ['Progresión en ejercicios sin peso: al llegar al máximo en todas las series, la app te propone una repetición más y, pasado el tope, una variante más difícil o lastre.', 'Progression for bodyweight exercises: once you hit the top of the range on every set, the app suggests one more rep and, past the cap, a harder variation or added weight.'],
      ['¿Entrenas en casa con barra de dominadas? Márcalo al generar el programa y tendrás dominadas en vez de solo remos.', 'Training at home with a pull-up bar? Tick it when generating your program and you will get pull-ups instead of only rows.'],
      ['El 5/3/1 avanza por semanas del calendario: si haces un básico dos veces por semana, repites la semana del ciclo en vez de acabarlo en la mitad de tiempo.', '5/3/1 now advances by calendar weeks: if you do a main lift twice a week, you repeat that week of the cycle instead of finishing it in half the time.'],
      ['La app abre más rápido: el entrenador y las novedades se cargan después de pintar Inicio.', 'The app opens faster: the coach and the news load after Home is drawn.'],
    ],
  },
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

export { compareVersions } from './versions'

/** Lo nuevo desde la última versión vista (como mucho las 3 últimas); sin haber visto ninguna, solo la actual. */
export function unseenReleases(seen: string | undefined, current: string): Release[] {
  const upTo = CHANGELOG.filter((r) => compareVersions(r.version, current) <= 0)
  if (!seen) return upTo.slice(0, 1)
  return upTo.filter((r) => compareVersions(r.version, seen) > 0).slice(0, 3)
}
