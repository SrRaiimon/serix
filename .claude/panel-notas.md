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
| 0.1.6 | 9,7 | 9,6 | 9,7 | 9,8 | 9,7 |
| 0.1.7 | 9,8 | 9,5 | 9,7 | 9,9 | 9,7 (9,725) |
| 0.1.8 | 9,8 | 9,5 | 9,8 | 9,8 | 9,7 (9,725) |

## Pendientes tras 0.1.8 (resueltos desde 0.1.7: programas sin tirón, press tres días seguidos en principiante 6 días,
## nombres desde la A, RPE en descarga reversible, «Más series», «<1 min» al compartir, «La semana que viene», «Más
## tarde» como texto, límites de zona sin bordes laterales, pesos del generador con nombre)
## Crítica de diseño: 31/40; detector limpio. Para subir: Inicio más corto, explicar RPE y descarga la primera vez.

### serix-ux (9,8)
- Días de cuerpo completo sin tirón (principiante 6 días): el tirón solo se garantiza por semana.
- Torso B con 9 series de empuje y 3 de tirón; hip thrust y puente con barra el mismo día.
- Routines.tsx:330 «Última vez» con «0 min» (usar duration()) y series con workingSets en vez de sessionSets.
- «Tu plan» con 60 min dice 60 frente a 39–53′: minutos reales (o el rango) siempre que el día más largo baje.
- Mismo aislamiento en días seguidos (extensión de tríceps días 1 y 2, cuádriceps 5 y 6; en 3 de 5 días).

### serix-code (9,5)
- Session.tsx:207 allDeload falla con plancha/abdomen/5-3-1 en la semana de descarga: usar deloadWeek(d, session.start)
  y el volumen sin los descargados; tests con plancha y con un solo ejercicio descargado.
- Por lados: con countsAsSet la derecha sin marcar se pierde sin aviso («3 de 3», «¡Buen trabajo!»); contar la pareja
  si cualquiera de los lados está hecho y que pending cuente todas las entradas sin marcar; test.
- «Un solo abdomen por día» no es verdad en 7 programas (gym hipertrofia principiante 3d 45m): subir series al que hay.
- Tests a todo el barrido (máx+2, empuje/tirón ≥45, brazos, abdomen): hoy dejan pasar 6 + 4 casos; isquios 18,5/16
  en kettlebell fatLoss principiante 6d 90m; empuje 16,5/9 en bandas fuerza principiante 2d 45m.
- generator-rules.test.ts:200 aflojado a exerciseCount(60) - 1: arreglarlo en el generador.
- Partir generator.ts (998 líneas); dayName en buildLibraryProgram (sin romper Casa A, B, A).
- Glúteo 17,5/15; deloadSets(2); «Quitar la descarga de hoy» no restaura; test de drops en weekRoutine.

### serix-coach (9,8)
- Reglas por día: cada cuerpo completo con tirón, empuje y pierna; ningún día < 3 ejercicios o < 60 % del tiempo
  (mancuernas fuerza principiante 6d 30m: un día de 1 ejercicio, 16 min).
- Mismo ejercicio en días seguidos: 245 configuraciones (sobre todo principiante 6 días e híbrido de 5).
- Abdomen bajo el mínimo en fatLoss/general ≥45 min (48), p. ej. gym fatLoss intermedio 2d 45/60m con 0.
- Brazos bajos sin gimnasio (66 con ≥3 días y ≥45 min; peso corporal fatLoss intermedio 3d 45m: bíceps 2,5).
- Avanzado 3 días en PPL; elevaciones laterales en Torso A del principiante; fatLoss en el test de bisagras.

### serix-perf-a11y (9,8)
- Mapa de calor en claro al revés: 1-3 más intenso que 4-9 (--mm-l* frente a --mm-s*). Volver a l > s > p en
  luminancia con contorno en las regiones l (también en oscuro, 1,1-1,2:1); test de orden de luminancia.
- Lighthouse y axe (con permiso); touch-area con medida real en el navegador; etiqueta «0 series, no tiene mínimo».
