import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { CHANGELOG, compareVersions, unseenReleases } from '../lib/changelog'
import { t } from '../lib/i18n'
import { updateSettings, useData } from '../lib/store'
import { Card, Sheet } from './ui'

/** Si hay novedades sin ver desde la última actualización. */
export const newsDue = (seenVersion: string | undefined) =>
  seenVersion !== __APP_VERSION__ && unseenReleases(seenVersion, __APP_VERSION__).length > 0

/** Tras actualizar: lo nuevo, una sola vez (se cierra con «Entendido»). */
export function NewsCard() {
  const { settings } = useData()
  const [all, setAll] = useState(false)
  if (settings.seenVersion === __APP_VERSION__) return null
  const list = unseenReleases(settings.seenVersion, __APP_VERSION__)
  if (!list.length) return null
  // Lo más destacado (3 puntos); el resto, en la hoja de novedades.
  const items = list.flatMap((r) => r.items)
  return (
    <Card title={t('Novedades', "What's new")} icon={Sparkles}>
      <ul className="recap-list">{items.slice(0, 3).map(([es, en]) => <li key={es}>{t(es, en)}</li>)}</ul>
      {items.length > 3 && <button className="link-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setAll(true)}>{t('Ver todas las novedades', 'See everything new')}</button>}
      <button className="btn secondary" onClick={() => updateSettings({ seenVersion: __APP_VERSION__ })}>{t('Entendido', 'Got it')}</button>
      {all && <NewsSheet onClose={() => setAll(false)} />}
    </Card>
  )
}

/** Todas las novedades (Perfil → Novedades). */
export function NewsSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={t('Novedades', "What's new")} onClose={onClose} right={<button className="nav-btn" onClick={onClose}>{t('Cerrar', 'Close')}</button>}>
      {CHANGELOG.filter((r) => compareVersions(r.version, __APP_VERSION__) <= 0).map((r) => (
        <Card key={r.version} title={`${t('Versión', 'Version')} ${r.version}`}>
          <ul className="recap-list">{r.items.map(([es, en]) => <li key={es}>{t(es, en)}</li>)}</ul>
        </Card>
      ))}
    </Sheet>
  )
}
