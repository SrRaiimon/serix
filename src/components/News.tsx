import { Sparkles } from 'lucide-react'
import { CHANGELOG, compareVersions, unseenReleases } from '../lib/changelog'
import { t } from '../lib/i18n'
import { updateSettings, useData } from '../lib/store'
import { Card, Sheet } from './ui'

/** Tras actualizar: lo nuevo, una sola vez (se cierra con «Entendido»). */
export function NewsCard() {
  const { settings } = useData()
  if (settings.seenVersion === __APP_VERSION__) return null
  const list = unseenReleases(settings.seenVersion, __APP_VERSION__)
  if (!list.length) return null
  return (
    <Card title={t('Novedades', "What's new")} icon={Sparkles}>
      <ul className="recap-list">{list.flatMap((r) => r.items).slice(0, 6).map(([es, en]) => <li key={es}>{t(es, en)}</li>)}</ul>
      <button className="btn secondary" onClick={() => updateSettings({ seenVersion: __APP_VERSION__ })}>{t('Entendido', 'Got it')}</button>
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
