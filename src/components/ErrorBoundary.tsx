import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  temErro: boolean
  mensagem: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { temErro: false, mensagem: '' }

  static getDerivedStateFromError(error: Error): State {
    return { temErro: true, mensagem: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.temErro) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
          <div className="max-w-sm w-full card p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-status-cancelado flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink text-lg">Algo deu errado</h1>
              <p className="text-sm text-ink-soft mt-1">
                O sistema encontrou um erro inesperado. Você pode tentar recarregar a página.
              </p>
            </div>
            <button className="btn-primary w-full" onClick={() => window.location.reload()}>
              Recarregar sistema
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
