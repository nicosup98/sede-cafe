import { useDb } from '../../utils/db'
import { getReminderConfig } from '../../utils/settings'
import { sendPushToUser } from '../../utils/notifications'
import { getNowInCaracas, getTodayCaracasDate, getTomorrowCaracasDate } from '../../utils/time'

export default defineEventHandler(async (event) => {
  const config = await getReminderConfig()

  if (!config.reminder_enabled) {
    return {
      ok: true,
      status: 'disabled',
      message: 'Los recordatorios automáticos están deshabilitados en la configuración.'
    }
  }

  const query = getQuery(event)
  const type = String(query.type || '').toLowerCase()
  const nowCaracas = getNowInCaracas()
  const todayStr = getTodayCaracasDate()
  const tomorrowStr = getTomorrowCaracasDate()

  const db = await useDb()

  // Determine target based on query parameter or current Caracas hour (UTC-4)
  // Morning reminder: today's shift (e.g. 08:30 AM Caracas)
  // Afternoon reminder: tomorrow's shift (e.g. 17:00 Caracas)
  const isAfternoon = type === 'afternoon' || (type !== 'morning' && nowCaracas.hour() >= 14)

  let targetDate = todayStr
  let isTomorrowTarget = false

  if (isAfternoon) {
    if (!config.notify_day_before) {
      return {
        ok: true,
        status: 'skipped',
        message: 'Aviso de la tarde (día previo) está deshabilitado en la configuración.',
        caracas_time: nowCaracas.format('YYYY-MM-DD HH:mm:ss Z')
      }
    }
    targetDate = tomorrowStr
    isTomorrowTarget = true
  }

  // Find shift for target date
  const shiftRes = await db.execute({
    sql: `
      SELECT s.id, s.status, u.id as user_id, u.display_name
      FROM shifts s
      JOIN users u ON u.id = s.assigned_user_id
      WHERE s.shift_date = ? AND s.status != 'skipped'
    `,
    args: [targetDate]
  })

  let devicesNotified = 0
  const shift = shiftRes.rows[0]

  if (shift && shift.status !== 'completed') {
    const userId = Number(shift.user_id)
    const displayName = String(shift.display_name)

    let title = config.reminder_title || '☕ ¡Hoy te toca hacer el café!'
    let body = (config.reminder_message || 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.').replace(/\{nombre\}/gi, displayName)

    if (isTomorrowTarget) {
      title = '☕ Mañana te toca hacer el café'
      body = `Hola ${displayName}, te recordamos que mañana es tu turno de preparar el café para el equipo.`
    }

    const res = await sendPushToUser(userId, { title, body, url: '/' })
    devicesNotified = res.filter(r => r.status === 'fulfilled').length
  }

  return {
    ok: true,
    timezone: 'America/Caracas',
    caracas_time: nowCaracas.format('YYYY-MM-DD HH:mm:ss Z'),
    target: isTomorrowTarget ? 'tomorrow' : 'today',
    target_date: targetDate,
    reminded_user: shift ? String(shift.display_name) : null,
    devices_notified: devicesNotified
  }
})
