import dayjs from 'dayjs'
import { useDb } from '../../utils/db'
import { getReminderConfig } from '../../utils/settings'
import { sendPushToUser } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const config = await getReminderConfig()

  if (!config.reminder_enabled) {
    return { ok: true, status: 'disabled' }
  }

  const db = await useDb()
  const todayStr = dayjs().format('YYYY-MM-DD')

  // Find today's shift
  const todayRes = await db.execute({
    sql: `
      SELECT s.id, s.status, u.id as user_id, u.display_name
      FROM shifts s
      JOIN users u ON u.id = s.assigned_user_id
      WHERE s.shift_date = ? AND s.status != 'skipped'
    `,
    args: [todayStr]
  })

  let todaySent = 0
  const todayShift = todayRes.rows[0]

  if (todayShift && todayShift.status !== 'completed') {
    const userId = Number(todayShift.user_id)
    const displayName = String(todayShift.display_name)
    const title = config.reminder_title || '☕ ¡Hoy te toca hacer el café!'
    const body = (config.reminder_message || 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.').replace(/\{nombre\}/gi, displayName)

    const res = await sendPushToUser(userId, { title, body, url: '/' })
    todaySent = res.filter(r => r.status === 'fulfilled').length
  }

  return {
    ok: true,
    today_date: todayStr,
    reminded_user: todayShift ? todayShift.display_name : null,
    today_devices_notified: todaySent
  }
})
