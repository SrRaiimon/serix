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

## Pendientes tras 0.0.92 (ya resueltos desde 0.0.84: lastre en el detalle y en récords, salto de kcal explicado,
## menú del ejercicio filtrado, Pierna A/B distintas en casa, curl con mochila, sin peso muerto + frontal, Food/Workout
## partidos, test real del SW, mergeList sin duplicados, biblioteca con tope por minutos, fuente 19 KiB, LCP 1,85 s,
## foco tras el cuestionario, aviso de días, sin avance automático con teclado, HealthNotice diferido)
## Nota: sin Lighthouse ni axe instalados; perf-a11y midió con Chrome por CDP (scripts en el scratchpad).

### serix-ux (8,9)
- Novedades en Inicio: `News.tsx:16` coge `list[0].items[0]`; enseña «Por dentro: …». Saltar las «Por dentro» y
  recorrer todas las versiones sin ver.
- «Mejor serie» en el detalle de rutina (`Routines.tsx:252`, `loadSets`) suma el peso corporal (90,52 kg × 9 en
  dominadas); el lastre se escribe distinto entre pantallas («12,5 kg» / «+12,5»).
- «Tu plan» dice 6 ejercicios (`exerciseCount`) y la vista previa 5; «hasta 60 min» con días de ~61 min; días de
  peso corporal cortos (36-39 min con 60 elegidos).
- Progreso → «Sin mejorar últimamente»: «tu marca: 34 kg» es un 1RM estimado sin decirlo.
- Inicio con historial: ~3,5 pantallas; «Objetivo semanal cumplido» y a la vez «Empezar» Pierna con músculos sin recuperar.
- Principiante con barra en casa: «Dominada con barra V» y «tras nuca»; «Por lados» sigue en dominadas; el menú del
  ejercicio (12-14 opciones) corta «Quitar ejercicio». Entrenador y banner «Instálala» aún juntos con historial.
- Perfil: «Generar nuevo programa» y «Repetir cuestionario inicial» parecen lo mismo.

### serix-code (9,1)
- `progression.ts:36`: la subida de mancuernas va por id («dumbbell»): goblet 24 → 26,5, martillo 24 → 25; y 10 → 12,5
  con mancuernas de 2 en 2. Decidir por `equipment`.
- `generator.ts`: el bucle de tope está duplicado (`generate` ~321-340 y `buildLibraryProgram` ~456-483); en la
  biblioteca `used.add` va antes de los `continue`. Test débil (solo series ≤ tope).
- `store.ts` `keyOf` copia `friendKey`; al deduplicar se queda el primero (puede ser el más viejo).
- `Onboarding.tsx:213,223`: `e.detail > 0` no frena el avance con VoiceOver/TalkBack (changelog 0.0.89 dice lo
  contrario); foco a Inicio deja de intentarlo a los 2 s (primera visita lenta).
- Scripts i18n: `import.meta.url === file://argv[1]` falla con espacios/tildes; rekey con --write escribe parejas
  < 95 % («Activar» → «Desactivar avisos», 82 %).
- `ExerciseBlock` (372 líneas, 25 props) y `SetRow` (248, 24 props); `role="status"` del aviso creado con el texto;
  `ui.tsx:214` inert al cerrar hojas fuera de orden; iconos sin tiempo límite de red.

### serix-coach (8,9)
- «Perder grasa»: el acondicionamiento va al final y el tope por minutos lo quita (intermedio/avanzado en gimnasio:
  0 días con cardio). Reservarle hueco.
- El tope quita ejercicios enteros (brazos) antes que series de básicos: mancuernas intermedio 4 días 60 min, 0 series
  directas de bíceps y tríceps; upperlower4 a 60 min sin tríceps. Bajar antes de 4 a 3 series por básico.
- `coach.ts` ~117-127 no avisa si un grupo solo recibe volumen indirecto.
- Kettlebell: elevación lateral = `One-Arm_Kettlebell_Military_Press_To_The_Side`; bíceps relleno con remo.
- `fitScheme`: flexiones/remo invertido a 6-10 para intermedios/avanzados (deberían 12-20); `Backpack_Squat` a 6-10;
  `Single_Leg_Glute_Bridge` 5×6-10 en el 5×5. legCurl con mancuernas = dos bisagras, ninguna flexión de rodilla.
- Nutrición: grasa al 25 % baja a 0,58 g/kg con 1160 kcal; poner mínimo ~0,7-0,8 g/kg.

### serix-perf-a11y (9,7)
- Foco a BODY al entrar/salir de subpantallas (Perfil → General, «Atrás») y al cambiar de ruta (WCAG 2.4.3).
- El aviso de días no se repite al volver a intentarlo (mismo texto, no se vuelve a pintar).
