import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Library from './screens/Library'
import StyleProfiles from './screens/StyleProfiles'
import GenerationLog from './screens/GenerationLog'
import PromptBuilder from './screens/PromptBuilder'
import Generator from './screens/Generator'
import Settings from './screens/Settings'
import type { Screen } from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('library')

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-night-950">
      {/* Drag region for frameless window */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />

      <Sidebar activeScreen={screen} onNavigate={setScreen} />

      <main className="flex-1 overflow-hidden">
        <div className="animate-fade-in h-full">
          {screen === 'library' && <Library />}
          {screen === 'style-profiles' && <StyleProfiles />}
          {screen === 'generation-log' && <GenerationLog />}
          {screen === 'prompt-builder' && <PromptBuilder />}
          {screen === 'generator' && <Generator />}
          {screen === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  )
}
