import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sendPushToUser } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const shiftId = Number(body?.shift_id)
  const targetUserId = Number(body?.target_user_id)
  const type = body?.type === 'swap' ? 'swap' : 'cover'
  const targetShiftId = body?.target_shift_id ? Number(body.target_shift_id) : null
  const reason = String(body?.reason || '').trim()
  const forceByAdmin = Boolean(body?.force_by_admin) && user.role === 'admin'

  if (!shiftId || !targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes seleccionar el turno y el compañero.'
    })
  }

  const db = await useDb()

  // Fetch the source shift
  const shiftRes = await db.execute({
    sql: 'SELECT id, assigned_user_id, status, shift_date FROM shifts WHERE id = ?',
    args: [shiftId]
  })
  const shift = shiftRes.rows[0]
  if (!shift) {
    throw createError({ statusCode: 404, statusMessage: 'El turno seleccionado no existe.' })
  }

  const shiftOwnerId = Number(shift.assigned_user_id)

  // Only the owner of the shift or an admin can initiate a cover/swap for this shift
  if (shiftOwnerId !== user.id && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo el encargado actual de este turno o un administrador puede solicitar un cambio.'
    })
  }

  if (shiftOwnerId === targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La persona seleccionada ya está asignada a este turno.'
    })
  }

  if (type === 'swap') {
    if (!targetShiftId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Para un trueque de días debes elegir también el turno del otro compañero.'
      })
    }
    const targetShiftRes = await db.execute({
      sql: 'SELECT id, assigned_user_id FROM shifts WHERE id = ?',
      args: [targetShiftId]
    })
    const targetShift = targetShiftRes.rows[0]
    if (!targetShift || Number(targetShift.assigned_user_id) !== targetUserId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El turno destino no pertenece al compañero seleccionado.'
      })
    }
  }

  // Cancel any existing pending request for this same shift
  await db.execute({
    sql: "UPDATE swap_requests SET status = 'cancelled', resolved_at = datetime('now') WHERE shift_id = ? AND status = 'pending'",
    args: [shiftId]
  })

  if (forceByAdmin) {
    // Admin executes the change immediately without waiting for approval
    const insertRes = await db.execute({
      sql: `INSERT INTO swap_requests
            (type, shift_id, target_shift_id, requester_user_id, target_user_id, status, reason, resolved_by_user_id, resolved_at)
            VALUES (?, ?, ?, ?, ?, 'admin_forced', ?, ?, datetime('now'))
            RETURNING id`,
      args: [type, shiftId, targetShiftId, shiftOwnerId, targetUserId, reason || 'Asignado directamente por Admin', user.id]
    })
    const swapId = Number(insertRes.rows[0].id)

    await db.execute({
      sql: 'UPDATE shifts SET assigned_user_id = ?, covered_by_swap_id = ? WHERE id = ?',
      args: [targetUserId, swapId, shiftId]
    })

    if (type === 'swap' && targetShiftId) {
      await db.execute({
        sql: 'UPDATE shifts SET assigned_user_id = ?, covered_by_swap_id = ? WHERE id = ?',
        args: [shiftOwnerId, swapId, targetShiftId]
      })
    }

    return { ok: true, status: 'admin_forced', id: swapId }
  }

  // Standard flow: create pending request waiting for target_user_id (or admin) approval
  const insertRes = await db.execute({
    sql: `INSERT INTO swap_requests
          (type, shift_id, target_shift_id, requester_user_id, target_user_id, status, reason)
          VALUES (?, ?, ?, ?, ?, 'pending', ?)
          RETURNING id`,
    args: [type, shiftId, targetShiftId, shiftOwnerId, targetUserId, reason]
  })

  sendPushToUser(targetUserId, {
    title: '🔄 Solicitud de cambio de café',
    body: `${user.display_name} te ha enviado una solicitud para ${type === 'cover' ? 'cubrir su turno' : 'intercambiar un turno'} de café.`,
    url: '/?tab=swaps'
  }).catch(() => {})

  return {
    ok: true,
    status: 'pending',
    id: Number(insertRes.rows[0].id)
  }
})
