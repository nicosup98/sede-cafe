import { requireAdmin } from '../../utils/auth'
import { saveReminderConfig, getReminderConfig } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  await saveReminderConfig({
    reminder_enabled: body?.reminder_enabled,
    reminder_time: body?.reminder_time,
    reminder_title: body?.reminder_title,
    reminder_message: body?.reminder_message,
    notify_day_before: body?.notify_day_before,
    day_before_time: body?.day_before_time
  })

  const updated = await getReminderConfig()
  return { ok: true, config: updated }
})
