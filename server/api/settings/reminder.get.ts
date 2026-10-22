import dayjs from 'dayjs'
import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { getReminderConfig } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const db = await useDb()
  const config = await getReminderConfig()

  const todayStr = dayjs().format('YYYY-MM-DD')
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD')

  // Query shift for today
  const todayRes = await db.execute({
    sql: `
      SELECT s.id, s.shift_date, s.day_of_week, s.status, u.id as user_id, u.display_name, u.username, u.avatar_palette, u.avatar_variant,
        (SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.user_id = u.id) as push_devices
      FROM shifts s
      JOIN users u ON u.id = s.assigned_user_id
      WHERE s.shift_date = ?
    `,
    args: [todayStr]
  })

  // Query shift for tomorrow
  const tomorrowRes = await db.execute({
    sql: `
      SELECT s.id, s.shift_date, s.day_of_week, s.status, u.id as user_id, u.display_name, u.username, u.avatar_palette, u.avatar_variant,
        (SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.user_id = u.id) as push_devices
      FROM shifts s
      JOIN users u ON u.id = s.assigned_user_id
      WHERE s.shift_date = ?
    `,
    args: [tomorrowStr]
  })

  const formatShift = (row: any) => {
    if (!row) return null
    let palette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.avatar_palette) {
      try {
        const parsed = JSON.parse(String(row.avatar_palette))
        if (Array.isArray(parsed) && parsed.length > 0) palette = parsed
      } catch {}
    }
    return {
      id: Number(row.id),
      shift_date: String(row.shift_date),
      day_of_week: Number(row.day_of_week),
      status: String(row.status),
      user_id: Number(row.user_id),
      display_name: String(row.display_name),
      username: String(row.username),
      avatar_palette: palette,
      avatar_variant: row.avatar_variant ? String(row.avatar_variant) : 'beam',
      push_devices: Number(row.push_devices ?? 0)
    }
  }

  return {
    config,
    today: formatShift(todayRes.rows[0]),
    tomorrow: formatShift(tomorrowRes.rows[0])
  }
})
