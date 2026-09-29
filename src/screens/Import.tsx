import { ClipboardList, Copy, Download, Link2Off } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Empty, NavBar, Thumb, useCatalog, useToast } from '../components/ui'
import { navigate } from '../lib/router'
import { decodePlan, newRoutineFromImport, planLink, type ImportedPlan } from '../lib/share'
import { update, useData } from '../lib/store'
import { targetText } from '../lib/tracking'
import { isIOS, isStandalone } from '../lib/pwa'

/** Pantalla que abre un enlace compartido (#/import/<código>) y deja guardar sus rutinas. */
export function ImportScreen({ code }: { code: string }) {
  const catalog = useCatalog()
  const data = useData()
  const [plan, setPlan] = useState<ImportedPlan>()
  const [error, setError] = useState<string>()
  const [toast, showToast] = useToast()

  useEffect(() => {
    decodePlan(code, catalog).then(setPlan).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Enlace no válido.'))
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
    showToast('Enlace copiado')
  }

  const title = plan?.programName ?? (plan?.routines.length === 1 ? plan.routines[0].name : 'Rutinas compartidas')
  // En iPhone, la app instalada y Safari no comparten datos: lo importado aquí no aparecería allí.
  const iosBrowser = isIOS() && !isStandalone()

  return (
    <>
      <NavBar title="Importar" left={<button className="nav-btn" onClick={() => navigate(data.settings.onboarded ? 'routines' : 'home')}>Cancelar</button>} />
      <div className="screen with-nav" style={{ paddingBottom: 120 }}>
        {error && <Empty icon={Link2Off} title="No se pudo abrir el enlace" message={error} />}
        {!error && !plan && <p className="muted">Leyendo rutina…</p>}
        {plan && (
          <>
            <Card title={title} icon={ClipboardList}>
              <span className="small muted">
                Te han compartido {plan.routines.length === 1 ? 'una rutina' : `${plan.routines.length} rutinas`}. Se añadirán a las tuyas; no se borra nada.
              </span>
              {plan.skipped > 0 && <span className="small" style={{ color: '#f08c00' }}>{plan.skipped} ejercicios no están en tu versión de la app y se omitirán.</span>}
            </Card>
            {iosBrowser && (
              <div className="install-banner" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <span className="small">
                  <strong>¿Tienes la app instalada en el iPhone?</strong> La app de la pantalla de inicio no comparte datos con Safari.
                  Copia el enlace y pégalo en la app: <b>Rutinas → + → Importar desde enlace</b>.
                </span>
                <button className="btn small secondary" onClick={() => void copy()}><Copy size={16} /> Copiar enlace</button>
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
            <button className="btn primary block" onClick={save}><Download size={19} /> Guardar en mis rutinas</button>
          </div>
        </div>
      )}
      {toast}
    </>
  )
}
