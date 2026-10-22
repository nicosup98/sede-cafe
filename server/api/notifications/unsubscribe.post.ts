import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)
  const endpoint = String(body?.endpoint || '').trim()

  if (endpoint) {
    const db = await useDb()
    await db.execute({
      sql: 'DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?',
      args: [endpoint, user.id]
    })
  }

  return { ok: true }
})
