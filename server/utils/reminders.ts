import { useDb } from './db'
import { getReminderConfig } from './settings'
import { sendPushToUser } from './notifications'
import { getNowInCaracas, getTodayCaracasDate, getTomorrowCaracasDate } from './time'

export interface ReminderProcessResult {
  ok: boolean
  status: 'sent' | 'skipped' | 'disabled' | 'no_shift'
  type?: 'morning' | 'afternoon'
  target_date?: string
  reminded_user?: string | null
  devices_notified?: number
  message?: string
  caracas_time?: string
}

export async function processReminder(options: {
  type?: 'morning' | 'afternoon' | 'auto'
  forceSend?: boolean
  checkTimeMatch?: boolean
} = {}): Promise<ReminderProcessResult> {
  const config = await getReminderConfig()

  if (!config.reminder_enabled) {
    return {
      ok: true,
      status: 'disabled',
      message: 'Los recordatorios automáticos están deshabilitados en la configuración.'
    }
  }

  const nowCaracas = getNowInCaracas()
  const currentHHMM = nowCaracas.format('HH:mm')
  const todayStr = getTodayCaracasDate()
  const tomorrowStr = getTomorrowCaracasDate()

  const db = await useDb()

  // Determine if morning or afternoon
  let reminderType: 'morning' | 'afternoon'
  if (options.type === 'morning') {
    reminderType = 'morning'
  } else if (options.type === 'afternoon') {
    reminderType = 'afternoon'
  } else {
    // auto detection: if after 14:00 (2 PM), it's afternoon preview
    reminderType = nowCaracas.hour() >= 14 ? 'afternoon' : 'morning'
  }

  // If checkTimeMatch is requested (used by background scheduler)
  if (options.checkTimeMatch) {
    const scheduledTime = reminderType === 'morning' ? config.reminder_time : config.day_before_time
    if (currentHHMM !== scheduledTime) {
      return {
        ok: true,
        status: 'skipped',
        message: `La hora actual (${currentHHMM}) no coincide con la hora programada (${scheduledTime}).`
      }
    }
  }

  const isAfternoon = reminderType === 'afternoon'
  if (isAfternoon && !config.notify_day_before) {
    return {
      ok: true,
      status: 'skipped',
      message: 'Aviso de la tarde (día previo) está deshabilitado en la configuración.',
      caracas_time: nowCaracas.format('YYYY-MM-DD HH:mm:ss Z')
    }
  }

  const targetDate = isAfternoon ? tomorrowStr : todayStr
  const settingLogKey = isAfternoon ? 'last_reminder_afternoon_date' : 'last_reminder_morning_date'

  // Prevent duplicate sending on the same calendar day unless forceSend is true
  if (!options.forceSend) {
    const logRes = await db.execute({
      sql: 'SELECT value FROM system_settings WHERE key = ?',
      args: [settingLogKey]
    })
    const lastSentDate = logRes.rows[0]?.value ? String(logRes.rows[0].value) : null
    if (lastSentDate === todayStr) {
      return {
        ok: true,
        status: 'skipped',
        message: `El recordatorio de ${reminderType === 'morning' ? 'la mañana' : 'la tarde'} ya fue enviado hoy (${todayStr}).`,
        caracas_time: nowCaracas.format('YYYY-MM-DD HH:mm:ss Z')
      }
    }
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

  const shift = shiftRes.rows[0]
  if (!shift) {
    return {
      ok: true,
      status: 'no_shift',
      target_date: targetDate,
      message: `No hay turno programado para ${targetDate}.`
    }
  }

  if (shift.status === 'completed') {
    return {
      ok: true,
      status: 'skipped',
      target_date: targetDate,
      message: `El turno para ${targetDate} ya fue completado.`
    }
  }

  const userId = Number(shift.user_id)
  const displayName = String(shift.display_name)

  let title = config.reminder_title || '☕ ¡Hoy te toca hacer el café!'
  let body = (config.reminder_message || 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.').replace(/\{nombre\}/gi, displayName)

  if (isAfternoon) {
    title = '☕ Mañana te toca hacer el café'
    body = `Hola ${displayName}, te recordamos que mañana es tu turno de preparar el café para el equipo.`
  }

  const res = await sendPushToUser(userId, {
    title,
    body,
    url: '/'
  })

  const devicesNotified = res.filter(r => r.status === 'fulfilled').length

  // Save that this reminder was sent today to avoid repeating it
  await db.execute({
    sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [settingLogKey, todayStr]
  })

  return {
    ok: true,
    status: 'sent',
    type: reminderType,
    target_date: targetDate,
    reminded_user: displayName,
    devices_notified: devicesNotified,
    caracas_time: nowCaracas.format('YYYY-MM-DD HH:mm:ss Z')
  }
}
