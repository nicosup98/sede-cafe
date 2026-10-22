import { requireAdmin } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const currentAdmin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido.' })
  }

  if (id === currentAdmin.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No puedes eliminar tu propio usuario administrador.'
    })
  }

  const db = await useDb()
  const shiftsCheck = await db.execute({
    sql: 'SELECT COUNT(*) as c FROM shifts WHERE assigned_user_id = ? OR original_user_id = ?',
    args: [id, id]
  })

  if (Number(shiftsCheck.rows[0]?.c ?? 0) > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Este usuario ya tiene turnos registrados en el historial. En lugar de eliminarlo, desactívalo de la lista de hacer café para conservar el historial de equidad.'
    })
  }

  await db.execute({
    sql: 'DELETE FROM swap_requests WHERE requester_user_id = ? OR target_user_id = ?',
    args: [id, id]
  })

  await db.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [id]
  })

  return { ok: true }
})
