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

## Pendientes tras 0.1.2 (resueltos desde 0.0.99: Músculos por semana de media, día de entreno habitual en Comidas,
## series sin calentamiento, nombres a 375 px, suelos de kcal y tope de proteína, duración única, calentamiento con
## test y en repetir, 3 días = cuerpo completo, tríceps en torso B, foco al eliminar serie, zona de avisos, 44 px)
## Sin Lighthouse ni axe: perf-a11y mide por CDP (panel5-perf/, sonda probe7.mjs del área real de 44 px).

### serix-ux (9,4)
- El programa generado suspende en Progreso › Músculos (intermedio 4 días: pecho 9,5, bíceps 9, abdomen 3 < 10).
- Entrenador: «descarga» y «cambia ejercicio» a la vez; «17 estancados» junto a «2 marcas superadas».
- Inicio muy largo con historial; Comidas repite «0 / 2970» y «Te quedan 2970»; «9,0 t» repetido.
- Músculos: «esta semana» frente a «últimos 7 días»; naranjas de la leyenda y ámbar/rojo casi iguales en oscuro;
  «Por encima: espalda» junto a «Bien equilibrado».
- 1RM con tres nombres; «Mejor serie: 57,5 / kg × 9» partido; ~62′ / ~63 min / unos 60 min; «Última vez: 13 oct» y «hace 4 días».

### serix-code (9,3)
- `generator.ts:488-495` el tope de series por nivel solo frena el relleno: principiantes con 19-22 series (fuerza 90 min);
  test solo de fatLoss en gimnasio.
- «+» de lastre en asistidas (`Routines.tsx:230/256`: `addsLoad` no mira `assisted`); unos sitios pasan el material y
  otros no: una función única.
- `autoreg.ts:34-36` `volumeWeeks` redondea hacia arriba: usuario nuevo «por debajo» el primer mes; usar días reales / 7.
- `Workout.tsx:141/144`: el diálogo de terminar cuenta el calentamiento sin marcar («3 series sin marcar»).
- `nutrition.ts`: en modo gasto el suelo se come el déficit y «hoy cuenta como entreno» no mira `trainingDays`;
  `dayKey(now - w*7*86400000)` con el cambio de hora (usar shiftDay).
- Menores: foco al eliminar va a la primera serie; `PROGRAM_TARGET_SECONDS` con 60 a mano en Program.tsx y
  RoutinesPrograms.tsx; `volumeWeeks` fuera del useMemo; foco de App.tsx sin test; Food/Progress/Profile grandes.

### serix-coach (9,4)
- Doble cuenta de espalda (`plannedGroupSets` / `weeklyGroupSets`): remo = 1,5 de espalda; el secundario del mismo
  grupo no debería sumar.
- El generador no respeta `weeklyRange` del entrenador: 644/1500 configs muy por encima (hombro 41 a 6 días), 573
  por debajo (glúteo 7,5 a 3 días). Falta un equilibrador semanal tras fillTime.
- `baseForDay`: con el suelo, la bajada de descanso se recorta pero la subida de entreno no (semana +480 kcal);
  avisar con déficit < ~10 %.
- Core a 0 en casi todo 45-60 min; «Estar en forma» y «Perder grasa» deberían tener ≥ 4-6 series/sem.
- Plantillas: pecho 9,5 frente a espalda 14 (hipertrofia 4 días); kettlebell femoral 21-23 (dos nórdicos, swing en
  las dos piernas) y zancada sin peso en Pierna B; gemelo 2 con kettlebell.

### serix-perf-a11y (9,8)
- `.rpe-help` (36×36) y `.set-label` (40×44) sin el área de 44 px: añadirlos a la regla `:where(...)`.
- `.rpe-chip` 37×50 (8 en 324 px) y su letra de 10 px.
- Aviso de instalar en Inicio: el «Cerrar» (.hit) tapa parte de «Instalar»; separarlos.
