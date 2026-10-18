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

## Pendientes tras 0.0.94 (resueltos desde 0.0.92: novedades sin «Por dentro», mejor serie y lastre coherentes,
## «máx. estimado», cardio en «Perder grasa», brazos con poco tiempo a 60 min, buildDay/fitToTime comunes,
## mancuernas y kettlebells a pesos que existen, kettlebell sin press lateral y con curl, reps sin peso, grasa
## mínima, entrenador con volumen indirecto, scripts i18n, foco en subpantallas de Perfil, aviso de días)
## Sin Lighthouse ni axe instalados: perf-a11y mide con Chrome por CDP (scripts en el scratchpad, panel2-perf/).

### serix-ux (9,0)
- Semana cumplida incoherente: el texto del hero se corta («…uno má…»); el entrenador propone «semana más suave ·
  Hacerla esta semana»; Rutinas marca «TE TOCA HOY»; Comidas «Sin entreno de momento: −360 kcal».
- Peso corporal: «Tu plan» 5 ejercicios/día frente a 6 en su tarjeta; días de 34-39 min con 60 elegidos; con barra
  el principiante no recibe nada (ni negativas ni asistidas).
- Menú del ejercicio: 14 opciones, «Quitar ejercicio» fuera de pantalla; «descarga» frente a «semana más suave».
- Textos: columna «HOY TOCA» en el detalle de rutina; «El peso sube solo cuando…» ambiguo; «Mismo peso hasta
  completar todas las reps.» repetido en cada ejercicio; volumen escrito de 4 formas (8068 kg, 12.678 kg, 8,1 t…).
- Perfil: «Generar nuevo programa» y «Repetir cuestionario inicial» iguales; entrenador + «Instálala» juntos.
- Biblioteca: «PPL 6 días (Avanzado)» antes de la cabecera «AVANZADO».

### serix-code (9,2)
- `progression.ts:193`: `used` incluye calentamiento y drop sets; el calentamiento redondea a 2,5 → 20 pasa a 22,5
  con mancuernas de 2 en 2. Filtrar y redondear el calentamiento de mancuernas con dumbbellStep.
- `App.tsx:151`: `place === firstPlace` se salta volver a la pantalla inicial (usar ref de primer montaje).
- `ui.tsx:199/214`: inert fuera de orden; `ui.tsx:309` role=status creado con texto; `sw-template.js:49` iconos sin
  tiempo límite.
- `generator.ts`: el tope por músculo (`full`) va antes de recortar al tiempo: a 45 min en gimnasio, torso sin brazos.
- ExerciseBlock (~368 líneas, 25 props) y SetRow (24 props); `keyOf` copia friendKey y al quedarse el último no
  junta campos; comentario viejo de unseenReleases encima de INTERNAL; kettlebells solo de 4 en 4 en muchos gimnasios;
  rememberEquipment global en los tests.

### serix-coach (9,1)
- `coach.ts` plannedGroupSets cuenta cardio, pliometría y el bloque de acondicionamiento: un «Perder grasa» recién
  generado recibe «quita una serie de escaladores/remo»; biblioteca pide hip thrust de primeras. Test: programa
  recién generado sin consejos de volumen.
- legCurl sin máquinas: nórdico para intermedios/avanzados antes que peso muerto a una pierna; no repetir bisagra.
- Con mancuernas/kettlebell, variantes con carga (búlgara/zancada con mancuernas, goblet) antes que sin peso.
- Fuerza avanzado 4 días: cada básico 1 vez/semana; Pierna B con 15 series pesadas. Dips en casa sin paralelas;
  Chin-Up 3×10-15 tras dominadas; sin gemelos en peso corporal.
- «Perder grasa»: principiante 90 min con 9 ejercicios a 2 series; avanzado 60 min con 6 series/sem de grupos
  grandes. Dieta muy baja: proteína 2,2 g/kg se come los hidratos (1160 kcal → 121 g P, 70 g H).

### serix-perf-a11y (9,8)
- `App.tsx` efecto `place`: al ir a una pantalla que se carga aparte (Rutinas, Comidas, Perfil, detalle de rutina)
  el intervalo encuentra el h1 oculto de la anterior (Suspense), su focus() no hace nada y se cancela. Ignorar h1
  no visibles o seguir hasta que activeElement sea el h1.
