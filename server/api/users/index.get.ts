import { requireUser } from '../../utils/auth'
import { getUserEquityStats } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const users = await getUserEquityStats()
  return { users }
})
