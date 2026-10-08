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

/**
 * Letra más grande (Perfil → Ajustes): se amplía toda la app con `zoom`, así crecen también los
 * botones y los números a la vez (los tamaños de styles.css van en px).
 */
export function applyTextScale(scale: number | undefined) {
  if (typeof document === 'undefined' || !document.documentElement) return
  const root = document.documentElement
  const value = scale && scale > 1 ? String(scale) : ''
  if (root.style.zoom !== value) root.style.zoom = value
}
