import { ClipboardList, Copy, Download, Link2Off } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Empty, NavBar, Thumb, useCatalog, useToast } from '../components/ui'
import { navigate } from '../lib/router'
import { decodePlan, newRoutineFromImport, planLink, type ImportedPlan } from '../lib/share'
import { update, useData } from '../lib/store'
import { targetText } from '../lib/tracking'
import { isIOS, isStandalone } from '../lib/pwa'
import { t } from '../lib/i18n'

/** Pantalla que abre un enlace compartido (#/import/<código>) y deja guardar sus rutinas. */
export function ImportScreen({ code }: { code: string }) {
  const catalog = useCatalog()
  const data = useData()
  const [plan, setPlan] = useState<ImportedPlan>()
  const [error, setError] = useState<string>()
  const [toast, showToast] = useToast()

  useEffect(() => {
    decodePlan(code, catalog).then(setPlan).catch((e: unknown) => setError(e instanceof Error ? e.message : t('Enlace no válido.', 'Invalid link.')))
  }, [code, catalog])

  const save = () => {
    if (!plan) return
    update((d) => {
      // Si ya existe un programa con ese nombre, se añade con otro para no mezclarlos.
      let programName = plan.programName
      if (programName) {
        const taken = new Set(d.routines.map((r) => r.programName))
        let n = 2
        const base = programName
        while (taken.has(programName)) programName = `${base} (${n++})`
      }
      const start = d.routines.length
      plan.routines.forEach((r, i) => d.routines.push(newRoutineFromImport(r, programName ? i : start + i, programName)))
      if (programName && !d.settings.activeProgram) d.settings.activeProgram = programName
      // Quien llega por un enlace quiere esa rutina: no hace falta el cuestionario inicial.
      d.settings.onboarded = true
    })
    navigate('routines')
  }

  const copy = async () => {
    await navigator.clipboard.writeText(planLink(code))
    showToast(t('Enlace copiado', 'Link copied'))
  }

  const title = plan?.programName ?? (plan?.routines.length === 1 ? plan.routines[0].name : t('Rutinas compartidas', 'Shared routines'))
  // En iPhone, la app instalada y Safari no comparten datos: lo importado aquí no aparecería allí.
  const iosBrowser = isIOS() && !isStandalone()

  return (
    <>
      <NavBar title={t('Importar', 'Import')} left={<button className="nav-btn" onClick={() => navigate(data.settings.onboarded ? 'routines' : 'home')}>{t('Cancelar', 'Cancel')}</button>} />
      <div className="screen with-nav" style={{ paddingBottom: 120 }}>
        {error && <Empty icon={Link2Off} title={t('No se pudo abrir el enlace', 'Could not open the link')} message={error} />}
        {!error && !plan && <p className="muted">{t('Leyendo rutina…', 'Reading routine…')}</p>}
        {plan && (
          <>
            <Card title={title} icon={ClipboardList}>
              <span className="small muted">
                {plan.routines.length === 1
                  ? t('Te han compartido una rutina. Se añadirá a las tuyas; no se borra nada.', 'Someone shared a routine with you. It will be added to yours; nothing is deleted.')
                  : t(`Te han compartido ${plan.routines.length} rutinas. Se añadirán a las tuyas; no se borra nada.`, `Someone shared ${plan.routines.length} routines with you. They will be added to yours; nothing is deleted.`)}
              </span>
              {plan.skipped > 0 && <span className="small" style={{ color: '#f08c00' }}>{t(`${plan.skipped} ejercicios no están en tu versión de la app y se omitirán.`, `${plan.skipped} exercises are not in your version of the app and will be skipped.`)}</span>}
            </Card>
            {iosBrowser && (
              <div className="install-banner" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <span className="small">
                  <strong>{t('¿Tienes la app instalada en el iPhone?', 'Is the app installed on your iPhone?')}</strong>{' '}
                  {t('La app de la pantalla de inicio no comparte datos con Safari. Copia el enlace y pégalo en la app:', 'The Home Screen app does not share data with Safari. Copy the link and paste it in the app:')}{' '}
                  <b>{t('Rutinas → + → Importar desde enlace', 'Routines → + → Import from link')}</b>.
                </span>
                <button className="btn small secondary" onClick={() => void copy()}><Copy size={16} /> {t('Copiar enlace', 'Copy link')}</button>
              </div>
            )}
            {plan.routines.map((r) => (
              <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="list-header">{r.name}</div>
                <div className="list">
                  {r.exercises.map((e, i) => (
                    <div key={i} className="list-row">
                      <Thumb exerciseId={e.exerciseId} size={44} />
                      <span className="grow">
                        <span className="bold clamp-2" style={{ fontSize: 15 }}>{e.name}</span>
                        <span className="small muted">{targetText(e)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {plan && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(var(--safe-bottom) + 16px)', background: 'linear-gradient(transparent, var(--bg) 30%)', zIndex: 35 }}>
          <div style={{ maxWidth: 528, margin: '0 auto' }}>
            <button className="btn primary block" onClick={save}><Download size={19} /> {t('Guardar en mis rutinas', 'Save to my routines')}</button>
          </div>
        </div>
      )}
      {toast}
    </>
  )
}
