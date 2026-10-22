import { useDb } from './db'

export interface ReminderConfig {
  reminder_enabled: boolean
  reminder_time: string
  reminder_title: string
  reminder_message: string
  notify_day_before: boolean
  day_before_time: string
  timezone: string
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  reminder_enabled: 'true',
  reminder_time: '08:30',
  reminder_title: '☕ ¡Hoy te toca hacer el café!',
  reminder_message: 'Hola {nombre}, hoy es tu turno de preparar el café para el equipo.',
  notify_day_before: 'false',
  day_before_time: '17:00',
  timezone: 'America/Caracas'
}

export async function getReminderConfig(): Promise<ReminderConfig> {
  const db = await useDb()
  const res = await db.execute('SELECT key, value FROM system_settings')
  const map = new Map<string, string>()
  for (const row of res.rows) {
    map.set(String(row.key), String(row.value))
  }

  return {
    reminder_enabled: (map.get('reminder_enabled') ?? DEFAULT_SETTINGS.reminder_enabled) === 'true',
    reminder_time: map.get('reminder_time') ?? DEFAULT_SETTINGS.reminder_time,
    reminder_title: map.get('reminder_title') ?? DEFAULT_SETTINGS.reminder_title,
    reminder_message: map.get('reminder_message') ?? DEFAULT_SETTINGS.reminder_message,
    notify_day_before: (map.get('notify_day_before') ?? DEFAULT_SETTINGS.notify_day_before) === 'true',
    day_before_time: map.get('day_before_time') ?? DEFAULT_SETTINGS.day_before_time,
    timezone: map.get('timezone') ?? DEFAULT_SETTINGS.timezone
  }
}

export async function saveReminderConfig(config: Partial<ReminderConfig>) {
  const db = await useDb()

  const entries: [string, string][] = []
  if (typeof config.reminder_enabled === 'boolean') {
    entries.push(['reminder_enabled', String(config.reminder_enabled)])
  }
  if (typeof config.reminder_time === 'string') {
    entries.push(['reminder_time', config.reminder_time.trim()])
  }
  if (typeof config.reminder_title === 'string') {
    entries.push(['reminder_title', config.reminder_title.trim()])
  }
  if (typeof config.reminder_message === 'string') {
    entries.push(['reminder_message', config.reminder_message.trim()])
  }
  if (typeof config.notify_day_before === 'boolean') {
    entries.push(['notify_day_before', String(config.notify_day_before)])
  }
  if (typeof config.day_before_time === 'string') {
    entries.push(['day_before_time', config.day_before_time.trim()])
  }
  if (typeof config.timezone === 'string') {
    entries.push(['timezone', config.timezone.trim()])
  }

  for (const [key, value] of entries) {
    await db.execute({
      sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, value]
    })
  }
}
