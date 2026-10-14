# Notas del panel de evaluadores

Lo actualiza `/serix-panel` tras cada evaluación: una fila por versión y los pendientes de la última, que se
pasan a cada evaluador la vez siguiente.

| Versión | Diseño y uso | Código | Entrenador | Rendimiento y accesibilidad | Global |
|---|---|---|---|---|---|
| 0.0.66 | 6,8 | 7,6 | 7,6 | 8,6 | 7,7 |
| 0.0.67 | 7,3 | 8,1 | 7,9 | 8,9 | 8,1 |
| 0.0.68 | 7,6 | 8,3 | 8,3 | 9,1 | 8,3 |
| 0.0.69 | 8,1 | 8,5 | 8,4 | 9,2 | 8,6 |

## Pendientes tras 0.0.69

### serix-ux (8,1)
- Inicio con historial mide ~4 pantallas: Novedades, «Tu semana pasada», «Esta semana» y 3 consejos del
  entrenador seguidos; comidas y racha quedan por debajo. Una sola tarjeta contextual a la vez.
- Comidas dice «Día de descanso» cuando Rutinas/Inicio proponen entrenar (sin días de entreno configurados);
  la cifra de kcal cambia al empezar el entreno sin explicarlo.
- Aviso de «estancado» repetido en el entreno (cada ejercicio), en Inicio y en Progreso.
- Duración estimada incoherente (~49 min para 16 series en el programa nuevo frente a ~66 min para 12).
- «Hoy» en Perfil → Tus datos sin contexto; dominadas con 124 kg (suma el peso corporal sin decirlo);
  «430.845 kg levantados»; ayuda «12 veces» bajo «6-10 reps».

### serix-code (8,5)
- progression.ts: la ventana de 90 días del modo porcentaje cuenta desde la última sesión, no desde hoy (y el
  test lo da por bueno).
- store.ts: varias pestañas siguen siendo «gana el último»; una pestaña con cambios pendientes pisa lo de la
  otra. Falta número de revisión en la transacción o Web Locks.
- main.tsx: al ocultarse se guarda aunque no haya cambios (una pestaña desfasada escribe su copia vieja).
- Transfer.tsx no mira `storageProblem()` tras guardar.
- 5/3/1: AMRAP saltado nunca cuenta como fallo; «semana» = sesión con ese ejercicio.
- Archivos gigantes (Food.tsx 2051 líneas, Workout.tsx 1239), tests con nombres vagos (ideas10, mejoras10…),
  claves i18n = texto en español y entradas huérfanas en fr/pt.

### serix-coach (8,4)
- nutrition.ts, modo «según lo quemado»: base de descanso con factor 1,2 + entreno deja días por debajo del
  basal y un déficit real ~35 % en vez del 20 %.
- generator.ts: `pick()` ignora el nivel y el material real (pino a principiantes, dominadas sin barra,
  sentadilla sin peso como básico a intermedios); jalón antes que dominadas para principiantes.
- Peso muerto sube 2,5 kg (músculo `spine` fuera de LOWER).
- Intermedio 5 días: Empuje/Tirón ~24 series por sesión; Pierna B junta peso muerto, prensa y frontal.
- Sin progresión en ejercicios de peso corporal (plan exige weight > 0).

### serix-perf-a11y (9,2)
- El título de NavBar es un div: las subpantallas no tienen encabezado (afecta a ~18 pantallas).
- Días L–D de Perfil → Entrenamiento: `label-content-name-mismatch` («X» vs «miércoles»).
- 63 KiB de JS sin usar al arrancar y CSS bloqueante (~150 ms).
- Chips de idioma con 6 px entre filas y botón ⋯ de Rutinas tapado 1 px.
