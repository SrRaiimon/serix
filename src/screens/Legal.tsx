import { FileText, HeartPulse, Lock, Mail, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, NavBar } from '../components/ui'

export const REPO_URL = 'https://github.com/SrRaiimon/serix'

/** Aviso de salud: corto y discreto en el cuestionario inicial, como texto normal en Legal. */
export function HealthNotice({ plain = false }: { plain?: boolean }) {
  return (
    <p className={plain ? undefined : 'small muted'} style={plain ? undefined : { margin: 0 }}>
      Serix da orientaciones generales y <strong>no sustituye a un profesional</strong> de la salud o del
      entrenamiento. Si tienes una lesión, una enfermedad o dudas, consulta antes de empezar. Entrenas bajo tu
      responsabilidad: para si notas dolor, mareo o molestias.
    </p>
  )
}

function Section({ title, icon, children }: { title: string; icon: typeof Lock; children: ReactNode }) {
  return (
    <Card title={title} icon={icon}>
      <div className="small legal-text">{children}</div>
    </Card>
  )
}

export function LegalScreen() {
  return (
    <>
      <NavBar showBack title="Legal y privacidad" />
      <div className="screen with-nav">
        <Section title="Tu salud" icon={HeartPulse}>
          <HealthNotice plain />
          <p>
            Las rutinas se generan automáticamente a partir de tus respuestas y las sugerencias de peso son
            orientativas. Ajusta siempre la carga a cómo te encuentres y cuida la técnica.
          </p>
        </Section>

        <Section title="Privacidad" icon={Lock}>
          <p><strong>Tus datos se quedan en tu móvil.</strong> Rutinas, entrenamientos, medidas corporales y ajustes se guardan solo en el almacenamiento de este navegador o app. No hay cuentas, ni servidor propio, ni analítica, ni publicidad, y nadie más puede verlos.</p>
          <p><strong>Qué sale del móvil:</strong> al abrir la app, el navegador descarga sus archivos de GitHub Pages, que aloja la web. Como con cualquier página, GitHub recibe datos técnicos de la conexión, como la dirección IP, y los trata según su propia política de privacidad. La app no envía nada más a nadie.</p>
          <p><strong>Cookies:</strong> no se usan cookies. Solo se guarda en el dispositivo lo imprescindible para que la app funcione (tus datos y alguna preferencia), por lo que no hace falta pedir consentimiento.</p>
          <p><strong>Compartir:</strong> cuando compartes una rutina o un entrenamiento, eres tú quien elige a quién enviarlo. Los enlaces de rutina contienen solo los ejercicios y las cifras, no tus datos personales. La imagen del entrenamiento se genera en tu propio móvil e incluye el nombre del entrenamiento, la fecha, las cifras y los ejercicios.</p>
          <p><strong>Copias y protección:</strong> puedes exportar una copia en Perfil; la app te lo recuerda cada 30 días. Con la app instalada, también le pide al navegador que no borre sus datos para liberar espacio.</p>
          <p><strong>Borrar tus datos:</strong> en Perfil → «Borrar todos los datos», o eliminando la app. Si los borras sin exportar una copia, no se pueden recuperar.</p>
        </Section>

        <Section title="Contenido y licencias" icon={Scale}>
          <p><strong>Ejercicios:</strong> los nombres y su clasificación (músculos, material y nivel) son datos de hecho tomados de la lista abierta <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">Free Exercise DB</a> y traducidos a mano. La app no usa sus fotos ni sus textos.</p>
          <p><strong>Instrucciones e ilustraciones:</strong> los pasos de cada ejercicio, los mapas musculares y las figuras de movimiento son contenido propio de Serix.</p>
          <p><strong>Código de la app:</strong> licencia MIT. Usa React (MIT) y los iconos de Lucide (ISC), cuyos textos completos están en <a href="licenses.txt" target="_blank" rel="noreferrer">licenses.txt</a>.</p>
          <p>Serix es un proyecto personal, gratuito y sin ánimo de lucro, que se ofrece tal cual, sin garantías.</p>
        </Section>

        <Section title="Contacto" icon={Mail}>
          <p>Para dudas, errores o para pedir que se retire algún contenido, abre una incidencia en <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">GitHub</a>.</p>
        </Section>

        <p className="list-footer" style={{ margin: 0 }}>
          <FileText size={13} style={{ verticalAlign: -2 }} /> Versión del {__APP_VERSION__}
        </p>
      </div>
    </>
  )
}
