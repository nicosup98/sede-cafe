import { requireAdmin } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const shiftId = Number(getRouterParam(event, 'id'))

  if (!shiftId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de turno inválido.' })
  }

  const db = await useDb()

  await db.execute({
    sql: 'DELETE FROM swap_requests WHERE shift_id = ? OR target_shift_id = ?',
    args: [shiftId, shiftId]
  })

  await db.execute({
    sql: 'DELETE FROM shifts WHERE id = ?',
    args: [shiftId]
  })

  return { ok: true }
})
