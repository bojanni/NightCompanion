import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './screens/Dashboard'
import AIConfig from './screens/AIConfig'
import Library from './screens/Library'
import Characters from './screens/Characters'
import StyleProfiles from './screens/StyleProfiles'
import Generator from './screens/Generator'
import Gallery from './screens/Gallery'
import Settings from './screens/Settings'
import Usage from './screens/Usage'
import ScreenErrorBoundary from './components/ScreenErrorBoundary'
import type { Screen } from './types'
import { Toaster, toast } from 'sonner'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [screenParams, setScreenParams] = useState<Record<string, unknown> | undefined>(undefined)
  const [nativeWindowFrameEnabled, setNativeWindowFrameEnabled] = useState(false)
  const lastUnexpectedIpcToastAtRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    let active = true

    const loadWindowAppearance = async () => {
      const result = await window.electronAPI.settings.getAiConfigState()
      if (!active || result.error) return

      setNativeWindowFrameEnabled(Boolean(result.data?.nativeWindowFrameEnabled))
    }

    void loadWindowAppearance()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const toastCooldownMs = 2500

    return window.electronAPI.onUnexpectedIpcError((payload) => {
      console.error('[renderer] Unexpected IPC invoke failure', payload)

      const key = `${payload.channel}:${payload.message}`
      const now = Date.now()
      const lastShownAt = lastUnexpectedIpcToastAtRef.current.get(key) ?? 0

      if (now - lastShownAt < toastCooldownMs) {
        return
      }

      lastUnexpectedIpcToastAtRef.current.set(key, now)
      toast.error('Unexpected app error. Please try again.')
    })
  }, [])

  const handleNavigate = (newScreen: Screen, params?: Record<string, unknown>) => {
    setScreen(newScreen)
    setScreenParams(params)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-night-950">
      {/* Drag region for frameless window */}
      {!nativeWindowFrameEnabled && <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />}

      <Sidebar activeScreen={screen} onNavigate={(next) => handleNavigate(next)} />

      <main className="flex-1 overflow-hidden">
        <div className="animate-fade-in h-full">
          {screen === 'dashboard' && (
            <ScreenErrorBoundary screenName="Dashboard">
              <Dashboard onNavigate={handleNavigate} />
            </ScreenErrorBoundary>
          )}
          {screen === 'ai-config' && (
            <ScreenErrorBoundary screenName="AI Config">
              <AIConfig />
            </ScreenErrorBoundary>
          )}
          {screen === 'library' && (
            <ScreenErrorBoundary screenName="Library">
              <Library />
            </ScreenErrorBoundary>
          )}
          {screen === 'characters' && (
            <ScreenErrorBoundary screenName="Characters">
              <Characters />
            </ScreenErrorBoundary>
          )}
          {screen === 'style-profiles' && (
            <ScreenErrorBoundary screenName="Style Profiles">
              <StyleProfiles />
            </ScreenErrorBoundary>
          )}
          {screen === 'generator' && (
            <ScreenErrorBoundary screenName="Generator">
              <Generator />
            </ScreenErrorBoundary>
          )}
          {screen === 'gallery' && (
            <ScreenErrorBoundary screenName="Gallery">
              <Gallery initialImageId={screenParams?.imageId as string | undefined} />
            </ScreenErrorBoundary>
          )}
          {screen === 'usage' && (
            <ScreenErrorBoundary screenName="Usage">
              <Usage />
            </ScreenErrorBoundary>
          )}
          {screen === 'settings' && (
            <ScreenErrorBoundary screenName="Settings">
              <Settings />
            </ScreenErrorBoundary>
          )}
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
