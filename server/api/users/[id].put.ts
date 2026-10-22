import { requireAdmin } from '../../utils/auth'
import { useDb, hashPin } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido.' })
  }

  const body = await readBody(event)
  const db = await useDb()

  const userRes = await db.execute({
    sql: 'SELECT id, username, display_name, role, participates_in_coffee, manual_balance_adjustment FROM users WHERE id = ?',
    args: [id]
  })
  const targetUser = userRes.rows[0]
  if (!targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  const newRole = body?.role ? (body.role === 'admin' ? 'admin' : 'user') : String(targetUser.role)

  // Prevent demoting the last admin
  if (targetUser.role === 'admin' && newRole !== 'admin') {
    const adminCountRes = await db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")
    const adminCount = Number(adminCountRes.rows[0]?.c ?? 0)
    if (adminCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No puedes quitar el permiso de administrador al único administrador del sistema.'
      })
    }
  }

  const newUsername = body?.username ? String(body.username).trim().toLowerCase() : String(targetUser.username)
  const newDisplayName = body?.display_name ? String(body.display_name).trim() : String(targetUser.display_name)
  const newParticipates = typeof body?.participates_in_coffee === 'boolean'
    ? (body.participates_in_coffee ? 1 : 0)
    : Number(targetUser.participates_in_coffee)
  const newAdjustment = typeof body?.manual_balance_adjustment === 'number'
    ? Number(body.manual_balance_adjustment)
    : Number(targetUser.manual_balance_adjustment)

  await db.execute({
    sql: `UPDATE users
          SET username = ?, display_name = ?, role = ?, participates_in_coffee = ?, manual_balance_adjustment = ?
          WHERE id = ?`,
    args: [newUsername, newDisplayName, newRole, newParticipates, newAdjustment, id]
  })

  if (body?.pin && String(body.pin).trim().length >= 4) {
    const newPinHash = hashPin(String(body.pin).trim())
    await db.execute({
      sql: 'UPDATE users SET pin_hash = ? WHERE id = ?',
      args: [newPinHash, id]
    })
  }

  return { ok: true }
})
