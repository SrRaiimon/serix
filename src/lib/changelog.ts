import { compareVersions } from './versions'
// Novedades de cada versión, para enseñarlas una vez al actualizar (Inicio) y en Perfil → Novedades.
// Solo lo que se nota al usar la app, en pocas palabras; la más nueva primero.

export interface Release {
  version: string
  items: [es: string, en: string][]
}

export const CHANGELOG: Release[] = [
  {
    version: '0.1.12',
    items: [
      ['Instrucciones más seguras en los ejercicios con banda: cómo anclarla (puerta cerrada que abra hacia el otro lado, o un poste) y revisar que no tenga cortes; y el curl martillo con kettlebell, cogido por el centro del asa.', 'Safer instructions for band exercises: how to anchor it (a closed door that opens away from you, or a post) and checking it for cuts; and the kettlebell hammer curl, held by the middle of the handle.'],
      ['Con bandas, todos los ejercicios a 12-20 repeticiones, y el remo invertido solo si tienes barra.', 'With bands, every exercise at 12-20 reps, and the inverted row only if you have a bar.'],
      ['Ganar músculo con 3 días o más lleva bíceps y tríceps directos, también con 45 minutos y sin gimnasio.', 'Building muscle with 3 days or more includes direct biceps and triceps work, also with 45 minutes and without a gym.'],
      ['«Quitar la descarga de hoy» ya no borra las series que añadiste después, y al terminar el entreno no se guarda la copia de antes de la descarga.', '"Undo today’s deload" no longer removes sets you added afterwards, and the pre-deload copy is not saved when you finish the workout.'],
      ['Con el teclado, lo que tiene el foco ya no queda detrás de la barra de pestañas.', 'With a keyboard, the focused element no longer hides behind the tab bar.'],
    ],
  },
  {
    version: '0.1.11',
    items: [
      ['Arreglado: el resumen del entreno ya no se rompe al guardarlo como rutina, ni Progreso › Calorías y peso al apuntar la primera comida.', 'Fixed: the workout summary no longer breaks when you save it as a routine, nor does Progress › Calories and weight when you log your first meal.'],
      ['En la semana de descarga, el resumen solo habla de descarga si algún ejercicio se descargó de verdad.', 'In a deload week, the summary only mentions the deload if some exercise was actually deloaded.'],
    ],
  },
  {
    version: '0.1.10',
    items: [
      ['Nuevos ejercicios para casa: curl y curl martillo con banda, remo, jalón y face pull con banda, curl martillo con kettlebell y zancadas y búlgaras sin gimnasio. Con bandas o kettlebell ya hay brazos y espalda de verdad.', 'New home exercises: band curl and hammer curl, band row, pulldown and face pull, kettlebell hammer curl, and lunges and split squats without a gym. With bands or kettlebells there are now real arm and back exercises.'],
      ['Programas más equilibrados día a día: menos días de torso con mucho más press que remo, nunca hip thrust y puente el mismo día, y el avanzado de 3 días en cuerpo completo (cada músculo dos o tres veces por semana).', 'Programs balanced day by day: fewer upper days with far more pressing than rowing, never hip thrust and bridge on the same day, and the 3-day advanced plan as full body (each muscle two or three times a week).'],
      ['«Quitar la descarga de hoy» devuelve las series y los pesos de antes; lo que ya has hecho se queda.', '"Undo today’s deload" brings back the sets and weights from before; what you already did stays.'],
      ['Inicio más corto: la comida del día en dos líneas y la racha, el mes y el peso movido al pie de la semana.', 'Shorter Home: today’s food in two lines, and the streak, month and weight moved at the bottom of the week card.'],
      ['La primera vez que marcas una serie, el RPE viene explicado.', 'The first time you tick a set, RPE comes explained.'],
      ['La biblioteca nombra sus días como el generador: «Empuje A … Empuje B».', 'The library names its days like the generator: "Push A … Push B".'],
    ],
  },
  {
    version: '0.1.9',
    items: [
      ['Programas comprobados en las 1500 combinaciones del cuestionario: cada día de cuerpo completo lleva un tirón, ningún día se queda en un solo ejercicio y los accesorios no se repiten en días seguidos.', 'Programs checked across all 1500 questionnaire combinations: every full-body day has a pull, no day is left with a single exercise, and accessories do not repeat on consecutive days.'],
      ['Abdomen de verdad uno por día, también en «Perder grasa» con 2 días; y sin gimnasio, con 5 o 6 días, «Estar en forma» y fuerza reparten en torso, pierna y cuerpo completo en vez de días de empuje y tirón medio vacíos.', 'Abs really one per day, also in 2-day "Lose fat"; and without a gym, with 5 or 6 days, "Get fit" and strength split into upper, lower and full body instead of half-empty push and pull days.'],
      ['Por lados, una serie cuenta si has hecho cualquiera de los dos lados, y al terminar te avisa del lado que falta por marcar.', 'Per side, a set counts if you did either side, and when you finish you are told about the side still to tick.'],
      ['El resumen de la semana de descarga lo dice siempre, aunque la rutina lleve plancha o una 5/3/1, y la ficha de la rutina muestra la duración y las series igual que el resumen.', 'The deload-week summary always says so, even if the routine has a plank or a 5/3/1, and the routine page shows duration and sets the same way as the summary.'],
      ['«Tu plan» enseña los minutos reales siempre que las sesiones salen más cortas, y el mapa de músculos vuelve a ir de suave a intenso, con contorno en el nivel 1-3.', '"Your plan" shows the real minutes whenever sessions come out shorter, and the muscle map goes from soft to intense again, with an outline on the 1-3 level.'],
    ],
  },
  {
    version: '0.1.8',
    items: [
      ['Las series cuentan igual en el entreno y en el resumen, también por lados; y descargar un solo ejercicio estancado ya no cambia el resumen de toda la sesión.', 'Sets count the same in the workout and in the summary, per side too; and deloading a single stalled exercise no longer changes the summary of the whole session.'],
      ['En descarga, si corriges un RPE alto, el descanso añadido se quita.', 'In a deload, if you correct a high RPE, the added rest is removed.'],
      ['Programas más completos: siempre hay remo o dominada (también con 30 minutos), un solo ejercicio de abdomen por día, sin press tres días seguidos para quien empieza con 6 días y los días de cuerpo completo nombrados desde la A.', 'More complete programs: there is always a row or pull-up (even with 30 minutes), a single ab exercise per day, no pressing three days in a row for 6-day beginners, and full-body days named from A.'],
      ['«Tu plan» enseña los minutos reales por sesión cuando eres principiante, y la tarjeta del mes dice «Más series» en vez de «Estrella».', '"Your plan" shows the real minutes per session when you are a beginner, and the month card says "Most sets" instead of "Top exercise".'],
      ['Detalles: «Más tarde» de la copia como texto, el nivel 1-3 del mapa de músculos se distingue mejor y la duración de las tarjetas para compartir dice «<1 min» en vez de «0 min».', 'Details: the backup "Later" is now plain text, the 1-3 level on the muscle map stands out better, and share cards say "<1 min" instead of "0 min".'],
    ],
  },
  {
    version: '0.1.7',
    items: [
      ['Semana de descarga sin malas noticias: el resumen ya no la marca en rojo como un retroceso, el descanso no se recorta con RPE bajo y los consejos de cambiar ejercicio esperan a la semana siguiente.', 'Deload week without bad news: the summary no longer shows it in red as a step back, rest is not cut with a low RPE, and exercise-swap tips wait until the following week.'],
      ['Las series se cuentan igual en todas partes: los drop sets no suman series ni en el entreno ni en el resumen, y la descarga nunca deja un ejercicio en una sola serie.', 'Sets are counted the same everywhere: drop sets do not add sets in the workout or in the summary, and a deload never leaves an exercise at a single set.'],
      ['Programas más sanos: tanto tirón como empuje, sin peso muerto en días seguidos para quien empieza, abdomen también con poco tiempo, bíceps y tríceps a la par y el abdomen al final del día.', 'Healthier programs: as much pulling as pushing, no deadlifts on consecutive days for beginners, abs even with little time, biceps and triceps on par, and abs at the end of the day.'],
      ['Progreso › Músculos más legible: lo que queda por debajo se marca en naranja, la zona tiene sus límites y las barras se distinguen bien en claro.', 'Clearer Progress › Muscles: what falls below is marked in orange, the zone shows its limits and the bars stand out in light mode.'],
      ['Inicio con una sola acción principal: la copia de seguridad ya no compite con «Empezar», y el aviso de ejercicio estancado va en gris.', 'Home with a single main action: the backup no longer competes with "Start", and the stalled-exercise notice is grey.'],
    ],
  },
  {
    version: '0.1.6',
    items: [
      ['Programas más equilibrados: los principiantes ya no pasan de 16 series por grupo, hay algo de abdomen con 45 minutos o más y, si sobra volumen, se quita del día más largo (ya no queda un día de 35 minutos junto a otro de 75).', 'More balanced programs: beginners no longer go over 16 sets per muscle group, there is some ab work with 45 minutes or more and, if there is too much volume, it comes off the longest day (no more 35-minute day next to a 75-minute one).'],
      ['Descarga más lógica: en las máquinas asistidas sube la ayuda en vez de bajarla, y el calentamiento se queda en dos series.', 'More sensible deloads: on assisted machines the assistance goes up instead of down, and the warm-up stays at two sets.'],
      ['El entreno cuenta las series igual que Inicio: por lados, una por pareja, y sin contar los drop sets.', 'The workout counts sets the same way as Home: per side, one per pair, and without counting drop sets.'],
      ['Menos avisos repetidos: un solo mensaje en un ejercicio estancado, sin «algo menos de peso» en semana de descarga, y «Movilidad 5 min» para no confundirlo con las series de calentamiento.', 'Fewer repeated notices: a single message on a stalled exercise, no "go a little lighter" in a deload week, and "Mobility 5 min" so it is not confused with warm-up sets.'],
      ['Progreso › Músculos con los colores de la app: recuperación, series y equilibrio en gris, y naranja solo en lo que pide atención.', 'Progress › Muscles in the app colours: recovery, sets and balance in grey, with orange only for what needs attention.'],
    ],
  },
  {
    version: '0.1.5',
    items: [
      ['Al marcar una serie, la pantalla baja sola hasta el RPE: ya no queda tapado por la barra de descanso.', 'When you tick a set, the screen scrolls down to the RPE by itself: it is no longer hidden behind the rest bar.'],
      ['Descarga más fina: los ejercicios por lados quedan con las mismas series en cada lado, la 5/3/1 cuenta igual en Inicio y en el entreno, y descargar un solo ejercicio se avisa en ese ejercicio.', 'Finer deloads: per-side exercises keep the same sets on each side, 5/3/1 counts the same on Home and in the workout, and deloading a single exercise is noted on that exercise.'],
      ['Vista previa del programa con cifras reales: «19–20 series / día» y «60–63′» en vez de una media que no cuadraba.', 'Program preview with real figures: "19–20 sets / day" and "60–63′" instead of an average that did not add up.'],
      ['Comidas explica que hoy cuenta como descanso hasta que entrenes o lo marques, y ya no repite la proteína.', 'Food explains that today counts as a rest day until you train or mark it, and no longer repeats the protein.'],
      ['Máquinas asistidas: la ayuda del primer día ya no dice «deja el peso en 0».', 'Assisted machines: the first-day tip no longer says "leave the weight at 0".'],
    ],
  },
  {
    version: '0.1.4',
    items: [
      ['Semana de descarga coherente: Inicio, Rutinas y el detalle cuentan las series que harás de verdad, y en el entreno sale un solo aviso, sin «para subir de peso».', 'Consistent deload week: Home, Routines and the detail count the sets you will actually do, and the workout shows a single notice, without "to move up in weight".'],
      ['«Perder grasa» cuenta el swing igual que Progreso: los programas de 5 y 6 días ya no salen pasados en femoral u hombro.', 'Fat loss counts the swing the same way as Progress: 5- and 6-day programs no longer come out over on hamstrings or shoulders.'],
      ['Botones más fáciles de tocar: el RPE en dos filas en el móvil, los accesos de antes de empezar con su zona completa, y sin «+» en las máquinas asistidas.', 'Easier buttons to tap: RPE in two rows on phones, the pre-workout shortcuts with their full touch area, and no "+" on assisted machines.'],
      ['Comidas: sin «Te quedan…» repetido cuando aún no has comido; tus días marcados cuentan como entreno también con las calorías gastadas; y las fechas, bien con el cambio de hora.', 'Food: no repeated "left" line before you eat; your marked days count as training days with burned calories too; and dates stay right across the clock change.'],
      ['Progreso › Músculos: «últimos 7 días» en el título, la leyenda se distingue en oscuro, la recuperación va en gris y no en rojo, y el abdomen se explica.', 'Progress › Muscles: "last 7 days" in the title, the legend is distinguishable in dark mode, recovery shows in grey instead of red, and abs are explained.'],
    ],
  },
  {
    version: '0.1.3',
    items: [
      ['Programas equilibrados: cada músculo recibe las series de la zona que luego marca Progreso › Músculos (ni hombro de más ni bíceps o glúteo de menos), y la espalda ya no se cuenta de más.', 'Balanced programs: each muscle gets the sets in the range Progress › Muscles shows (no extra shoulders, no missing biceps or glutes), and back is no longer over-counted.'],
      ['El entreno empieza por la serie: nombre y cuenta en una línea y los accesos de antes de empezar en una fila de chips.', 'The workout starts with the set: name and count on one line and the pre-workout shortcuts in a single row of chips.'],
      ['Inicio más corto: herramientas en una rejilla, dos últimos entrenos y sin cifras repetidas.', 'Shorter Home: tools in a grid, the last two workouts and no repeated figures.'],
      ['Los principiantes no pasan de 18 series por sesión con ningún objetivo; y al terminar, el calentamiento sin marcar ya no cuenta como series perdidas.', 'Beginners stay at 18 sets per session with any goal; and when finishing, an unticked warm-up no longer counts as lost sets.'],
      ['Comidas: con el suelo de calorías la semana sigue sumando tu objetivo, y te avisa si el déficit es muy pequeño.', 'Food: with the calorie floor the week still adds up to your goal, and it warns you if the deficit is very small.'],
      ['El entrenador da un consejo principal: si toca descarga, los cambios de ejercicio esperan; y el «+» del lastre ya no sale en las máquinas asistidas.', 'The coach gives one main tip: if a deload is due, exercise swaps wait; and the added-weight "+" no longer shows on assisted machines.'],
    ],
  },
  {
    version: '0.1.2',
    items: [
      ['Dominadas y fondos con lastre llevan su «+» en todas partes (rutinas, historial, récords, informe), también si aún no has apuntado tu peso.', 'Weighted pull-ups and dips show their "+" everywhere (routines, history, records, report), even before you log your bodyweight.'],
    ],
  },
  {
    version: '0.1.1',
    items: [
      ['En móviles pequeños, las pestañas de Progreso ya no parten las palabras por la mitad.', 'On small phones, the Progress tabs no longer split words in half.'],
      ['Informe del mes: «1 semana seguida» en singular y cada serie («20 kg × 8») en una sola línea.', 'Monthly report: "1 week in a row" in the singular and each set ("20 kg × 8") on one line.'],
      ['WOD y Ejercicios te mandan a «Perfil → Generar un programa nuevo», que es donde está ahora.', 'WOD and Exercises point to "Profile → Generate a new program", which is where it is now.'],
    ],
  },
  {
    version: '0.1.0',
    items: [
      ['Comidas, más acertada: si sueles entrenar hoy, ya cuenta como día de entreno; los días de descanso no bajan de 1200 kcal (1500 en hombres); y nunca te propone comer más de lo que gastas «para perder».', 'Food, more accurate: if you usually train today it already counts as a training day; rest days never drop below 1200 kcal (1500 for men); and it never suggests eating more than you burn "to lose".'],
      ['La proteína que ves es la que se calcula: con pocas calorías, como mucho el 35 % de ellas, también si la eliges tú.', 'The protein you see is the one calculated: on few calories, at most 35% of them, also when you choose it.'],
      ['Programas más equilibrados: con 3 días, cuerpo completo (cada músculo varias veces por semana); tríceps también en el segundo día de torso; el segundo día de pierna ya no junta prensa y hack; y femoral y core no se pierden con poco tiempo.', 'Better balanced programs: on 3 days, full body (each muscle several times a week); triceps on the second upper day too; the second leg day no longer stacks leg press and hack squat; and hamstrings and core are kept on short sessions.'],
      ['Los principiantes no pasan de 18 series por sesión aunque elijan mucho tiempo.', 'Beginners stay at 18 sets per session at most, even with plenty of time.'],
      ['Progreso › Músculos: series por semana de media (hasta 4 semanas), sin avisos de «por debajo» con la semana a medias; y el entreno cuenta las series sin el calentamiento, como Inicio y Rutinas.', 'Progress › Muscles: weekly sets as an average (up to 4 weeks), no "below" warnings mid-week; and the workout counts sets without the warm-up, like Home and Routines.'],
      ['Con teclado o lector de pantalla, al eliminar una serie el foco va a la de al lado y el primer aviso también se anuncia.', 'With a keyboard or screen reader, deleting a set moves focus to the next one and the first notice is announced too.'],
    ],
  },
  {
    version: '0.0.99',
    items: [
      ['«Perder grasa» avanzado: accesorios con 15 s menos de descanso, más trabajo en el mismo tiempo y ya distinto del intermedio.', '"Lose fat" for advanced lifters: accessories with 15 s less rest, more work in the same time and now different from intermediate.'],
      ['Por dentro: Rutinas en piezas más pequeñas (el generador, la biblioteca y el 5/3/1 aparte) y pruebas de las hojas apiladas.', 'Under the hood: Routines split into smaller pieces (generator, library and 5/3/1 apart) and tests for stacked sheets.'],
    ],
  },
  {
    version: '0.0.98',
    items: [
      ['Fuerza con 4 días: la sentadilla dos veces por semana, pesada el primer día de pierna y frontal tras el peso muerto el segundo (antes, prensa y hack seguidas).', 'Strength on 4 days: squats twice a week, heavy on the first leg day and front squats after deadlifts on the second (before, leg press and hack squat back to back).'],
      ['Las sesiones no se pasan más de 3 minutos del tiempo que eliges.', 'Sessions run at most 3 minutes over the time you choose.'],
      ['Por dentro: cada ejercicio del entreno va en su propio archivo.', 'Under the hood: each workout exercise lives in its own file.'],
    ],
  },
  {
    version: '0.0.97',
    items: [
      ['Lo que ves en la rutina es lo que hace el entreno: las mismas repeticiones serie a serie y el calentamiento ya puesto en el primer ejercicio pesado.', 'What you see in the routine is what the workout does: the same reps set by set, and the warm-up already added to the first heavy exercise.'],
      ['Los programas llenan el tiempo que eliges, con la misma cuenta de minutos que enseña la app: con 90 minutos, más series; con 60, sin pasarse.', 'Programs fill the time you choose, using the same minute count the app shows: more sets with 90 minutes, no overrun with 60.'],
      ['Comidas: al perder grasa con pocas calorías, la proteína ya no se come los hidratos, y el objetivo no baja de 1200 kcal (1500 en hombres).', 'Food: when losing fat on few calories, protein no longer crowds out carbs, and the target never drops below 1200 kcal (1500 for men).'],
      ['Progreso › Músculos: el equilibrio cuenta igual que «Series por grupo», en series por semana.', 'Progress › Muscles: balance counts the same way as "Sets per group", in sets per week.'],
      ['Programas más finos: con kettlebell, el swing cuenta como bisagra; con bandas, el torso vuelve a tener brazos; y el peso muerto convencional va a 5-8 repeticiones.', 'Finer programs: with kettlebells the swing counts as a hinge; with bands, upper days have arm work again; and conventional deadlifts go to 5-8 reps.'],
      ['Con teclado o lector de pantalla, el entreno ya no deja salir a Inicio por detrás, el foco no se pierde al marcar una serie y los avisos de deshacer se anuncian.', 'With a keyboard or screen reader, the workout no longer lets you tab into Home behind it, focus is not lost when checking off a set, and undo notices are announced.'],
    ],
  },
  {
    version: '0.0.96',
    items: [
      ['Sin material, cada día trae los ejercicios y los minutos que elegiste: con barra en casa, dominadas negativas para empezar, y gemelos a una pierna.', 'With no equipment, every day has the exercises and minutes you chose: with a bar at home, negative pull-ups to start with, and single-leg calf raises.'],
      ['Programas más finos: nórdico para el femoral sin máquinas, zancadas y búlgaras con carga si tienes pesas, sin fondos en paralelas fuera del gimnasio y, en fuerza, un básico pesado por día y banca y press militar dos veces por semana.', 'Finer programs: Nordic curls for hamstrings without machines, loaded lunges and split squats if you have weights, no parallel-bar dips outside the gym and, for strength, one heavy lift per day with bench and overhead press twice a week.'],
      ['El menú de cada ejercicio, más corto: ordenar y los ajustes van en sus propios apartados, y «Quitar ejercicio» siempre está a la vista.', 'A shorter menu for each exercise: ordering and settings have their own sections, and "Remove exercise" is always in view.'],
      ['Textos más claros: el peso movido se escribe siempre igual, la biblioteca va por niveles y en Perfil hay un solo botón para un programa nuevo.', 'Clearer wording: weight moved is always written the same way, the library is grouped by level and Profile has a single button for a new program.'],
      ['Por dentro: avisos que el lector de pantalla sí anuncia, kettlebells de 4 en 4 desde 16 kg y el entreno ordenado en piezas más pequeñas.', 'Under the hood: notices that screen readers actually announce, kettlebells in 4 kg steps from 16 kg and the workout screen split into smaller pieces.'],
    ],
  },
  {
    version: '0.0.95',
    items: [
      ['Con la semana cumplida, toda la app lo sabe: Inicio y Rutinas dejan el siguiente como opcional, Comidas lo cuenta como día de descanso y el entrenador no propone suavizarla.', 'Once your week is done, the whole app knows: Home and Routines make the next one optional, Food counts it as a rest day, and the coach no longer suggests easing it.'],
      ['El entrenador ya no corrige un programa recién creado ni cuenta el cardio como series de fuerza: espera a que lo lleves dos semanas.', 'The coach no longer corrects a brand-new program or counts cardio as strength sets: it waits until you have followed it for two weeks.'],
      ['Las mancuernas siguen en pesos que existen también tras calentar.', 'Dumbbells stay on weights that exist after warming up too.'],
      ['Con teclado o lector de pantalla, el foco llega al título también en Rutinas, Comidas, Perfil y al volver a Inicio.', 'With a keyboard or screen reader, focus reaches the title in Routines, Food, Profile and when going back to Home too.'],
    ],
  },
  {
    version: '0.0.94',
    items: [
      ['Si ya has cumplido los entrenos de la semana, Inicio te lo dice y el siguiente queda como opcional.', 'If you have already hit your workouts for the week, Home says so and the next one is optional.'],
      ['Programas más acertados: los principiantes hacen remos en vez de dominadas, las flexiones van a 12-20 desde intermedio, y con kettlebell hay curl y no un press como elevación lateral.', 'Better programs: beginners do rows instead of pull-ups, push-ups go to 12-20 from intermediate up, and with a kettlebell there is a curl and no press posing as a lateral raise.'],
      ['Las cifras cuadran: «Tu plan» cuenta los ejercicios reales, la mejor serie de una rutina ya no suma tu peso en las dominadas y «máx. estimado» se llama así.', 'The numbers add up: "Your plan" counts the real exercises, a routine\'s best set no longer adds your bodyweight on pull-ups, and "est. max" is called that.'],
      ['Con muy pocas calorías, la grasa no baja de 0,8 g por kilo, y el entrenador avisa si a un músculo solo le llega trabajo de rebote.', 'On very low calories fat stays at 0.8 g per kilo or more, and the coach tells you when a muscle only gets indirect work.'],
    ],
  },
  {
    version: '0.0.93',
    items: [
      ['Con «Perder grasa», el cardio sale todos los días, y con poco tiempo se quitan series antes que ejercicios: los brazos ya no desaparecen del programa.', 'With "Lose fat", cardio shows up every day, and when time is short sets are cut before exercises: arms no longer vanish from the program.'],
      ['Las mancuernas y las kettlebells suben a pesos que existen (de 24 a 26 kg en el curl martillo o la goblet).', 'Dumbbells and kettlebells go up to weights that exist (from 24 to 26 kg on hammer curls or goblet squats).'],
      ['Tras actualizar, Inicio enseña la novedad más útil de todas las versiones que no habías visto.', 'After an update, Home shows the most useful news from all the versions you had not seen.'],
      ['Con teclado o lector de pantalla, al cambiar de pantalla el foco va a su título.', 'With a keyboard or screen reader, focus moves to the title when you change screens.'],
    ],
  },
  {
    version: '0.0.92',
    items: [
      ['Por dentro: al retocar un texto, su traducción al francés y al portugués se conserva (antes se quedaba sin traducir).', 'Under the hood: when a text is reworded, its French and Portuguese translation is kept (before, it was left untranslated).'],
    ],
  },
  {
    version: '0.0.91',
    items: [
      ['La primera vez, la bienvenida sale antes: ya no espera a descargar los 900 ejercicios.', 'The first time, the welcome screen shows up sooner: it no longer waits for the 900 exercises to download.'],
    ],
  },
  {
    version: '0.0.90',
    items: [
      ['Con Serix abierta en dos pestañas, al juntar los cambios ya no se cuela un amigo repetido.', 'With Serix open in two tabs, merging the changes no longer lets a duplicate friend slip in.'],
      ['Por dentro: las pantallas de Comidas y del entreno, ordenadas en piezas más pequeñas, y pruebas que ejecutan de verdad la parte que funciona sin conexión.', 'Under the hood: the Food and workout screens split into smaller pieces, and tests that actually run the offline part.'],
    ],
  },
  {
    version: '0.0.89',
    items: [
      ['En el cuestionario, si intentas dejar menos de 2 días o más de 6 se avisa, y en la vista previa «Otra propuesta» ya no se parte en dos líneas.', 'In the setup you now get a message if you try to leave fewer than 2 days or more than 6, and in the preview "Another one" no longer wraps onto two lines.'],
      ['Al instalarla en Android, la ventana de instalación enseña capturas de la app.', 'When you install it on Android, the install window shows screenshots of the app.'],
      ['Con teclado, el cuestionario no salta solo de pregunta, y al terminarlo el foco va al título de Inicio.', 'With a keyboard, the setup no longer jumps to the next question on its own, and when you finish, focus goes to the Home title.'],
    ],
  },
  {
    version: '0.0.88',
    items: [
      ['Los programas de la biblioteca se ajustan a los minutos que tienes por sesión y ya no juntan peso muerto y sentadilla frontal el mismo día.', 'Library programs fit the minutes you have per session and no longer put deadlifts and front squats on the same day.'],
      ['En casa sin material: curl con mochila para el bíceps, y la segunda pierna de la semana cambia (subidas a una silla, sentadilla con mochila o pistol).', 'At home with no equipment: backpack curls for biceps, and the week\'s second leg day changes (chair step-ups, backpack squats or pistols).'],
      ['En dominadas y fondos, la gráfica de peso máximo muestra el lastre. Y los récords se celebran con trofeo.', 'On pull-ups and dips, the max weight chart shows the added weight. And records get a trophy.'],
    ],
  },
  {
    version: '0.0.87',
    items: [
      ['La app abre antes la primera vez: la letra de los títulos pesa cuatro veces menos.', 'The app opens faster the first time: the heading font is four times lighter.'],
    ],
  },
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

/** Los cambios internos (no se notan al usar la app) empiezan así; no valen como titular. */
const INTERNAL = /^Por dentro:/

/**
 * La línea que se enseña en Inicio tras actualizar: la primera que se nota al usar la app de todas las versiones
 * sin ver (de la más nueva a la más vieja). Quien salta varias versiones no debe ver «Por dentro: …» y perderse
 * lo de las anteriores; si todo es interno, la primera.
 */
export function headline(releases: Release[]): [es: string, en: string] | undefined {
  const items = releases.flatMap((r) => r.items)
  return items.find(([es]) => !INTERNAL.test(es)) ?? items[0]
}

/** Lo nuevo desde la última versión vista (todas, para elegir el titular); sin haber visto ninguna, solo la actual. */
export function unseenReleases(seen: string | undefined, current: string): Release[] {
  const upTo = CHANGELOG.filter((r) => compareVersions(r.version, current) <= 0)
  if (!seen) return upTo.slice(0, 1)
  return upTo.filter((r) => compareVersions(r.version, seen) > 0)
}
