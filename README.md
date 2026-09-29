# Serix

App web instalable (PWA) para quien entrena: rutinas adaptadas a tu objetivo y material, registro de
cada serie y seguimiento de tu progreso. Funciona en Android, iPhone y ordenador, y sin conexión una
vez abierta. Gratuita, sin cuentas, sin publicidad y sin analítica.

**Abrir la app:** https://srraiimon.github.io/serix/

## Qué incluye

- **Programa generado** a partir de un cuestionario inicial (objetivo, nivel, días, minutos y
  material: gimnasio, mancuernas, kettlebell, bandas o sin material).
- **Rutinas** editables, con **superseries y circuitos**, y **compartibles por enlace**
  (`#/import/<código>`: solo lleva los ejercicios y las cifras, no datos personales).
- **Entrenamiento** con registro de series (peso y repeticiones, tiempo o distancia según el
  ejercicio), series de calentamiento, **RPE** opcional por serie, temporizador de descanso,
  sugerencia de progresión y **sustituir ejercicio** por alternativas equivalentes.
- **Catálogo de 876 ejercicios** en español con material, nivel y un **mapa muscular** propio
  (frente y espalda). Los más habituales incluyen **figura animada** del movimiento e instrucciones.
- **Progreso:** volumen y entrenamientos por semana, series por músculo, historial, récords y
  evolución por ejercicio (1RM estimado, peso máximo, volumen).
- **Perfil:** medidas corporales, calendario, calculadoras de 1RM y de discos, kg/lb, copia de
  seguridad (exportar/importar) y la pantalla **Legal y privacidad**.
- Se **actualiza sola**: al publicar una versión nueva, la app la carga en la siguiente apertura
  (nunca durante un entrenamiento). La versión se ve en Perfil.

## Privacidad y seguridad

- **Los datos se quedan en el dispositivo** (IndexedDB). No hay servidor propio, ni cuentas, ni
  cookies, ni analítica. Lo único que sale del móvil es la descarga de la propia web desde GitHub
  Pages, que como cualquier alojamiento ve la IP de conexión.
- La app no carga nada de terceros: las ilustraciones son dibujos propios generados en el propio
  código.
- **Política de seguridad de contenido (CSP)** en la build de producción (`vite.config.ts`): solo se
  cargan scripts, estilos, imágenes y conexiones del propio origen.
- **Copias de seguridad validadas** al importar (`src/lib/backup.ts`): tamaño máximo de 20 MB, solo
  campos conocidos, tipos comprobados y valores dentro de rangos razonables; lo demás se descarta.
- La app no pide permisos del sistema (ni ubicación, ni cámara, ni notificaciones). Durante un
  entrenamiento vibra y mantiene la pantalla encendida, dos funciones que no requieren autorización.

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

- **Código:** MIT (ver [`LICENSE`](LICENSE)).
- **Ejercicios:** nombres y clasificación (músculos, material, nivel) tomados de la lista de
  [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) y traducidos a mano. Son datos de
  hecho. **No se usan sus fotos ni sus instrucciones**: aunque el repositorio se declara de dominio
  público, las fotos proceden de webs con derechos (su propio autor lo reconoce) y los textos están
  copiados de bodybuilding.com.
- **Instrucciones:** escritas para este proyecto (`scripts/catalog/instrucciones/`), sin partir de
  textos de terceros. Por ahora cubren los 126 ejercicios que usan el generador y el registro por
  tiempo o distancia.
- **Ilustraciones:** mapas musculares (`src/components/MuscleMap.tsx`) y figuras de movimiento
  animadas (`src/components/MoveFigure.tsx` + `src/lib/figures.ts`), dibujadas con código y originales.
  Las figuras cubren unos 95 ejercicios; en desarrollo se revisan todas en `#/dev-figuras`.
- **Dependencias:** React (MIT) y Lucide (ISC). Sus textos completos van en `public/licenses.txt`,
  que `scripts/licenses.mjs` genera en cada build y la app enlaza desde la pantalla legal.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # licencias + comprobación de tipos + dist/ (con sw.js y su lista de precarga)
npm run preview    # sirve dist/ en http://localhost:4173
```

Estructura:

- `src/screens/`: pantallas (Inicio, Rutinas, Entrenamiento, Ejercicios, Progreso, Perfil, Legal…).
- `src/lib/`: datos y lógica (`store.ts` almacenamiento, `generator.ts` programas, `catalog.ts`
  catálogo, `migrate.ts` migración de datos, `backup.ts` validación de copias, `share.ts` enlaces).
- `src/sw-template.js`: service worker (precarga de la app para usarla sin conexión).
- `scripts/`: generación de licencias y del catálogo.

## Catálogo de ejercicios

`public/exercises_es.json` se genera con `scripts/catalog/build_catalog.py` a partir de la lista de
Free Exercise DB (solo nombres y clasificación), de `names_es.txt` (nombres traducidos a mano) y de
`instrucciones/*.json` (pasos escritos para el proyecto):

```bash
git clone --depth 1 https://github.com/yuhonas/free-exercise-db.git /tmp/fedb
python3 -c "import json;json.dump(json.load(open('public/exercise_ids_v1.json')),open('/tmp/old_to_new.json','w'))"
python3 scripts/catalog/build_catalog.py /tmp/fedb/dist/exercises.json /tmp/old_to_new.json
python3 scripts/catalog/check_ids.py   # los ejercicios citados en el código existen
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
