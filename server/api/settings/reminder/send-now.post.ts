import dayjs from 'dayjs'
import { requireAdmin } from '../../../utils/auth'
import { useDb } from '../../../utils/db'
import { getReminderConfig } from '../../../utils/settings'
import { sendPushToUser } from '../../../utils/notifications'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const target = body?.target === 'tomorrow' ? 'tomorrow' : 'today'

  const dateStr = target === 'tomorrow'
    ? dayjs().add(1, 'day').format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD')

  const db = await useDb()
  const shiftRes = await db.execute({
    sql: `
      SELECT s.id, s.shift_date, s.status, u.id as user_id, u.display_name, u.username
      FROM shifts s
      JOIN users u ON u.id = s.assigned_user_id
      WHERE s.shift_date = ?
    `,
    args: [dateStr]
  })

  const shift = shiftRes.rows[0]
  if (!shift) {
    throw createError({
      statusCode: 404,
      statusMessage: `No hay ningún turno asignado para ${target === 'tomorrow' ? 'mañana' : 'hoy'} (${dateStr}).`
    })
  }

  const config = await getReminderConfig()
  const userId = Number(shift.user_id)
  const displayName = String(shift.display_name)

  let title = config.reminder_title || '☕ ¡Hoy te toca hacer el café!'
  let message = config.reminder_message || 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.'

  if (target === 'tomorrow') {
    title = '☕ Mañana te toca hacer el café'
    message = `Hola ${displayName}, te recordamos que mañana es tu turno de preparar el café para el equipo.`
  } else {
    message = message.replace(/\{nombre\}/gi, displayName)
  }

  const results = await sendPushToUser(userId, {
    title,
    body: message,
    url: '/'
  })

  const sentCount = results.filter(r => r.status === 'fulfilled').length

  return {
    ok: true,
    target,
    assigned_user: displayName,
    sentCount,
    message: sentCount > 0
      ? `Recordatorio enviado con éxito a ${displayName} (${sentCount} dispositivo/s notificado/s).`
      : `Se intentó enviar el recordatorio a ${displayName}, pero aún no ha activado las notificaciones push en su teléfono.`
  }
})
