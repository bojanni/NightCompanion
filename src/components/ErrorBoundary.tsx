import React, { type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled UI error caught by root ErrorBoundary', error, errorInfo)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-night-950 px-6 text-center">
          <div>
            <h1 className="text-xl font-semibold text-white">Er ging iets mis</h1>
            <p className="mt-2 text-sm text-night-300">Een onderdeel van de interface is gecrasht.</p>
            <p className="mt-1 text-sm text-night-300">Herstart de app of ververs het scherm.</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}