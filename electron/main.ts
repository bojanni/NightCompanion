import 'dotenv/config'
import { app, BrowserWindow, dialog, shell } from 'electron'
import path from 'path'
import { mkdirSync } from 'fs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../src/lib/schema'
import { registerPromptsIpc } from './ipc/prompts'
import { registerStyleProfilesIpc } from './ipc/styleProfiles'
import { registerGenerationLogIpc } from './ipc/generationLog'
import { registerNightCafeIpc } from './ipc/nightcafe'
import { registerCharactersIpc } from './ipc/characters'
import { getAiApiRequestLoggingEnabled, getOpenRouterSettings, registerSettingsIpc } from './ipc/settings'
import { registerAiIpc } from './ipc/ai'
import { syncNightCafeData } from './services/nightcafeSync'

const sessionDataPath = path.join(app.getPath('temp'), 'NightCompanion', 'session-data')
try {
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
} catch (error) {
  console.warn('Could not set custom sessionData path:', error)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set — create a .env file from .env.example')
  app.quit()
  process.exit(1)
}

const queryClient = postgres(connectionString)
const db = drizzle(queryClient, { schema })

async function runMigrations() {
  const migrateClient = postgres(connectionString!, { max: 1 })
  const migrateDb = drizzle(migrateClient)
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(app.getAppPath(), 'drizzle')

  await migrate(migrateDb, { migrationsFolder })
  await migrateClient.end()
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function getDatabaseNameFromUrl(connectionUrl: string) {
  const parsed = new URL(connectionUrl)
  const dbName = parsed.pathname.replace(/^\//, '')

  if (!dbName) {
    throw new Error('DATABASE_URL must include a database name in the path')
  }

  return dbName
}

function getAdminConnectionString(connectionUrl: string) {
  const parsed = new URL(connectionUrl)
  parsed.pathname = '/postgres'
  return parsed.toString()
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function isPostgresUnavailableError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? String((error as { code?: string }).code) : ''
  return code === 'CONNECTION_REFUSED' || code === 'CONNECT_TIMEOUT' || code === 'ECONNREFUSED'
}

async function ensurePostgresAndDatabase() {
  const dbName = getDatabaseNameFromUrl(connectionString!)
  const adminConnectionString = getAdminConnectionString(connectionString!)
  const adminClient = postgres(adminConnectionString, { max: 1, connect_timeout: 5 })

  try {
    await adminClient`SELECT 1`

    const existing = await adminClient`
      SELECT 1
      FROM pg_database
      WHERE datname = ${dbName}
      LIMIT 1
    `

    if (existing.length > 0) {
      console.log(`Database "${dbName}" exists.`)
      return
    }

    console.log(`Database "${dbName}" not found. Creating...`)
    await adminClient.unsafe(`CREATE DATABASE ${quoteIdentifier(dbName)}`)
    console.log(`Database "${dbName}" created.`)
  } catch (error) {
    if (isPostgresUnavailableError(error)) {
      throw new Error(`PostgreSQL is not running or unreachable. Start PostgreSQL and retry. (${toErrorMessage(error)})`)
    }

    throw error
  } finally {
    await adminClient.end()
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#050810',
    titleBarStyle: 'hiddenInset',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5187')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function registerIpcHandlers() {
  registerPromptsIpc({ db })
  registerStyleProfilesIpc({ db })
  registerGenerationLogIpc({ db })
  registerNightCafeIpc({ db })
  registerCharactersIpc({ db })
  registerSettingsIpc({ db })
  registerAiIpc({ getOpenRouterSettings, getAiApiRequestLoggingEnabled })
}

app.whenReady().then(async () => {
  try {
    await ensurePostgresAndDatabase()
    await runMigrations()
    console.log('Database ready.')
  } catch (err) {
    const errorMessage = toErrorMessage(err)
    console.error('Startup database check failed:', err)
    dialog.showErrorBox(
      'NightCompanion startup error',
      `Database startup check failed.\n\n${errorMessage}\n\nIf PostgreSQL is running, verify DATABASE_URL and user permissions.`
    )
    app.quit()
    process.exit(1)
    return
  }

  try {
    await syncNightCafeData({ db })
  } catch (err) {
    console.error('Failed to sync NightCafe data:', err)
  }

  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await queryClient.end()
  if (process.platform !== 'darwin') app.quit()
})
