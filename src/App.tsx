import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './screens/Dashboard'
import AIConfig from './screens/AIConfig'
import Library from './screens/Library'
import Characters from './screens/Characters'
import StyleProfiles from './screens/StyleProfiles'
import GenerationLog from './screens/GenerationLog'
import Generator from './screens/Generator'
import Settings from './screens/Settings'
import type { Screen } from './types'
import { Toaster, toast } from 'sonner'

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [nativeWindowFrameEnabled, setNativeWindowFrameEnabled] = useState(false)

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
    return window.electronAPI.onUnexpectedIpcError((payload) => {
      console.error('[renderer] Unexpected IPC invoke failure', payload)
      toast.error('Unexpected app error. Please try again.')
    })
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-night-950">
      {/* Drag region for frameless window */}
      {!nativeWindowFrameEnabled && <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />}

      <Sidebar activeScreen={screen} onNavigate={setScreen} />

      <main className="flex-1 overflow-hidden">
        <div className="animate-fade-in h-full">
          {screen === 'dashboard' && <Dashboard onNavigate={setScreen} />}
          {screen === 'ai-config' && <AIConfig />}
          {screen === 'library' && <Library />}
          {screen === 'characters' && <Characters />}
          {screen === 'style-profiles' && <StyleProfiles />}
          {screen === 'generation-log' && <GenerationLog />}
          {screen === 'generator' && <Generator />}
          {screen === 'settings' && <Settings />}
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}
