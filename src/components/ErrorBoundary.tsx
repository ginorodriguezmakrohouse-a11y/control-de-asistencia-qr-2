import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita la "pantalla en blanco": si algo revienta durante el render,
 * mostramos el error en pantalla en vez de un root vacío.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary capturó un error de render:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-500/40 bg-red-500/10 p-6 space-y-3">
            <h1 className="text-lg font-bold text-red-300">
              Ocurrió un error al mostrar la aplicación
            </h1>
            <p className="text-sm text-slate-300">
              La página no quedó en blanco gracias al detector de errores. Este es el problema:
            </p>
            <pre className="text-xs bg-slate-900/80 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap text-red-200">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack?.split('\n').slice(0, 6).join('\n')}
            </pre>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
              >
                Reintentar
              </button>
              <a
                href={window.location.pathname}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Abrir modo local (sin Supabase)
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
