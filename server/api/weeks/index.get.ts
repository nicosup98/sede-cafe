import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { getMondayOfDate, addDays, getDayName, getUserEquityStats } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = getQuery(event)

  const currentWeekMonday = getMondayOfDate(undefined, true)
  const nextWeekMonday = addDays(currentWeekMonday, 7)

  const requestedStart = query.week_start ? String(query.week_start) : currentWeekMonday
  const selectedWeekMonday = getMondayOfDate(requestedStart, false)
  const selectedWeekFriday = addDays(selectedWeekMonday, 4)

  const db = await useDb()

  // Fetch all generated weeks
  const weeksRes = await db.execute(
    'SELECT id, week_start, week_end, created_at FROM weeks ORDER BY week_start DESC LIMIT 20'
  )

  // Check if selected week exists
  const weekRes = await db.execute({
    sql: 'SELECT id, week_start, week_end, created_by, created_at FROM weeks WHERE week_start = ?',
    args: [selectedWeekMonday]
  })

  const weekRow = weekRes.rows[0] || null
  let shifts: any[] = []

  if (weekRow) {
    const shiftsRes = await db.execute({
      sql: `
        SELECT
          s.id,
          s.week_id,
          s.shift_date,
          s.day_of_week,
          s.original_user_id,
          ou.display_name AS original_user_name,
          ou.username AS original_username,
          s.assigned_user_id,
          au.display_name AS assigned_user_name,
          au.username AS assigned_username,
          au.role AS assigned_user_role,
          s.covered_by_swap_id,
          s.status,
          s.notes
        FROM shifts s
        JOIN users ou ON ou.id = s.original_user_id
        JOIN users au ON au.id = s.assigned_user_id
        WHERE s.week_id = ?
        ORDER BY
          CASE WHEN s.day_of_week = 0 THEN 7 ELSE s.day_of_week END ASC,
          s.shift_date ASC
      `,
      args: [Number(weekRow.id)]
    })

    shifts = shiftsRes.rows.map(r => {
      const dow = Number(r.day_of_week)
      const isExtraordinary = dow === 0 || dow === 6 || dow === 7
      return {
        id: Number(r.id),
        week_id: Number(r.week_id),
        shift_date: String(r.shift_date),
        day_of_week: dow,
        day_name: getDayName(dow),
        original_user_id: Number(r.original_user_id),
        original_user_name: String(r.original_user_name),
        original_username: String(r.original_username),
        assigned_user_id: Number(r.assigned_user_id),
        assigned_user_name: String(r.assigned_user_name),
        assigned_username: String(r.assigned_username),
        assigned_user_role: String(r.assigned_user_role),
        was_covered: Number(r.original_user_id) !== Number(r.assigned_user_id),
        covered_by_swap_id: r.covered_by_swap_id ? Number(r.covered_by_swap_id) : null,
        status: String(r.status),
        notes: String(r.notes || ''),
        is_extraordinary: isExtraordinary
      }
    })
  }

  const equityStats = await getUserEquityStats()

  return {
    currentWeekMonday,
    nextWeekMonday,
    selectedWeekMonday,
    selectedWeekFriday,
    week: weekRow
      ? {
          id: Number(weekRow.id),
          week_start: String(weekRow.week_start),
          week_end: String(weekRow.week_end),
          created_at: String(weekRow.created_at)
        }
      : null,
    shifts,
    allWeeks: weeksRes.rows.map(w => ({
      id: Number(w.id),
      week_start: String(w.week_start),
      week_end: String(w.week_end),
      created_at: String(w.created_at)
    })),
    equityStats
  }
})
