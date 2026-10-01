# Serix

App web instalable (PWA) para quien entrena: rutinas adaptadas a tu objetivo y material, registro de
cada serie y seguimiento de tu progreso. Funciona en Android, iPhone y ordenador, y sin conexión una
vez abierta. Gratuita, sin cuentas, sin publicidad y sin analítica.

**Abrir la app:** https://srraiimon.github.io/serix/

## Qué incluye

- **Programa generado** a partir de un cuestionario inicial (objetivo, nivel, días, minutos y
  material: gimnasio, mancuernas, kettlebell, bandas o sin material).
- **Rutinas** editables, con **superseries y circuitos**, y **compartibles por enlace o código QR**
  (`#/import/<código>`: solo lleva los ejercicios y las cifras, no datos personales).
- **Entrenamiento** con registro de series (peso y repeticiones, tiempo o distancia según el
  ejercicio), **series de calentamiento automáticas** hasta el peso de trabajo, **calculadora de
  discos** por lado (barra de 20, 15 o 10 kg), **RPE** opcional por serie, temporizador de descanso,
  sugerencia de progresión, **aviso de récord** al marcar la serie y **sustituir ejercicio** por
  alternativas equivalentes.
- **Progresión automática:** doble progresión (por defecto en los programas generados), lineal y
  programa **5/3/1** con su ciclo de 4 semanas; la app calcula el peso de cada serie al empezar.
- **Recuperación muscular:** estimación por grupo (48-96 h según el volumen del último entrenamiento).
- **Importar desde Strong y Hevy** (CSV): se empareja cada ejercicio con el catálogo y se puede corregir;
  no duplica entrenamientos al reimportar.
- **Deshacer** los borrados durante unos segundos (series, ejercicios, entrenamientos, rutinas…).
- **Logros:** constancia, rachas, volumen, récords y fuerza; se calculan del historial y avisan al terminar.
- **Discos de tu gimnasio:** la calculadora y todos los redondeos de peso usan los discos que elijas.
- **Exportar a CSV** (una fila por serie) para Excel, Numbers o Google Sheets.
- **Tema claro, oscuro o automático**, elegible en Perfil.
- **En español e inglés:** sigue el idioma del móvil y se puede cambiar en Perfil (o al empezar).
- **Catálogo de 876 ejercicios** con material, nivel y un **mapa muscular** propio
  (frente y espalda). Todos incluyen **figura animada** del movimiento e instrucciones.
- **Progreso:** resumen del mes comparado con el anterior, mapa de calor de los músculos trabajados en los últimos 7 días (y aviso de los
  grupos sin tocar), volumen y entrenamientos por semana, series por músculo, historial, récords y
  evolución por ejercicio (1RM estimado, peso máximo, volumen).
- **Compartir:** al terminar, una tarjeta-imagen del entrenamiento (músculos, cifras y récords)
  generada en el propio móvil, lista para WhatsApp o Instagram; también como texto.
- **Perfil:** medidas corporales, calendario, calculadoras de 1RM y de discos, kg/lb, copia de
  seguridad (exportar/importar) y la pantalla **Legal y privacidad**.
- Se **actualiza sola**: al publicar una versión nueva, la app la carga en la siguiente apertura
  (nunca durante un entrenamiento). La versión (p. ej. 0.0.1) se ve en Perfil y sale de
  `package.json`: en cada publicación se sube el último número.

## Privacidad y seguridad

- **Los datos se quedan en el dispositivo** (IndexedDB). No hay servidor propio, ni cuentas, ni
  cookies, ni analítica. Lo único que sale del móvil es la descarga de la propia web desde GitHub
  Pages, que como cualquier alojamiento ve la IP de conexión.
- La app no carga nada de terceros: las ilustraciones son dibujos propios generados en el propio
  código.
- **Política de seguridad de contenido (CSP)** en la build de producción (`vite.config.ts`): solo se
  cargan scripts, estilos, imágenes y conexiones del propio origen.
- **Accesible:** contraste AA en modo claro y oscuro (texto ≥ 4,5:1). Los colores de relleno
  (`--accent`, `--green`…) llevan texto `--on-accent`, y para texto e iconos de color se usan
  `--accent-text`, `--green-text`, etc. Auditado con Lighthouse en todas las pantallas.
- **Copias de seguridad validadas** al importar (`src/lib/backup.ts`): tamaño máximo de 20 MB, solo
  campos conocidos, tipos comprobados y valores dentro de rangos razonables; lo demás se descarta.
- La app no pide permisos del sistema (ni ubicación, ni cámara, ni notificaciones). Durante un
  entrenamiento vibra y mantiene la pantalla encendida, dos funciones que no requieren autorización.
- **Protección de los datos:** instalada, la app pide al navegador almacenamiento persistente para
  que no borre los datos al liberar espacio (Chrome y Safari lo conceden sin preguntar). En el
  navegador normal solo se pide si el usuario pulsa «Protección contra borrado» en Perfil. Además,
  Inicio recuerda exportar una copia cada 30 días (a partir de 3 entrenamientos).

## Aviso legal

- En el cuestionario inicial y en Perfil → Legal y privacidad se muestra un **aviso de salud**: la
  app da orientaciones generales y no sustituye a un profesional.
- La pantalla legal explica qué datos se guardan, cómo borrarlos, las licencias y el contacto
  (incidencias de GitHub).
- **Nombre:** «Serix» se comprobó en [TMview](https://www.tmdn.org/tmview/) (OEPM, EUIPO y OMPI) el
  29-09-2026, sin marcas coincidentes ni apps con ese nombre. La base de datos interna se sigue
  llamando `gymapp` para conservar los datos de quien usaba la primera versión (la web anterior estaba
  en el mismo dominio, srraiimon.github.io, así que los datos se comparten).

## Licencias

- **Serix (código y contenido propios):** [PolyForm Noncommercial 1.0.0](LICENSE). Se puede usar,
  estudiar, modificar y compartir gratis con fines no comerciales; **cualquier uso comercial está
  prohibido** sin permiso escrito del autor. Alcance, ejemplos y consecuencias del incumplimiento en
  [`AVISO-LEGAL.md`](AVISO-LEGAL.md). Las versiones hasta la 0.0.10 se publicaron con licencia MIT.
- **Ejercicios:** nombres y clasificación (músculos, material, nivel) tomados de la lista de
  [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) y traducidos a mano. Son datos de
  hecho. **No se usan sus fotos ni sus instrucciones**: aunque el repositorio se declara de dominio
  público, las fotos proceden de webs con derechos (su propio autor lo reconoce) y los textos están
  copiados de bodybuilding.com.
- **Instrucciones:** escritas para este proyecto (`scripts/catalog/instrucciones/`), sin partir de
  textos de terceros, y traducidas al inglés a partir de ellas (`scripts/catalog/instructions_en/`).
  Cubren los 876 ejercicios. En inglés, los nombres son los de la lista original.
- **Ilustraciones:** mapas musculares (`src/components/MuscleMap.tsx`) y figuras de movimiento
  animadas (`src/components/MoveFigure.tsx` + `src/lib/figures.ts`), dibujadas con código y originales.
  Las figuras cubren los 876 ejercicios; en desarrollo se revisan todas en `#/dev-figuras`.
- **Dependencias:** React (MIT), Lucide (ISC), qrcode-generator (MIT) para crear códigos QR y jsQR (Apache 2.0, con partes traducidas de ZXing) para leerlos con la cámara. Sus textos completos van en `public/licenses.txt`,
  que `scripts/licenses.mjs` genera en cada build y la app enlaza desde la pantalla legal.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la lógica (tests/*.test.ts, con node:test; sin dependencias extra)
npm run build      # licencias + tipos + tests + figuras + dist/ (con sw.js y su lista de precarga)
npm run preview    # sirve dist/ en http://localhost:4173
```

Estructura:

- `src/screens/`: pantallas (Inicio, Rutinas, Entrenamiento, Ejercicios, Progreso, Perfil, Legal…).
- `src/lib/`: datos y lógica (`store.ts` almacenamiento, `generator.ts` programas, `catalog.ts`
  catálogo, `migrate.ts` migración de datos, `backup.ts` validación de copias, `share.ts` enlaces,
  `i18n.ts` idiomas: cada texto va en el código con su traducción al lado, `t('Terminar', 'Finish')`).
- `src/sw-template.js`: service worker (precarga de la app para usarla sin conexión).
- `scripts/`: generación de licencias y del catálogo, tests y comprobación de figuras.
- `tests/`: tests de discos, calentamiento, estadísticas, copias de seguridad, migración y enlaces compartidos.

## Catálogo de ejercicios

`public/exercises_es.json` se genera con `scripts/catalog/build_catalog.py` a partir de la lista de
Free Exercise DB (solo nombres y clasificación), de `names_es.txt` (nombres traducidos a mano) y de
`instrucciones/*.json` (pasos escritos para el proyecto) e `instructions_en/*.json` (su traducción,
con los mismos ejercicios y número de pasos; el script lo comprueba):

```bash
git clone --depth 1 https://github.com/yuhonas/free-exercise-db.git /tmp/fedb
python3 -c "import json;json.dump(json.load(open('public/exercise_ids_v1.json')),open('/tmp/old_to_new.json','w'))"
python3 scripts/catalog/build_catalog.py /tmp/fedb/dist/exercises.json /tmp/old_to_new.json
python3 scripts/catalog/check_ids.py   # los ejercicios citados en el código existen
npm run check:figures                  # figuras: cobertura, nada atraviesa el suelo, sin vueltas raras
                                        # (también se ejecuta en npm run build)
```

Regla para cualquier contenido nuevo (textos, imágenes, vídeos): usarlo solo si su **procedencia**
está verificada y la licencia lo permite. No basta con que el repositorio tenga un archivo LICENSE.

### Migración desde el catálogo anterior

Las primeras versiones usaban otro catálogo (GIF sin licencia de redistribución), que se sustituyó.
Al abrir la app, `src/lib/migrate.ts` adapta los datos guardados con aquel catálogo
(`settings.catalogVersion` < 2):

- **Qué se adapta:** rutinas, entrenamientos, favoritos, copias de seguridad importadas y enlaces
  compartidos antiguos.
- **Cómo:** con la tabla `public/exercise_ids_v1.json`, generada con `map_old_ids.py`.
- **Ejercicios sin equivalencia:** conservan su nombre y su historial, pero se muestran sin ilustración.

## Publicación

`.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main` (Settings → Pages →
Source: GitHub Actions). Cualquier hosting de archivos estáticos con HTTPS sirve: basta con subir la
carpeta `dist/`.

## Instalar en el móvil

- **Android (Chrome):** abrir el enlace y pulsar «Instalar» (o menú ⋮ → Instalar aplicación).
- **iPhone (Safari):** abrir el enlace, Compartir → Añadir a pantalla de inicio.
