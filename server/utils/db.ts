import { createClient, type Client } from '@libsql/client'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

let _client: Client | null = null
let _initialized = false

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedBuffer = scryptSync(pin, salt, 64)
  return timingSafeEqual(keyBuffer, derivedBuffer)
}

export function getDbClient(): Client {
  if (_client) return _client

  let url = 'file:./data/sede-cafe.db'
  let authToken: string | undefined = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined

  try {
    const config = useRuntimeConfig()
    url = config.tursoDatabaseUrl || process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || url
    authToken = config.tursoAuthToken || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || authToken
  } catch {
    url = process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || url
    authToken = process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || authToken
  }

  if (url.startsWith('file:')) {
    const filePath = url.replace(/^file:/, '')
    const absPath = resolve(process.cwd(), filePath)
    try {
      mkdirSync(dirname(absPath), { recursive: true })
    } catch {
      // Ignore if directory already exists or read-only environment
    }
  }

  _client = createClient({
    url,
    authToken: authToken || undefined
  })

  return _client
}

export async function useDb(): Promise<Client> {
  const db = getDbClient()
  if (!_initialized) {
    await initSchema(db)
    _initialized = true
  }
  return db
}

async function initSchema(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      participates_in_coffee INTEGER NOT NULL DEFAULT 1,
      manual_balance_adjustment INTEGER NOT NULL DEFAULT 0,
      avatar_palette TEXT DEFAULT '["#5c4033","#8b5a2b","#cd853f","#d2b48c","#deb887"]',
      avatar_variant TEXT DEFAULT 'beam',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT UNIQUE NOT NULL,
      week_end TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
      shift_date TEXT UNIQUE NOT NULL,
      day_of_week INTEGER NOT NULL,
      original_user_id INTEGER NOT NULL REFERENCES users(id),
      assigned_user_id INTEGER NOT NULL REFERENCES users(id),
      covered_by_swap_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS swap_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'cover',
      shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      target_shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
      requester_user_id INTEGER NOT NULL REFERENCES users(id),
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT DEFAULT '',
      resolved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coffee_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating REAL NOT NULL,
      comment TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(shift_id, reviewer_user_id)
    );
  `)

  // Safe migrations for newly added tables & columns
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS coffee_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating REAL NOT NULL,
        comment TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(shift_id, reviewer_user_id)
      )
    `)
  } catch {
    // Table already exists
  }
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_coffee_reviews_shift ON coffee_reviews(shift_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_coffee_reviews_target_user ON coffee_reviews(target_user_id)`)
  } catch {
    // Indexes already exist
  }

  // Safe migrations for newly added columns
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN avatar_palette TEXT DEFAULT '["#5c4033","#8b5a2b","#cd853f","#d2b48c","#deb887"]'`)
  } catch {
    // Column already exists
  }
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN avatar_variant TEXT DEFAULT 'beam'`)
  } catch {
    // Column already exists
  }

  // Seed default users if database is empty
  const existing = await db.execute('SELECT COUNT(*) as count FROM users')
  const count = Number(existing.rows[0]?.count ?? 0)

  if (count === 0) {
    const defaultPinHash = hashPin('1234')
    const seedUsers = [
      { username: 'admin', displayName: 'Admin Principal', role: 'admin' },
      { username: 'carlos', displayName: 'Carlos Méndez', role: 'user' },
      { username: 'maria', displayName: 'María Fernanda', role: 'user' },
      { username: 'jose', displayName: 'José Rodríguez', role: 'user' },
      { username: 'ana', displayName: 'Ana Martínez', role: 'user' }
    ]

    for (const u of seedUsers) {
      await db.execute({
        sql: `INSERT INTO users (username, display_name, pin_hash, role, participates_in_coffee, manual_balance_adjustment)
              VALUES (?, ?, ?, ?, 1, 0)`,
        args: [u.username, u.displayName, defaultPinHash, u.role]
      })
    }
  }
}
