import { getCurrentUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const db = await useDb()

  // Also return public list of users (username + display_name + role) to facilitate quick login selector
  const usersRes = await db.execute(
    'SELECT id, username, display_name, role, participates_in_coffee FROM users ORDER BY role ASC, display_name ASC'
  )

  return {
    user,
    availableUsers: usersRes.rows.map(r => ({
      id: Number(r.id),
      username: String(r.username),
      display_name: String(r.display_name),
      role: r.role === 'admin' ? 'admin' : 'user',
      participates_in_coffee: Boolean(Number(r.participates_in_coffee))
    }))
  }
})
