import { requireUser } from '../../utils/auth'
import { useDb, hashPin, verifyPin } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const currentPin = String(body?.currentPin || '').trim()
  const newPin = String(body?.newPin || '').trim()

  if (!newPin || newPin.length < 4) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nuevo PIN/contraseña debe tener al menos 4 caracteres.'
    })
  }

  const db = await useDb()
  const res = await db.execute({
    sql: 'SELECT pin_hash FROM users WHERE id = ?',
    args: [user.id]
  })

  const row = res.rows[0]
  if (!row || !verifyPin(currentPin, String(row.pin_hash))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tu PIN/contraseña actual no es correcto.'
    })
  }

  const newHash = hashPin(newPin)
  await db.execute({
    sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
    args: [newHash, user.id]
  })

  return { ok: true }
})
