import { Component } from 'react'
import ErrorReportPrompt from './ErrorReportPrompt'

function ErrorFallback({ message, stack, onGoHome }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#000000] text-zinc-100">
      <div className="max-w-md w-full text-center rounded-2xl border border-zinc-800 bg-[#121218] p-8">
        <p className="text-5xl font-semibold text-zinc-700 tracking-tight">Error</p>
        <h1 className="mt-4 text-lg font-semibold text-zinc-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed break-words">{message}</p>
        <p className="mt-2 text-xs text-zinc-600">Go home or reload. Data on this device is usually still safe.</p>
        <ErrorReportPrompt
          message={message}
          context="error-boundary"
          stack={stack}
          className="text-left"
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onGoHome} className="h-10 px-5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200">
            Go home
          </button>
          <button type="button" onClick={() => window.location.reload()} className="h-10 px-5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800">
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '', stack: '', retried: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong' }
  }

  componentDidCatch(error, info) {
    console.error('Clips error boundary', error, info)
    this.setState({ stack: info?.componentStack || error?.stack || '' })
  }

  goHome = () => {
    try {
      this.setState({ hasError: false, message: '', stack: '' })
      window.location.href = '/'
    } catch {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.message}
          stack={this.state.stack}
          onGoHome={this.goHome}
        />
      )
    }
    return this.props.children
  }
}
