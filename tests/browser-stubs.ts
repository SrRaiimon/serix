// Lo mínimo del navegador que algunos módulos tocan al cargarse (p. ej. timer.ts escucha
// visibilitychange y pwa.ts los avisos de instalación). Se importa antes que ellos.
const g = globalThis as { document?: unknown; window?: unknown; navigator?: { vibrate?: unknown } }
g.document ??= { addEventListener: () => {}, visibilityState: 'visible' }
g.window ??= { addEventListener: () => {}, matchMedia: () => ({ matches: false }) }
// Los componentes (router, pantallas) leen la URL al cargarse.
;(globalThis as { location?: unknown }).location ??= { hash: '', href: 'http://localhost/', origin: 'http://localhost', pathname: '/', search: '' }
