import { FileText, HeartPulse, Lock, Mail, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, NavBar } from '../components/ui'
import { lang, t } from '../lib/i18n'

export const REPO_URL = 'https://github.com/SrRaiimon/serix'

/** Aviso de salud: corto y discreto en el cuestionario inicial, como texto normal en Legal. */
export function HealthNotice({ plain = false }: { plain?: boolean }) {
  return (
    <p className={plain ? undefined : 'small muted'} style={plain ? undefined : { margin: 0 }}>
      {lang() === 'en' ? (
        <>
          Serix gives general guidance and <strong>is not a substitute for a health or fitness
          professional</strong>. If you have an injury, an illness or any doubts, get advice before you start. You
          train at your own risk: stop if you feel pain, dizziness or discomfort.
        </>
      ) : (
        <>
          Serix da orientaciones generales y <strong>no sustituye a un profesional</strong> de la salud o del
          entrenamiento. Si tienes una lesión, una enfermedad o dudas, consulta antes de empezar. Entrenas bajo tu
          responsabilidad: para si notas dolor, mareo o molestias.
        </>
      )}
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
      <NavBar showBack title={t('Legal y privacidad', 'Legal and privacy')} />
      <div className="screen with-nav">
        {lang() === 'en' ? <LegalEn /> : <LegalEs />}
        <p className="list-footer" style={{ margin: 0 }}>
          <FileText size={13} style={{ verticalAlign: -2 }} /> {t('Versión', 'Version')} {__APP_VERSION__}
        </p>
      </div>
    </>
  )
}

const FEDB = <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">Free Exercise DB</a>
const LICENSES = <a href="licenses.txt" target="_blank" rel="noreferrer">licenses.txt</a>
const ISSUES = <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">GitHub</a>

function LegalEs() {
  return (
    <>
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
        <p><strong>Pasar datos a otro móvil:</strong> los datos viajan en códigos QR de una pantalla a la cámara del otro móvil, sin internet ni servidores. La cámara solo se usa mientras está abierta la pantalla de recibir, y la imagen se analiza en el propio móvil: no se guarda ni se envía a ninguna parte.</p>
        <p><strong>Borrar tus datos:</strong> en Perfil → «Borrar todos los datos», o eliminando la app. Si los borras sin exportar una copia, no se pueden recuperar.</p>
      </Section>

      <Section title="Contenido y licencias" icon={Scale}>
        <p><strong>Ejercicios:</strong> los nombres y su clasificación (músculos, material y nivel) son datos de hecho tomados de la lista abierta {FEDB} y traducidos a mano. La app no usa sus fotos ni sus textos.</p>
        <p><strong>Instrucciones e ilustraciones:</strong> los pasos de cada ejercicio (en español y su traducción al inglés), los mapas musculares y las figuras de movimiento son contenido propio de Serix.</p>
        <p><strong>Código de la app:</strong> licencia MIT. Usa React (MIT), los iconos de Lucide (ISC), qrcode-generator (MIT) para crear códigos QR y jsQR (Apache 2.0, con partes de ZXing) para leerlos con la cámara, cuyos textos completos están en {LICENSES}.</p>
        <p>Serix es un proyecto personal, gratuito y sin ánimo de lucro, que se ofrece tal cual, sin garantías.</p>
      </Section>

      <Section title="Contacto" icon={Mail}>
        <p>Para dudas, errores o para pedir que se retire algún contenido, abre una incidencia en {ISSUES}.</p>
      </Section>
    </>
  )
}

function LegalEn() {
  return (
    <>
      <Section title="Your health" icon={HeartPulse}>
        <HealthNotice plain />
        <p>
          Routines are generated automatically from your answers and weight suggestions are only a guide. Always
          adjust the load to how you feel and look after your technique.
        </p>
      </Section>

      <Section title="Privacy" icon={Lock}>
        <p><strong>Your data stays on your phone.</strong> Routines, workouts, body measurements and settings are stored only in this browser's or app's storage. There are no accounts, no server of our own, no analytics and no ads, and nobody else can see them.</p>
        <p><strong>What leaves your phone:</strong> when you open the app, the browser downloads its files from GitHub Pages, which hosts the site. As with any web page, GitHub receives technical connection data such as your IP address and handles it under its own privacy policy. The app sends nothing else to anyone.</p>
        <p><strong>Cookies:</strong> no cookies are used. Only what the app needs to work (your data and a few preferences) is stored on the device, so no consent is required.</p>
        <p><strong>Sharing:</strong> when you share a routine or a workout, you choose who to send it to. Routine links contain only the exercises and the numbers, not your personal data. The workout image is created on your own phone and includes the workout name, date, numbers and exercises.</p>
        <p><strong>Backups and protection:</strong> you can export a backup in Profile; the app reminds you every 30 days. When installed, the app also asks the browser not to delete its data to free up space.</p>
        <p><strong>Moving data to another phone:</strong> the data travels in QR codes from one screen to the other phone's camera, with no internet or servers. The camera is only used while the receive screen is open, and the image is analysed on the phone itself: it is neither stored nor sent anywhere.</p>
        <p><strong>Deleting your data:</strong> in Profile → “Delete all data”, or by removing the app. If you delete it without exporting a backup, it cannot be recovered.</p>
      </Section>

      <Section title="Content and licences" icon={Scale}>
        <p><strong>Exercises:</strong> the names and their classification (muscles, equipment and level) are factual data taken from the open list {FEDB}; the English names are the list's own. The app does not use its photos or texts.</p>
        <p><strong>Instructions and illustrations:</strong> the steps for each exercise (written in Spanish and translated into English), the muscle maps and the movement figures are Serix's own content.</p>
        <p><strong>App code:</strong> MIT licence. It uses React (MIT), Lucide icons (ISC), qrcode-generator (MIT) to create QR codes and jsQR (Apache 2.0, with parts from ZXing) to read them with the camera; their full texts are in {LICENSES}.</p>
        <p>Serix is a personal, free and non-profit project, provided as is, without warranty.</p>
      </Section>

      <Section title="Contact" icon={Mail}>
        <p>For questions, bugs or to request that any content be removed, open an issue on {ISSUES}.</p>
      </Section>
    </>
  )
}
