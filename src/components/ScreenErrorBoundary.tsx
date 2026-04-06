import React from 'react'

type ScreenErrorBoundaryProps = {
  screenName: string
  children: React.ReactNode
}

type ScreenErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

export default class ScreenErrorBoundary extends React.Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  public constructor(props: ScreenErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  public static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error): void {
    console.error(`[${this.props.screenName}] Render error:`, error)
  }

  private readonly handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-night-950 px-6">
          <div className="card w-full max-w-lg p-6 text-center">
            <h2 className="text-lg font-semibold text-night-100">{this.props.screenName}</h2>
            <p className="mt-2 text-sm text-night-400">Something went wrong while rendering this screen.</p>
            <p className="mt-3 text-sm text-night-400 break-words">{this.state.error?.message ?? 'Unknown error'}</p>
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={this.handleReload} className="btn-primary">
                Reload Screen
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
