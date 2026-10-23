import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sendPushToAll } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const shiftId = Number(getRouterParam(event, 'id'))
  if (!shiftId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de turno inválido.' })
  }

  const body = await readBody(event)
  const db = await useDb()

  const shiftRes = await db.execute({
    sql: 'SELECT id, assigned_user_id, original_user_id, status, notes FROM shifts WHERE id = ?',
    args: [shiftId]
  })
  const shift = shiftRes.rows[0]
  if (!shift) {
    throw createError({ statusCode: 404, statusMessage: 'Turno no encontrado.' })
  }

  const isOwner = Number(shift.assigned_user_id) === user.id
  const isAdmin = user.role === 'admin'

  if (!isOwner && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo el encargado del turno o un administrador puede actualizar este turno.'
    })
  }

  let newStatus = String(shift.status)
  if (body?.status && ['pending', 'completed', 'skipped'].includes(body.status)) {
    if (body.status === 'skipped' && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Solo un administrador puede marcar un día como feriado / no laborable.'
      })
    }
    newStatus = body.status
  }

  const newNotes = typeof body?.notes === 'string' ? body.notes.trim() : String(shift.notes || '')

  await db.execute({
    sql: 'UPDATE shifts SET status = ?, notes = ? WHERE id = ?',
    args: [newStatus, newNotes, shiftId]
  })

  if (newStatus === 'completed' && shift.status !== 'completed') {
    try {
      await sendPushToAll({
        title: '☕ ¡El café está listo!',
        body: `${user.display_name} acaba de preparar y marcar listo el café. ¡Pasa por el tuyo!`,
        url: '/'
      })
    } catch (err) {
      console.error('Error enviando notificación de café listo:', err)
    }
  }

  return { ok: true, status: newStatus, notes: newNotes }
})
