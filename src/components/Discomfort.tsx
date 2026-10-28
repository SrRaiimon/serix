import { useState } from 'react'
import { Card, Chip, Sheet } from './ui'
import { DISCOMFORT_ZONES, discomfortSide, discomfortZone, recentDiscomfort, repeatedDiscomfort, type Discomfort, type DiscomfortSide } from '../lib/discomfort'
import { shortDay } from '../lib/format'
import { t } from '../lib/i18n'
import type { Session } from '../lib/store'

// Un toque en la zona guarda; el lado se puede elegir antes, sin obligar a rellenar más campos.
export function DiscomfortSheet({ value, onSave, onClose }: { value?: Discomfort; onSave: (value: Discomfort | undefined) => void; onClose: () => void }) {
  const [side, setSide] = useState<DiscomfortSide | undefined>(value?.side)
  return <Sheet title={t('Me ha molestado', 'It caused discomfort')} onClose={onClose}
    left={<button className="nav-btn" onClick={onClose}>{t('Cancelar', 'Cancel')}</button>}>
    <p className="small muted">{t('El lado es opcional. Toca una zona para guardarla.', 'The side is optional. Tap an area to save it.')}</p>
    <div className="discomfort-sides">
      {(['left', 'right', 'both'] as const).map((s) => <Chip key={s} label={discomfortSide(s)} active={side === s} onClick={() => setSide(side === s ? undefined : s)} />)}
    </div>
    <div className="discomfort-zones">
      {DISCOMFORT_ZONES.map((zone) => <button key={zone} className="btn secondary" aria-pressed={value?.zone === zone}
        onClick={() => { onSave({ zone, side, at: value?.zone === zone ? value.at : Date.now() }); onClose() }}>{discomfortZone(zone)}</button>)}
    </div>
    {value && <button className="btn plain" onClick={() => { onSave(undefined); onClose() }}>{t('Quitar la molestia', 'Remove the entry')}</button>}
  </Sheet>
}
export function DiscomfortAdvice() {
  return <p className="discomfort-advice" role="status">{t('Has registrado molestias en esta zona al menos 3 veces en 14 días. Consulta con un profesional sanitario.', 'You have logged discomfort in this area at least 3 times in 14 days. Consult a healthcare professional.')}</p>
}
export function RecentDiscomfortCard({ sessions }: { sessions: Session[] }) {
  const records = recentDiscomfort(sessions)
  if (!records.length) return null
  const groups = new Map<string, typeof records>()
  for (const r of records) {
    const key = `${r.discomfort.zone}:${r.exercise.exerciseId}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return <Card title={t('Molestias recientes', 'Recent discomfort')} className="discomfort-recent">
    <p className="small muted">{t('Últimos 30 días. Solo lo que has registrado tú.', 'Last 30 days. Only what you have logged.')}</p>
    {[...groups.entries()].map(([key, group]) => {
      const r = group[0]
      return <div className="discomfort-record" key={key}>
        <strong>{discomfortZone(r.discomfort.zone)} · {r.exercise.name}</strong>
        <span className="small muted">{group.map((x) => `${shortDay(x.discomfort.at)}${x.discomfort.side ? ` · ${discomfortSide(x.discomfort.side)}` : ''}${x.discomfort.resolved ? ` · ${t('Ya no molesta', 'No longer bothers you')}` : ''}`).join(' / ')}</span>
        {repeatedDiscomfort(sessions, r.discomfort.zone) && <DiscomfortAdvice />}
      </div>
    })}
  </Card>
}
