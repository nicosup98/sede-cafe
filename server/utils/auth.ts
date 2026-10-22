import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'
import { useDb } from './db'

export interface SessionUser {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'user'
  participates_in_coffee: boolean
  manual_balance_adjustment: number
  avatar_palette?: string[]
  avatar_variant?: string
}

const COOKIE_NAME = 'sede_cafe_session'

function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${hmac}`
}

function verifyPayload(token: string, secret: string): string | null {
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null
  const payload = token.slice(0, lastDot)
  const signature = token.slice(lastDot + 1)
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  if (signature !== expected) return null
  return payload
}

function getSessionSecret(): string {
  try {
    const config = useRuntimeConfig()
    return config.sessionSecret || process.env.SESSION_SECRET || 'sede-cafe-super-secret-key-2026'
  } catch {
    return process.env.SESSION_SECRET || 'sede-cafe-super-secret-key-2026'
  }
}

export function setAuthSession(event: H3Event, userId: number) {
  const secret = getSessionSecret()
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url')
  const token = signPayload(payload, secret)

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

export function clearAuthSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, {
    path: '/'
  })
}

export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  const secret = getSessionSecret()
  const payloadStr = verifyPayload(token, secret)
  if (!payloadStr) return null

  try {
    const data = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'))
    if (!data.userId || (data.exp && Date.now() > data.exp)) {
      return null
    }

    const db = await useDb()
    const res = await db.execute({
      sql: 'SELECT id, username, display_name, role, participates_in_coffee, manual_balance_adjustment, avatar_palette, avatar_variant FROM users WHERE id = ?',
      args: [data.userId]
    })

    const row = res.rows[0]
    if (!row) return null

    let palette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.avatar_palette) {
      try {
        const parsed = JSON.parse(String(row.avatar_palette))
        if (Array.isArray(parsed) && parsed.length > 0) palette = parsed
      } catch {}
    }

    return {
      id: Number(row.id),
      username: String(row.username),
      display_name: String(row.display_name),
      role: (row.role === 'admin' ? 'admin' : 'user'),
      participates_in_coffee: Boolean(Number(row.participates_in_coffee)),
      manual_balance_adjustment: Number(row.manual_balance_adjustment ?? 0),
      avatar_palette: palette,
      avatar_variant: (row.avatar_variant ? String(row.avatar_variant) : 'beam')
    }
  } catch {
    return null
  }
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Debes iniciar sesión para realizar esta acción.'
    })
  }
  return user
}

export async function requireAdmin(event: H3Event): Promise<SessionUser> {
  const user = await requireUser(event)
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo un administrador puede realizar esta acción.'
    })
  }
  return user
}
