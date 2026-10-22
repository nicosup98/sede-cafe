import { getCurrentUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  const db = await useDb()

  // Also return public list of users (username + display_name + role) to facilitate quick login selector
  const usersRes = await db.execute(
    'SELECT id, username, display_name, role, participates_in_coffee, avatar_palette, avatar_variant FROM users ORDER BY role ASC, display_name ASC'
  )

  return {
    user,
    availableUsers: usersRes.rows.map(r => {
      let palette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
      if (r.avatar_palette) {
        try {
          const parsed = JSON.parse(String(r.avatar_palette))
          if (Array.isArray(parsed) && parsed.length > 0) palette = parsed
        } catch {}
      }
      return {
        id: Number(r.id),
        username: String(r.username),
        display_name: String(r.display_name),
        role: r.role === 'admin' ? 'admin' : 'user',
        participates_in_coffee: Boolean(Number(r.participates_in_coffee)),
        avatar_palette: palette,
        avatar_variant: r.avatar_variant ? String(r.avatar_variant) : 'beam'
      }
    })
  }
})
