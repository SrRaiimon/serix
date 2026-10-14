# Serix (GymWeb)

App de gimnasio para un grupo de amigos, PWA en React 19 + TypeScript 7 + Vite 8 (rolldown), router por hash
y todos los datos en el móvil (IndexedDB, un solo registro; `src/lib/store.ts`). Publicada en
https://srraiimon.github.io/serix/ desde `main` (GitHub Actions: build + e2e; si fallan, no se publica).
Pensada para Europa (kg, €, normativa UE).

## Reglas (no negociables)

- **Siempre en español** con el usuario.
- **Preguntar «¿Lo publico?» antes de cada `git push`** y esperar un sí expreso. Un sí vale para ese push.
- **Cada publicación de la app sube `version` en `package.json`** y añade su entrada en `src/lib/changelog.ts`
  (frases cortas, lo que se nota al usar la app, con su texto en español e inglés).
- **Nunca borrar carpetas con `rm` recursivo** (`-r`, `-rf`…), y nunca borrar carpetas que ya existían: se borra solo el archivo temporal que uno creó.
  En el scratchpad, en vez de borrar, se usan carpetas nuevas.
- **Commits con el email del repo** `49187817+SrRaiimon@users.noreply.github.com` (ya configurado en local) y
  terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. El email global de git no se toca
  sin preguntar.
- **Borrar repos o meter credenciales lo hace el usuario.** Descargar archivos o paquetes nuevos: preguntar antes.
- **Sin APIs de pago.** Contenido de terceros (ejercicios, alimentos, imágenes): comprobar origen y licencia.
- Los agentes evaluadores son de **solo lectura**.

## Comprobar cada versión (prueba ligera)

```bash
export PATH=$HOME/.nvm/versions/node/v24.15.0/bin:$PATH
npx tsc --noEmit && npx tsc --noEmit -p tests
npm test                      # node:test, tests/*.test.ts
npm run build                 # licencias + tipos + tests + figuras + vite build
npm run e2e                   # español, inglés con tema claro y francés, con Chrome
node scripts/i18n/missing.mjs # textos sin traducir a francés/portugués
python3 scripts/catalog/check_ids.py   # si se toca el catálogo de ejercicios
```

Más lo que haya cambiado, visto en el navegador (375×812, claro y oscuro). Recorrido completo y Lighthouse
solo cada muchas versiones. Para publicar entera una versión, `/serix-release`; para la nota, `/serix-panel`.

## Convenciones

- **Textos:** `t('español', 'English')` y `plural(n, [es…], [en…])` de `src/lib/i18n.ts`. Francés y portugués
  van en `src/i18n/fr.json` y `pt.json`, con el texto en español como clave (las plantillas `${x}` pasan a
  `{0}`). Todo texto nuevo necesita sus dos entradas o falla `tests/i18n-dict.test.ts`.
  `dataLang()` para datos que solo existen en es/en (catálogo, alimentos, legal).
- **Cambios de datos** con `update(d => …)` (Immer) o `updateSettings`; `withUndo` si se puede deshacer.
  Para cambiar la forma de los datos guardados: subir `DATA_VERSION` y añadir el paso en `MIGRATIONS`
  (store.ts), y su saneado en `src/lib/backup.ts`.
- **CSS** en `src/styles.css`, con nombres de clase únicos. Colores con las variables del tema, zonas táctiles
  de 44 px (regla `:where(...)::after` al final del archivo).
- Comentarios en español, explicando el porqué. El código imita el estilo del archivo que se toca.
- No editar a mano `dist/` ni `package-lock.json`.
