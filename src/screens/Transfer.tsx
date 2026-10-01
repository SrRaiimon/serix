import { Camera, QrCode as QrIcon, Send, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { QrCode } from '../components/Qr'
import { Card, NavBar, useCatalog } from '../components/ui'
import { count } from '../lib/format'
import { migrateCatalog } from '../lib/migrate'
import { navigate } from '../lib/router'
import { finishedSessions, getData, replaceData, useData, type AppData } from '../lib/store'
import { addFrame, assemble, emptyReceived, encodeTransfer, isComplete, parseFrame, type Received } from '../lib/transfer'
import { keepScreenOn } from '../lib/workout'

// Pasar los datos a otro móvil con códigos QR (ver lib/transfer.ts): uno muestra, el otro lee.

export function TransferScreen({ mode }: { mode?: string }) {
  const onboarded = useData().settings.onboarded
  return (
    <div className="screen with-nav">
      <NavBar title="Pasar a otro móvil" showBack={onboarded || mode !== undefined} />
      {mode === 'send' ? <Sender /> : mode === 'receive' ? <Receiver /> : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Pasa rutinas, historial, medidas y ajustes de un móvil a otro sin internet ni cuentas: este móvil muestra
            unos códigos QR y el otro los lee con la cámara.
          </p>
          <button className="option-card" onClick={() => navigate('transfer', 'send')}>
            <span className="icon"><Send size={22} /></span>
            <span className="grow"><strong style={{ display: 'block' }}>Enviar desde este móvil</strong><span className="small muted">Es el móvil que tiene los datos</span></span>
          </button>
          <button className="option-card" onClick={() => navigate('transfer', 'receive')}>
            <span className="icon"><Camera size={22} /></span>
            <span className="grow"><strong style={{ display: 'block' }}>Recibir en este móvil</strong><span className="small muted">Sus datos actuales se sustituirán</span></span>
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

  if (!frames) return <p className="muted">Preparando los datos…</p>
  if (frames.length > TOO_MANY) {
    return (
      <Card>
        <p style={{ margin: 0 }}>Hay demasiados datos para pasarlos por QR ({frames.length} códigos). Usa mejor Perfil → «Exportar copia de seguridad» y abre el archivo en el otro móvil.</p>
      </Card>
    )
  }
  return (
    <div className="transfer">
      <QrCode text={frames[index]} label={`Código ${index + 1} de ${frames.length}`} className="transfer-qr" />
      <span className="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>Código {index + 1} de {frames.length}</span>
      <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
        En el otro móvil abre Serix → Perfil → «Pasar a otro móvil» → «Recibir» (o, si es nuevo, «¿Vienes de otro móvil?» al empezar)
        y apunta la cámara aquí. Los códigos van pasando solos; da igual el orden. {count(sessions, 'entrenamiento', 'entrenamientos')} en total.
      </p>
      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Más despacio (si al otro le cuesta leerlos)
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
      return setError('Este navegador no permite usar la cámara. Prueba a abrir Serix en Safari (iPhone) o Chrome (Android).')
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
                  setError(e instanceof Error && e.message ? e.message : 'Los datos recibidos no son válidos. Vuelve a intentarlo.')
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
        ? 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador para esta web y vuelve a intentarlo.'
        : 'No se ha podido abrir la cámara.')
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
        <Card title="Datos recibidos" icon={Smartphone}>
          <span>{result.settings.name ? `De ${result.settings.name}: ` : ''}{count(sessions, 'entrenamiento', 'entrenamientos')}, {count(result.routines.length, 'rutina', 'rutinas')} y {count(result.measurements.length, 'medida', 'medidas')}.</span>
          {currentSessions > 0 && (
            <span className="small" style={{ color: 'var(--red)' }}>
              Se sustituirán los datos actuales de este móvil ({count(currentSessions, 'entrenamiento', 'entrenamientos')}).
            </span>
          )}
        </Card>
        <button className="btn primary block" onClick={apply}>Usar estos datos</button>
        <button className="btn plain block" onClick={() => { setResult(undefined); setReceived(emptyReceived()); setPhase('idle') }}>Cancelar</button>
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
            <div style={{ width: `${received.total ? (received.parts.size / received.total) * 100 : 0}%` }} />
          </div>
          <span className="bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {received.total ? `${received.parts.size} de ${received.total} códigos` : 'Apunta al código del otro móvil'}
          </span>
          <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
            Mantén el código dentro del recuadro, a unos 20-30 cm. No hace falta que esté quieto: los que falten se leen en la siguiente vuelta.
          </p>
        </>
      )}
      {error && <p className="small" style={{ color: 'var(--red)', margin: 0, textAlign: 'center' }}>{error}</p>}
      {phase !== 'scanning' && (
        <>
          <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
            En el móvil que tiene los datos abre Serix → Perfil → «Pasar a otro móvil» → «Enviar».
            {currentSessions > 0 && ` Los datos de este móvil (${count(currentSessions, 'entrenamiento', 'entrenamientos')}) se sustituirán; antes de hacerlo te lo confirmaremos.`}
          </p>
          <button className="btn primary block" onClick={() => void start()}><Camera size={20} /> Abrir la cámara</button>
        </>
      )}
    </div>
  )
}
