// Tema de la app: el del sistema o uno elegido a mano (claro u oscuro). Los colores están en
// styles.css; aquí solo se marca <html data-theme> y el color de la barra de estado.

export type Theme = 'light' | 'dark'

const BAR = { light: '#F2F2F7', dark: '#000000' }

export function applyTheme(theme: Theme | undefined) {
  if (typeof document === 'undefined' || !document.documentElement) return
  const root = document.documentElement
  if (theme) root.dataset.theme = theme
  else delete root.dataset.theme
  // Las etiquetas theme-color de index.html siguen al sistema; con un tema elegido se fijan las dos.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = BAR[theme ?? own]
  })
}
