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

## Pendientes tras 0.0.99 (resueltos desde 0.0.96: detalle = entreno con calentamiento, equilibrio por semana,
## «movidos», tiempo por minutos con relleno, swing como bisagra, proteína con tope y suelo, sentadilla 2× en
## fuerza, entreno modal con h1, foco al marcar, avisos por announce, biblioteca h2, campos a 44 px)
## Sin Lighthouse ni axe instalados: perf-a11y mide con Chrome por CDP (scripts en el scratchpad, panel4-perf/).

### serix-ux (9,3)
- Progreso › Músculos: «Series por grupo (7 días)» deja fuera el lunes anterior y avisa «por debajo» con la semana
  a medias; el equilibrio (4 semanas) dice «bien equilibrado».
- Comidas: un lunes de entreno planificado resta 360 kcal hasta pulsar Empezar (salto de 630 kcal).
- Series: Inicio/Rutinas/detalle «19» y el entreno «0 de 22» (cuenta el calentamiento).
- Detalle de rutina a 375 px: nombres cortados por la columna de la derecha.
- Textos: «1RM estimado» en la tarjeta de estancado (resto «máx. estimado»); «+ 1 suave» en Bloque; 37,5 t
  repetido en Inicio; «Última vez: 12 oct» frente a «hace 6 días»; botón del entrenador colocado distinto.

### serix-code (9,4)
- `nutrition.ts:481` suelo de 1200/1500 por encima del mantenimiento (60 años, 45 kg → superávit «para perder»).
- `FoodGoals.tsx` dice 2,2 g/kg y `computeGoals` recorta al 35 %; si eliges 2,2 a mano, sin tope.
- `generator.ts` dayMinutes duplica routineMinutes; tests con 10 % y código con 3 min; `Math.round(60/3.4)` viejo.
- `withWarmup`/`plannedWarmup` sin test; `repeatSession` sin calentamiento; finishedSessions en cada vuelta.
- `fillTime`: principiante a 75-90 min no llega (73-77 min); test solo de fatLoss en gimnasio.
- Foco/inert de App.tsx sin test; Food.tsx (805), Progress.tsx (789), Profile.tsx (750) grandes.

### serix-coach (9,3)
- Sin mínimo semanal por músculo: tríceps 3 series/sem (hipertrofia intermedio 5 días), kettlebell fatLoss tríceps 2,
  gemelo 2, femoral 15; avanzado fatLoss pecho y hombro 8.
- `fillTime` en principiante fatLoss 90 min: 30 series/sesión; techo ~18 y el resto, cardio.
- Peso corporal fatLoss 45 min: 0 femoral y 0 core a la semana.
- `lowerB` (no fuerza): peso muerto + prensa + hack; prensa en las dos piernas del híbrido de 5 días.
- Intermedio 3 días = PPL (1×/sem por músculo); `trainingShift` baja de 1200 a 1020 kcal los días de descanso.
- Kettlebell: zancada sin peso y remo con mochila teniendo la pesa (BACKPACK_LOAD sin el remo).

### serix-perf-a11y (9,7)
- Al eliminar una serie el foco cae en BODY (`useDialog` devuelve el foco a un botón que ya no existe).
- `announce()` crea la zona role=status en el primer aviso: crearla vacía al arrancar.
- Botones a 36-38 px en el entreno (`.icon-btn`, «Terminar», «Añadir serie», ±2,5 kg), `.undo-toast button` y
  la hoja del programa (Atrás, minutos).
