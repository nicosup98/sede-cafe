import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { getMondayOfDate, addDays, getDayName, getUserEquityStats } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
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
          ou.avatar_palette AS original_user_palette,
          ou.avatar_variant AS original_user_variant,
          s.assigned_user_id,
          au.display_name AS assigned_user_name,
          au.username AS assigned_username,
          au.role AS assigned_user_role,
          au.avatar_palette AS assigned_user_palette,
          au.avatar_variant AS assigned_user_variant,
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

    const shiftIds = shiftsRes.rows.map(r => Number(r.id))
    const reviewStatsMap = new Map<number, { count: number; avg: number }>()
    const myReviewMap = new Map<number, { rating: number; comment: string }>()

    if (shiftIds.length > 0) {
      const placeholders = shiftIds.map(() => '?').join(',')
      try {
        const statsRes = await db.execute({
          sql: `
            SELECT shift_id, COUNT(*) AS reviews_count, AVG(rating) AS avg_rating
            FROM coffee_reviews
            WHERE shift_id IN (${placeholders})
            GROUP BY shift_id
          `,
          args: shiftIds
        })
        for (const row of statsRes.rows) {
          reviewStatsMap.set(Number(row.shift_id), {
            count: Number(row.reviews_count),
            avg: Number(Number(row.avg_rating).toFixed(1))
          })
        }

        const myReviewsRes = await db.execute({
          sql: `
            SELECT shift_id, rating, comment
            FROM coffee_reviews
            WHERE shift_id IN (${placeholders}) AND reviewer_user_id = ?
          `,
          args: [...shiftIds, user.id]
        })
        for (const row of myReviewsRes.rows) {
          myReviewMap.set(Number(row.shift_id), {
            rating: Number(row.rating),
            comment: String(row.comment || '')
          })
        }
      } catch (err) {
        // Safe fallback if coffee_reviews table isn't migrated yet
      }
    }

    shifts = shiftsRes.rows.map(r => {
      const shiftId = Number(r.id)
      const dow = Number(r.day_of_week)
      const isExtraordinary = dow === 0 || dow === 6 || dow === 7
      const revStats = reviewStatsMap.get(shiftId)
      const myRev = myReviewMap.get(shiftId) || null

      let assignedPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
      if (r.assigned_user_palette) {
        try {
          const p = JSON.parse(String(r.assigned_user_palette))
          if (Array.isArray(p) && p.length > 0) assignedPalette = p
        } catch {}
      }

      let originalPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
      if (r.original_user_palette) {
        try {
          const p = JSON.parse(String(r.original_user_palette))
          if (Array.isArray(p) && p.length > 0) originalPalette = p
        } catch {}
      }

      return {
        id: shiftId,
        week_id: Number(r.week_id),
        shift_date: String(r.shift_date),
        day_of_week: dow,
        day_name: getDayName(dow),
        original_user_id: Number(r.original_user_id),
        original_user_name: String(r.original_user_name),
        original_username: String(r.original_username),
        original_user_palette: originalPalette,
        original_user_variant: r.original_user_variant ? String(r.original_user_variant) : 'beam',
        assigned_user_id: Number(r.assigned_user_id),
        assigned_user_name: String(r.assigned_user_name),
        assigned_username: String(r.assigned_username),
        assigned_user_role: String(r.assigned_user_role),
        assigned_user_palette: assignedPalette,
        assigned_user_variant: r.assigned_user_variant ? String(r.assigned_user_variant) : 'beam',
        was_covered: Number(r.original_user_id) !== Number(r.assigned_user_id),
        covered_by_swap_id: r.covered_by_swap_id ? Number(r.covered_by_swap_id) : null,
        status: String(r.status),
        notes: String(r.notes || ''),
        is_extraordinary: isExtraordinary,
        reviews_count: revStats?.count ?? 0,
        average_rating: revStats?.avg ?? null,
        my_review: myRev
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
