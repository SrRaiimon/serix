import { compareVersions } from './versions'

/**
 * Si hay novedades sin ver desde la última actualización. Sin mirar la lista (changelog.ts pesa y se
 * carga solo al enseñarlas): cada versión publicada trae su entrada, lo comprueba el guardián de publicar.
 * Solo si lo visto es más antiguo: una pestaña aún en la versión anterior no debe ocupar el aviso.
 */
export const newsDue = (seenVersion: string | undefined) => !!seenVersion && compareVersions(seenVersion, __APP_VERSION__) < 0
