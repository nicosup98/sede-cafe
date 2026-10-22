import { useDb, verifyPin } from '../../utils/db'
import { setAuthSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const username = String(body?.username || '').trim().toLowerCase()
  const pin = String(body?.pin || '').trim()

  if (!username || !pin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ingresa tu usuario y PIN/contraseña.'
    })
  }

  const db = await useDb()
  const res = await db.execute({
    sql: 'SELECT id, username, display_name, pin_hash, role, participates_in_coffee, manual_balance_adjustment FROM users WHERE LOWER(username) = ?',
    args: [username]
  })

  const user = res.rows[0]
  if (!user || !verifyPin(pin, String(user.pin_hash))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuario o PIN incorrecto.'
    })
  }

  const userId = Number(user.id)
  setAuthSession(event, userId)

  return {
    user: {
      id: userId,
      username: String(user.username),
      display_name: String(user.display_name),
      role: user.role === 'admin' ? 'admin' : 'user',
      participates_in_coffee: Boolean(Number(user.participates_in_coffee)),
      manual_balance_adjustment: Number(user.manual_balance_adjustment ?? 0)
    }
  }
})
