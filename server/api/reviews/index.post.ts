import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sendPushToUser } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  const shiftId = Number(body?.shift_id)
  if (!shiftId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de turno inválido.' })
  }

  let rating = Number(body?.rating)
  if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La puntuación debe ser entre 0.5 y 5.0 estrellas.'
    })
  }

  // Round to nearest 0.5
  rating = Math.round(rating * 2) / 2
  const comment = String(body?.comment || '').trim()

  const db = await useDb()

  // Verify shift exists and is completed
  const shiftRes = await db.execute({
    sql: 'SELECT id, assigned_user_id, status, shift_date FROM shifts WHERE id = ?',
    args: [shiftId]
  })

  const shift = shiftRes.rows[0]
  if (!shift) {
    throw createError({ statusCode: 404, statusMessage: 'Turno no encontrado.' })
  }

  if (shift.status !== 'completed') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo puedes calificar un turno de café una vez que ha sido marcado como listo.'
    })
  }

  const baristaId = Number(shift.assigned_user_id)
  if (baristaId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No puedes calificar tu propio café.'
    })
  }

  // Upsert review
  await db.execute({
    sql: `
      INSERT INTO coffee_reviews (shift_id, target_user_id, reviewer_user_id, rating, comment, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(shift_id, reviewer_user_id) DO UPDATE SET
        rating = excluded.rating,
        comment = excluded.comment,
        updated_at = datetime('now')
    `,
    args: [shiftId, baristaId, user.id, rating, comment]
  })

  // Send push notification to barista
  try {
    const starText = '⭐'.repeat(Math.round(rating))
    await sendPushToUser(baristaId, {
      title: '⭐ ¡Han calificado tu café!',
      body: `${user.display_name} te dio ${rating} estrellas (${starText})${comment ? `: "${comment}"` : '.'}`,
      url: '/?tab=reviews'
    })
  } catch (err) {
    console.error('Error enviando notificación de calificación:', err)
  }

  return {
    ok: true,
    shift_id: shiftId,
    rating,
    comment
  }
})
