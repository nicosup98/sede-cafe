import { requireAdmin } from '../../utils/auth'
import { useDb, hashPin } from '../../utils/db'
import { getUserEquityStats } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  const username = String(body?.username || '').trim().toLowerCase()
  const displayName = String(body?.display_name || '').trim()
  const pin = String(body?.pin || '1234').trim()
  const role = body?.role === 'admin' ? 'admin' : 'user'
  const participatesInCoffee = body?.participates_in_coffee !== false ? 1 : 0

  if (!username || !/^[a-z0-9_.-]+$/.test(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre de usuario solo debe contener letras minúsculas, números, puntos o guiones.'
    })
  }

  if (!displayName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre visible es obligatorio.'
    })
  }

  if (pin.length < 4) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El PIN/contraseña debe tener al menos 4 caracteres.'
    })
  }

  const db = await useDb()
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE LOWER(username) = ?',
    args: [username]
  })
  if (existing.rows.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `El usuario "${username}" ya existe.`
    })
  }

  // Match baseline load of existing active users so a new user isn't overloaded to "catch up" from 0
  let initialAdjustment = 0
  if (typeof body?.manual_balance_adjustment === 'number') {
    initialAdjustment = body.manual_balance_adjustment
  } else {
    const stats = await getUserEquityStats()
    const active = stats.filter(s => s.participates_in_coffee)
    if (active.length > 0) {
      initialAdjustment = Math.min(...active.map(s => s.effective_load))
    }
  }

  const pinHash = hashPin(pin)
  const res = await db.execute({
    sql: `INSERT INTO users (username, display_name, pin_hash, role, participates_in_coffee, manual_balance_adjustment)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    args: [username, displayName, pinHash, role, participatesInCoffee, initialAdjustment]
  })

  return {
    id: Number(res.rows[0].id),
    username,
    display_name: displayName,
    role,
    participates_in_coffee: Boolean(participatesInCoffee),
    manual_balance_adjustment: initialAdjustment
  }
})
