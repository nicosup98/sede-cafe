import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const endpoint = String(body?.endpoint || '').trim()
  const p256dh = String(body?.keys?.p256dh || '').trim()
  const auth = String(body?.keys?.auth || '').trim()

  if (!endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Datos de suscripción push inválidos.'
    })
  }

  const db = await useDb()

  // Upsert subscription
  const existing = await db.execute({
    sql: 'SELECT id FROM push_subscriptions WHERE endpoint = ?',
    args: [endpoint]
  })

  if (existing.rows.length > 0) {
    await db.execute({
      sql: 'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE endpoint = ?',
      args: [user.id, p256dh, auth, endpoint]
    })
  } else {
    await db.execute({
      sql: 'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      args: [user.id, endpoint, p256dh, auth]
    })
  }

  return { ok: true }
})
