import { requireAdmin } from '../../utils/auth'
import { getMondayOfDate, addDays, generateWeekSchedule } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)

  const currentWeekMonday = getMondayOfDate(undefined, true)
  const nextWeekMonday = addDays(currentWeekMonday, 7)

  let targetMonday = currentWeekMonday
  if (body?.target === 'next') {
    targetMonday = nextWeekMonday
  } else if (body?.week_start) {
    targetMonday = getMondayOfDate(String(body.week_start), false)
  }

  const regenerate = Boolean(body?.regenerate)

  const result = await generateWeekSchedule({
    weekStart: targetMonday,
    createdByUserId: admin.id,
    regenerate
  })

  return {
    ok: true,
    ...result
  }
})
