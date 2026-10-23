import { processReminder } from '../../utils/reminders'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const typeParam = String(query.type || '').toLowerCase()
  const force = query.force === 'true' || query.force === '1'

  const type = typeParam === 'morning' || typeParam === 'afternoon' ? typeParam : 'auto'

  const result = await processReminder({
    type,
    forceSend: force,
    checkTimeMatch: false // When called explicitly via API/Cron URL, do not require exact minute match
  })

  return result
})
