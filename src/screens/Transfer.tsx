import { Camera, QrCode as QrIcon, Send, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode } from '../components/Qr'
import { Card, NavBar, useCatalog } from '../components/ui'
import { migrateCatalog } from '../lib/migrate'
import { navigate } from '../lib/router'
import { finishedSessions, getData, replaceData, useData, type AppData } from '../lib/store'
import { addFrame, assemble, emptyReceived, encodeTransfer, isComplete, parseFrame, type Received } from '../lib/transfer'
import { keepScreenOn } from '../lib/workout'
import { plural, t } from '../lib/i18n'

// Pasar los datos a otro móvil con códigos QR (ver lib/transfer.ts): uno muestra, el otro lee.

export function TransferScreen({ mode }: { mode?: string }) {
  const onboarded = useData().settings.onboarded
  return (
    <div className="screen with-nav">
      <NavBar title={t('Pasar a otro móvil', 'Move to another phone')} showBack={onboarded || mode !== undefined} />
      {mode === 'send' ? <Sender /> : mode === 'receive' ? <Receiver /> : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {t('Pasa rutinas, historial, medidas y ajustes de un móvil a otro sin internet ni cuentas: este móvil muestra unos códigos QR y el otro los lee con la cámara.',
              'Move routines, history, measurements and settings from one phone to another without internet or accounts: this phone shows QR codes and the other reads them with its camera.')}
          </p>
          <button className="option-card" onClick={() => navigate('transfer', 'send')}>
            <span className="icon"><Send size={22} /></span>
            <span className="grow"><strong style={{ display: 'block' }}>{t('Enviar desde este móvil', 'Send from this phone')}</strong><span className="small muted">{t('Es el móvil que tiene los datos', 'The phone that has the data')}</span></span>
          </button>
          <button className="option-card" onClick={() => navigate('transfer', 'receive')}>
            <span className="icon"><Camera size={22} /></span>
            <span className="grow"><strong style={{ display: 'block' }}>{t('Recibir en este móvil', 'Receive on this phone')}</strong><span className="small muted">{t('Sus datos actuales se sustituirán', 'Its current data will be replaced')}</span></span>
          </button>
        </>
      )}
    </div>
  )
}

/** Tiempo que se muestra cada código (normal y despacio, para cámaras lentas). */
const FRAME_MS = [250, 600]
/** Más códigos que esto ya no compensa: mejor el archivo de copia. */
const TOO_MANY = 400

function Sender() {
  const [frames, setFrames] = useState<string[]>()
  const [index, setIndex] = useState(0)
  const [slow, setSlow] = useState(false)
  const sessions = useMemo(() => finishedSessions(getData()).length, [])

  useEffect(() => {
    void encodeTransfer(getData()).then(setFrames)
    void keepScreenOn(true)
    return () => void keepScreenOn(false)
  }, [])
  useEffect(() => {
    if (!frames || frames.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % frames.length), FRAME_MS[slow ? 1 : 0])
    return () => clearInterval(t)
  }, [frames, slow])

  if (!frames) return <p className="muted">{t('Preparando los datos…', 'Preparing the data…')}</p>
  if (frames.length > TOO_MANY) {
    return (
      <Card>
        <p style={{ margin: 0 }}>{t(`Hay demasiados datos para pasarlos por QR (${frames.length} códigos). Usa mejor Perfil → «Exportar copia de seguridad» y abre el archivo en el otro móvil.`, `There is too much data to move by QR (${frames.length} codes). Use Profile → “Export backup” instead and open the file on the other phone.`)}</p>
      </Card>
    )
  }
  return (
    <div className="transfer">
      <QrCode text={frames[index]} label={t(`Código ${index + 1} de ${frames.length}`, `Code ${index + 1} of ${frames.length}`)} className="transfer-qr" />
      <span className="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{t(`Código ${index + 1} de ${frames.length}`, `Code ${index + 1} of ${frames.length}`)}</span>
      <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
        {t(`En el otro móvil abre Serix → Perfil → «Pasar a otro móvil» → «Recibir» (o, si es nuevo, «¿Vienes de otro móvil?» al empezar) y apunta la cámara aquí. Los códigos van pasando solos; da igual el orden. ${plural(sessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])} en total.`,
          `On the other phone open Serix → Profile → “Move to another phone” → “Receive” (or, if it is new, “Coming from another phone?” at the start) and point the camera here. The codes change on their own; the order does not matter. ${plural(sessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])} in total.`)}
      </p>
      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> {t('Más despacio (si al otro le cuesta leerlos)', 'Slower (if the other phone struggles to read them)')}
      </label>
    </div>
  )
}

/** Lados (px) a los que se reduce la imagen de la cámara antes de buscar el código. */
const SCAN_SIZES = [560, 480, 640]

type Phase = 'idle' | 'scanning' | 'done' | 'error'

function Receiver() {
  const catalog = useCatalog()
  const current = useData()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string>()
  const [received, setReceived] = useState<Received>(emptyReceived)
  const [result, setResult] = useState<AppData>()
  const currentSessions = finishedSessions(current).length

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])

  const start = async () => {
    setError(undefined)
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase('error')
      return setError(t('Este navegador no permite usar la cámara. Prueba a abrir Serix en Safari (iPhone) o Chrome (Android).', 'This browser does not allow camera access. Try opening Serix in Safari (iPhone) or Chrome (Android).'))
    }
    try {
      const [{ default: jsQR }, media] = await Promise.all([
        import('jsqr'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      ])
      stream.current = media
      const v = video.current!
      v.srcObject = media
      await v.play()
      setPhase('scanning')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      let state = emptyReceived()
      let last = 0
      let attempt = 0
      const tick = (now: number) => {
        if (!stream.current) return
        // ~10 lecturas por segundo: más que los 4 códigos por segundo que se muestran.
        if (now - last > 100 && v.videoWidth) {
          last = now
          // Solo el cuadrado central, reducido: más rápido y es donde se apunta el código. Se van
          // alternando tamaños porque según la cámara y la distancia se lee mejor uno u otro.
          const side = Math.min(v.videoWidth, v.videoHeight)
          const size = Math.min(side, SCAN_SIZES[attempt++ % SCAN_SIZES.length])
          canvas.width = canvas.height = size
          ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size)
          const code = jsQR(ctx.getImageData(0, 0, size, size).data, size, size, { inversionAttempts: 'dontInvert' })
          const frame = code ? parseFrame(code.data) : undefined
          if (frame) {
            const next = addFrame(state, frame)
            if (next !== state) {
              state = next
              setReceived(next)
              navigator.vibrate?.(15)
              if (isComplete(next)) {
                stop()
                void assemble(next).then((data) => { setResult(data); setPhase('done') }).catch((e: unknown) => {
                  setPhase('error')
                  setError(e instanceof Error && e.message ? e.message : t('Los datos recibidos no son válidos. Vuelve a intentarlo.', 'The received data is not valid. Please try again.'))
                })
                return
              }
            }
          }
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch (e) {
      stop()
      setPhase('error')
      setError(e instanceof DOMException && e.name === 'NotAllowedError'
        ? t('No hay permiso para usar la cámara. Actívalo en los ajustes del navegador para esta web y vuelve a intentarlo.', 'There is no permission to use the camera. Allow it in the browser settings for this site and try again.')
        : t('No se ha podido abrir la cámara.', 'The camera could not be opened.'))
    }
  }

  const apply = () => {
    if (!result) return
    replaceData(result)
    // Por si los datos vienen de una versión antigua con el catálogo anterior.
    migrateCatalog(catalog)
    navigate('home')
  }

  if (phase === 'done' && result) {
    const sessions = finishedSessions(result).length
    return (
      <>
        <Card title={t('Datos recibidos', 'Data received')} icon={Smartphone}>
          <span>{result.settings.name ? `${t('De', 'From')} ${result.settings.name}: ` : ''}{plural(sessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}, {plural(result.routines.length, ['rutina', 'rutinas'], ['routine', 'routines'])} {t('y', 'and')} {plural(result.measurements.length, ['medida', 'medidas'], ['measurement', 'measurements'])}.</span>
          {currentSessions > 0 && (
            <span className="small" style={{ color: 'var(--red-text)' }}>
              {t(`Se sustituirán los datos actuales de este móvil (${plural(currentSessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}).`, `This phone's current data will be replaced (${plural(currentSessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}).`)}
            </span>
          )}
        </Card>
        <button className="btn primary block" onClick={apply}>{t('Usar estos datos', 'Use this data')}</button>
        <button className="btn plain block" onClick={() => { setResult(undefined); setReceived(emptyReceived()); setPhase('idle') }}>{t('Cancelar', 'Cancel')}</button>
      </>
    )
  }

  return (
    <div className="transfer">
      <div className={`transfer-camera ${phase === 'scanning' ? 'on' : ''}`}>
        <video ref={video} playsInline muted />
        {phase !== 'scanning' && <QrIcon size={56} />}
        <div className="transfer-aim" />
      </div>
      {phase === 'scanning' && (
        <>
          <div className="progress green" style={{ width: '100%' }}>
            <div style={{ transform: `scaleX(${received.total ? received.parts.size / received.total : 0})` }} />
          </div>
          <span className="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {received.total ? t(`${received.parts.size} de ${received.total} códigos`, `${received.parts.size} of ${received.total} codes`) : t('Apunta al código del otro móvil', 'Point at the code on the other phone')}
          </span>
          <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
            {t('Mantén el código dentro del recuadro, a unos 20-30 cm. No hace falta que esté quieto: los que falten se leen en la siguiente vuelta.', 'Keep the code inside the frame, about 20-30 cm away. It does not need to be still: any missing ones are read on the next loop.')}
          </p>
        </>
      )}
      {error && <p className="small" style={{ color: 'var(--red-text)', margin: 0, textAlign: 'center' }}>{error}</p>}
      {phase !== 'scanning' && (
        <>
          <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
            {t('En el móvil que tiene los datos abre Serix → Perfil → «Pasar a otro móvil» → «Enviar».', 'On the phone that has the data open Serix → Profile → “Move to another phone” → “Send”.')}
            {currentSessions > 0 && t(` Los datos de este móvil (${plural(currentSessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}) se sustituirán; antes de hacerlo te lo confirmaremos.`, ` This phone's data (${plural(currentSessions, ['entrenamiento', 'entrenamientos'], ['workout', 'workouts'])}) will be replaced; we will ask you to confirm first.`)}
          </p>
          <button className="btn primary block" onClick={() => void start()}><Camera size={20} /> {t('Abrir la cámara', 'Open camera')}</button>
        </>
      )}
    </div>
  )
}
