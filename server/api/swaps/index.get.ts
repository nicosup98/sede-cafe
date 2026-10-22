import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { getDayName } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const db = await useDb()

  const res = await db.execute(`
    SELECT
      sr.id,
      sr.type,
      sr.shift_id,
      s.shift_date,
      s.day_of_week,
      sr.target_shift_id,
      ts.shift_date AS target_shift_date,
      ts.day_of_week AS target_day_of_week,
      sr.requester_user_id,
      ru.display_name AS requester_name,
      ru.username AS requester_username,
      sr.target_user_id,
      tu.display_name AS target_name,
      tu.username AS target_username,
      sr.status,
      sr.reason,
      sr.resolved_by_user_id,
      resu.display_name AS resolved_by_name,
      sr.created_at,
      sr.resolved_at
    FROM swap_requests sr
    JOIN shifts s ON s.id = sr.shift_id
    LEFT JOIN shifts ts ON ts.id = sr.target_shift_id
    JOIN users ru ON ru.id = sr.requester_user_id
    JOIN users tu ON tu.id = sr.target_user_id
    LEFT JOIN users resu ON resu.id = sr.resolved_by_user_id
    ORDER BY
      CASE WHEN sr.status = 'pending' THEN 0 ELSE 1 END ASC,
      sr.created_at DESC
    LIMIT 50
  `)

  return {
    swaps: res.rows.map(r => ({
      id: Number(r.id),
      type: String(r.type),
      shift_id: Number(r.shift_id),
      shift_date: String(r.shift_date),
      day_of_week: Number(r.day_of_week),
      day_name: getDayName(Number(r.day_of_week)),
      target_shift_id: r.target_shift_id ? Number(r.target_shift_id) : null,
      target_shift_date: r.target_shift_date ? String(r.target_shift_date) : null,
      target_day_name: r.target_day_of_week ? getDayName(Number(r.target_day_of_week)) : null,
      requester_user_id: Number(r.requester_user_id),
      requester_name: String(r.requester_name),
      requester_username: String(r.requester_username),
      target_user_id: Number(r.target_user_id),
      target_name: String(r.target_name),
      target_username: String(r.target_username),
      status: String(r.status),
      reason: String(r.reason || ''),
      resolved_by_user_id: r.resolved_by_user_id ? Number(r.resolved_by_user_id) : null,
      resolved_by_name: r.resolved_by_name ? String(r.resolved_by_name) : null,
      created_at: String(r.created_at),
      resolved_at: r.resolved_at ? String(r.resolved_at) : null
    }))
  }
})
