/**
 * Si hay novedades sin ver desde la última actualización. Sin mirar la lista (changelog.ts pesa y se
 * carga solo al enseñarlas): cada versión publicada trae su entrada, lo comprueba el guardián de publicar.
 */
export const newsDue = (seenVersion: string | undefined) => !!seenVersion && seenVersion !== __APP_VERSION__
