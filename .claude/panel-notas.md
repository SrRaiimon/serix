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

## Pendientes tras 0.1.3 (resueltos desde 0.1.2: programa aprueba en Músculos, espalda sin doble cuenta, equilibrador
## semanal, tope por nivel también al elegir, un consejo principal, Inicio corto, entreno empieza por la serie, 1RM con
## un nombre, calorías con suelo cuadran, terminar sin calentamiento, foco al borrar serie, rpe-help/set-label/instalar 44 px)
## Crítica de diseño (skill impeccable, Nielsen): 29/40 en 0.1.2 → 30/40 en 0.1.3; detector limpio (0 avisos).

### serix-ux (9,5)
- Descarga incoherente: Inicio/Rutinas «20 series ~55 min», detalle «4 ×» con «× 9/8», entreno «0 de 12»; recalcular
  series, «N ×» y minutos con la descarga activa.
- En descarga, cada ejercicio dice «Para subir de peso…» y «Sesión de descarga…» (12 bloques); el detalle promete subir peso.
- Comidas › Hoy repite «Te quedan 2340 kcal» sin nada comido; «Hoy, sin entreno de momento: −360» poco claro.
- Músculos: «esta semana» frente a «últimos 7 días»; puntos 1-3 / 4-9 iguales en oscuro; pie sin el rango del abdomen;
  seis grupos en rojo «Recuperándose» alarma.
- Vista previa del programa: ~62′ / ~63 min / ~60 min; «20 series / día» con días de 19; Torso B con curl 4× y francés 2×;
  4 series de calentamiento para 2 efectivas en descarga; «Calentar 5 min» y las «C» compiten.

### serix-code (9,4)
- Swing contado distinto: balanceWeek pone a 0 el acondicionamiento y countsForVolume cuenta One-Arm_Kettlebell_Swings
  (CONDITIONING_ONLY sin «swing»); los tests usan su propio patrón. Una sola función en volume.ts.
- kitOf (WorkoutExercise.tsx:40) repite addsLoad sin assisted: «+20×8» en la columna anterior de una asistida.
- nutrition.ts:273/297 `dayKey(now - i*86400000)` y el cambio de hora: usar shiftDay.
- Modo gasto: el suelo se come el déficit sin aviso; con trainingDays + nutritionBurned hoy sale descanso.
- Menores: 60 a mano en Program.tsx/RoutinesPrograms.tsx; rama redundante en Home.tsx:116-122; JSDoc huérfano
  bodyweight.ts:48; registerBodyweightExercises no quita ids; Progress.tsx:84 redondea semanas; generator.ts 831 líneas
  (balanceWeek a su módulo); test de balanceWeek fuera del gimnasio con margen más estricto.

### serix-coach (9,5)
- Swing (mismo fallo): Perder grasa 5-6 días con hombro/femoral 21-26 en el análisis.
- Excesos de rebote sin corregir: kettlebell fuerza avanzado 4 días hombro 20 (máx 15); peso corporal principiante 6 días
  glúteo 18-23. Bajar el accesorio directo cuando lo pasan los secundarios.
- Días descompensados: mancuernas hipertrofia 5 días 60 min, Empuje 43 min sin hombro y Torso B 63; abdomen 0
  (proponer 2-4 series en hipertrofia ≥4 días ≥60 min).
- Bíceps corto sin gimnasio (7-9): falta segunda opción de curl en kettlebell/gomas/peso corporal.
- Planes cortos (3 días 45 min, 2 días) suspenden en Progreso: escalar groupRange al tiempo o no marcarlos.
- Menores: fuerza principiante con rumano a 3-5 y escaladores en Cuerpo completo C; zancada y búlgara el mismo día.

### serix-perf-a11y (9,8)
- Regresión: `.workout-pre` con overflow-x recorta el ::after de 44 px de sus chips (36 px): padding-block 4px y
  margin-block -4px.
- `.rpe-chip` 37×50 (8 en 324 px): dos filas de 4 o fila deslizable.
