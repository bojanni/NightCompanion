import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const envConnectionString = process.env.DATABASE_URL

if (!envConnectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const connectionString = envConnectionString

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

async function ensureDatabaseExists() {
  const dbName = getDatabaseNameFromUrl(connectionString)
  const adminConnectionString = getAdminConnectionString(connectionString)
  const adminClient = postgres(adminConnectionString, { max: 1 })

  try {
    console.log(`Using database "${dbName}" from DATABASE_URL`)

    const existing = await adminClient`
      SELECT 1
      FROM pg_database
      WHERE datname = ${dbName}
      LIMIT 1
    `

    if (existing.length === 0) {
      console.log(`Database "${dbName}" not found. Creating...`)
      await adminClient.unsafe(`CREATE DATABASE ${quoteIdentifier(dbName)}`)
      console.log(`Database "${dbName}" created.`)
    }
  } finally {
    await adminClient.end()
  }
}

async function runMigrations() {
  await ensureDatabaseExists()

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete.')

  await client.end()
  process.exit(0)
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
