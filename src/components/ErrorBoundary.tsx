import { Component, type ReactNode } from 'react'
import { t } from '../lib/i18n'
import { exportBackup } from '../lib/protect'
import { navigate } from '../lib/router'
import { FeedbackSheet } from './Feedback'

// Si una pantalla falla, en vez de dejar la app en blanco se enseña cómo salir: volver a Inicio,
// recargar, guardar una copia de los datos (que no se han perdido) o contar el fallo.
// Al cambiar de pantalla (resetKey) se vuelve a intentar.

interface Props { resetKey: string; children: ReactNode }
interface State { error?: Error; key: string; report?: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { key: props.resetKey, error: undefined } : null
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // Tras publicar una versión, una pantalla aún no descargada puede no existir ya: con recargar basta.
    const chunk = /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(error.message)
    return (
      <div className="screen rescue" role="alert">
        <h1>{t('Algo ha fallado en esta pantalla', 'Something went wrong on this screen')}</h1>
        <p className="muted">
          {chunk
            ? t('No se pudo cargar. Puede que haya una versión nueva o que no tengas conexión: recarga la app.', 'It could not load. There may be a new version or no connection: reload the app.')
            : t('Tus datos están a salvo: solo ha fallado esta pantalla. Prueba a volver a Inicio o a recargar.', 'Your data is safe: only this screen failed. Try going back Home or reloading.')}
        </p>
        <button className="btn primary" onClick={() => location.reload()}>{t('Recargar la app', 'Reload the app')}</button>
        <button className="btn secondary" onClick={() => { this.setState({ error: undefined }); navigate('home') }}>{t('Volver a Inicio', 'Back to Home')}</button>
        <button className="btn secondary" onClick={() => void exportBackup()}>{t('Guardar una copia de mis datos', 'Save a copy of my data')}</button>
        <button className="btn plain" onClick={() => this.setState({ report: true })}>{t('Contar el fallo', 'Report the bug')}</button>
        {this.state.report && (
          <FeedbackSheet kind="bug" onClose={() => this.setState({ report: false })}
            initial={`${t('La pantalla se quedó con «Algo ha fallado».', 'The screen showed "Something went wrong".')}\n${t('Error', 'Error')}: ${error.message.slice(0, 300)}\n${t('Pantalla', 'Screen')}: ${location.hash || '#/'}`} />
        )}
      </div>
    )
  }
}
