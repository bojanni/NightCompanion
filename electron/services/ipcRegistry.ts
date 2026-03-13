import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../../src/lib/schema'
import { registerPromptsIpc } from '../ipc/prompts'
import { registerStyleProfilesIpc } from '../ipc/styleProfiles'
import { registerGenerationLogIpc } from '../ipc/generationLog'
import { registerNightCafeIpc } from '../ipc/nightcafe'
import { registerCharactersIpc } from '../ipc/characters'
import { registerSettingsIpc, type OpenRouterSettings } from '../ipc/settings'
import { registerAiIpc } from '../ipc/ai'

type Database = ReturnType<typeof drizzle<typeof schema>>

type RegisterIpcHandlersInput = {
  db: Database
  getOpenRouterSettings: () => Promise<OpenRouterSettings>
  getAiApiRequestLoggingEnabled: () => Promise<boolean>
}

export function registerIpcHandlers({ db, getOpenRouterSettings, getAiApiRequestLoggingEnabled }: RegisterIpcHandlersInput) {
  registerPromptsIpc({ db })
  registerStyleProfilesIpc({ db })
  registerGenerationLogIpc({ db })
  registerNightCafeIpc({ db })
  registerCharactersIpc({ db })
  registerSettingsIpc({ db })
  registerAiIpc({ getOpenRouterSettings, getAiApiRequestLoggingEnabled })
}
