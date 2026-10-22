# Notas del panel de evaluadores

Lo actualiza `/serix-panel` tras cada evaluación: una fila por versión y los pendientes de la última, que se
pasan a cada evaluador la vez siguiente.

| Versión | Diseño y uso | Código | Entrenador | Rendimiento y accesibilidad | Global |
|---|---|---|---|---|---|
| 0.0.66 | 6,8 | 7,6 | 7,6 | 8,6 | 7,7 |
| 0.0.67 | 7,3 | 8,1 | 7,9 | 8,9 | 8,1 |
| 0.0.68 | 7,6 | 8,3 | 8,3 | 9,1 | 8,3 |
| 0.0.69 | 8,1 | 8,5 | 8,4 | 9,2 | 8,6 |
| 0.0.70 | 8,4 | 8,5 | 8,5 | 9,4 | 8,7 |
| 0.0.73 | 8,6 | 8,8 | 8,8 | 9,5 | 8,9 |
| 0.0.84 | 8,8 | 8,9 | 9,0 | 9,6 | 9,1 |
| 0.0.92 | 8,9 | 9,1 | 8,9 | 9,7 | 9,2 (9,15) |
| 0.0.94 | 9,0 | 9,2 | 9,1 | 9,8 | 9,3 (9,28) |
| 0.0.96 | 9,2 | 9,3 | 9,2 | 9,5 | 9,3 (9,30) |
| 0.0.99 | 9,3 | 9,4 | 9,3 | 9,7 | 9,4 (9,43) |
| 0.1.2 | 9,4 | 9,3 | 9,4 | 9,8 | 9,5 (9,48) |
| 0.1.3 | 9,5 | 9,4 | 9,5 | 9,8 | 9,6 (9,55) |
| 0.1.4 | 9,6 | 9,5 | 9,6 | — (se paró: salió la 0.1.5) | — |
| 0.1.5 | 9,7 | 9,6 | 9,6 | 9,9 | 9,7 |

## Pendientes tras 0.1.5 (resueltos desde 0.1.4: RPE a la vista al marcar, descarga por lados y 5/3/1 con una sola
## regla, aviso de descarga de semana o de ejercicio, vista previa con rangos, Comidas › Hoy sin repetir, asistida en el
## entreno, routineFacts una vez por fila, chips de antes de empezar y RPE a 44 px reales)
## Crítica de diseño: 30/40 (0.1.3 a 0.1.5); detector limpio. Para subir: Inicio con historial más corto, Músculos con la
## paleta del sistema (sin verde ni azul), explicar RPE y descarga la primera vez.

### serix-ux (9,7)
- Descarga: sentadilla con 4 series de calentamiento para 2 efectivas; «Calentar 5 min» compite con las filas «C».
- Inicio › Comidas de hoy con el texto antiguo «Sin entreno de momento»; al empezar salta de 2340 a 2970 sin aviso.
- Torso B: curl martillo 4× y press francés 2×.
- Inicio en descarga: «Aún recuperándose… algo menos de peso» sobra (la descarga ya baja el peso).
- Press de banca: «Para subir de peso…» y «3 sesiones sin superar tu marca» apilados (con el entrenador diciendo
  descarga): un mensaje por ejercicio.

### serix-code (9,6)
- workout.ts:176 applyDeload baja un 10 % la ayuda de las asistidas (descarga más dura); test.
- Workout.tsx:143 cuenta lados y drops: zancada por lados «4 series» en Inicio y «0 de 8»; banca con drop 3 frente a 4.
  Una función de recuento común con routineSets; prefillSets copia drops.
- WorkoutExercise.tsx:202 deloadWeek(data) frente a Workout.tsx:192 deloadWeek(data, session.start): pasar session.start.
- Program.tsx:63 `span` con lista vacía da Infinity.
- Suelo del modo gasto sin aviso; tests con su propio patrón de swing; generator.ts 833 líneas; test de descarga sin bloque ni drops.

### serix-coach (9,6)
- Pasada final del generador: excesos en principiante 6 días (peso corporal glúteo 23, hombro 20, espalda 20; mancuernas
  femoral 20,5), gimnasio intermedio 6 días 45 min hombro 20,5; tope por grupo 16-18 en principiante.
- Días descompensados: kettlebell fuerza avanzado 4 días 75 min (Pierna A 35 min sin cadera, Torso B 76 min).
- Abdomen 0 en hipertrofia en gimnasio con 45 min o más; bíceps < 8 sin gimnasio: segunda opción de curl.
- Planes cortos en rojo en Progreso (escalar groupRange o «suficiente para tu tiempo»).
- Rumano de principiante a 3-5 (debería 6-8); test del barrido: ningún grupo > máx + 2 con 45 min o más.

### serix-perf-a11y (9,9)
- Lighthouse y axe de verdad cuando estén instalados.
- El desplazamiento al RPE (~300 ms) mueve la lista bajo el dedo: desplazar solo si el RPE no se ve entero.
- Un test que vigile el área de 44 px del ::after (un overflow en un contenedor la recorta).
