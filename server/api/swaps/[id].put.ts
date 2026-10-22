import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sendPushToUser } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const swapId = Number(getRouterParam(event, 'id'))
  if (!swapId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de solicitud inválido.' })
  }

  const body = await readBody(event)
  const action = String(body?.action || '') // 'accept' | 'reject' | 'cancel'

  if (!['accept', 'reject', 'cancel'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Acción inválida.' })
  }

  const db = await useDb()
  const reqRes = await db.execute({
    sql: 'SELECT * FROM swap_requests WHERE id = ?',
    args: [swapId]
  })

  const swap = reqRes.rows[0]
  if (!swap) {
    throw createError({ statusCode: 404, statusMessage: 'Solicitud no encontrada.' })
  }

  if (swap.status !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Esta solicitud ya fue procesada anteriormente.'
    })
  }

  const requesterId = Number(swap.requester_user_id)
  const targetId = Number(swap.target_user_id)
  const isAdmin = user.role === 'admin'

  if (action === 'cancel') {
    if (user.id !== requesterId && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Solo quien creó la solicitud o un administrador puede cancelarla.'
      })
    }
    await db.execute({
      sql: "UPDATE swap_requests SET status = 'cancelled', resolved_by_user_id = ?, resolved_at = datetime('now') WHERE id = ?",
      args: [user.id, swapId]
    })
    return { ok: true, status: 'cancelled' }
  }

  if (action === 'reject') {
    if (user.id !== targetId && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Solo el destinatario de la solicitud o un administrador puede rechazarla.'
      })
    }
    await db.execute({
      sql: "UPDATE swap_requests SET status = 'rejected', resolved_by_user_id = ?, resolved_at = datetime('now') WHERE id = ?",
      args: [user.id, swapId]
    })
    return { ok: true, status: 'rejected' }
  }

  // action === 'accept'
  // Can be accepted by the target user (mutual agreement: requester asked, target accepted) OR by an admin
  if (user.id !== targetId && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'El intercambio solo se puede aprobar si ambas partes están de acuerdo (aceptado por el compañero) o si lo aprueba un administrador.'
    })
  }

  const finalStatus = user.id === targetId ? 'accepted' : 'admin_forced'
  const shiftId = Number(swap.shift_id)
  const targetShiftId = swap.target_shift_id ? Number(swap.target_shift_id) : null
  const swapType = String(swap.type)

  await db.execute({
    sql: "UPDATE swap_requests SET status = ?, resolved_by_user_id = ?, resolved_at = datetime('now') WHERE id = ?",
    args: [finalStatus, user.id, swapId]
  })

  await db.execute({
    sql: 'UPDATE shifts SET assigned_user_id = ?, covered_by_swap_id = ? WHERE id = ?',
    args: [targetId, swapId, shiftId]
  })

  if (swapType === 'swap' && targetShiftId) {
    await db.execute({
      sql: 'UPDATE shifts SET assigned_user_id = ?, covered_by_swap_id = ? WHERE id = ?',
      args: [requesterId, swapId, targetShiftId]
    })
  }

  sendPushToUser(requesterId, {
    title: '✅ Cambio de turno aceptado',
    body: `${user.display_name} ha aceptado el cambio de turno. El calendario ha sido actualizado.`,
    url: '/'
  }).catch(() => {})

  return { ok: true, status: finalStatus }
})
