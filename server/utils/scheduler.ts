import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import isoWeek from 'dayjs/plugin/isoWeek.js'
import 'dayjs/locale/es.js'
import { useDb } from './db'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.locale('es')

export interface UserEquityStat {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'user'
  participates_in_coffee: boolean
  manual_balance_adjustment: number
  original_shifts_count: number
  assigned_shifts_count: number
  completed_shifts_count: number
  covers_given: number
  covers_received: number
  net_cover_balance: number
  effective_load: number
  last_shift_date: string | null
}

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo'
}

export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || `Día ${dayOfWeek}`
}

/**
 * Given any YYYY-MM-DD date string (or Date), returns the Monday (YYYY-MM-DD) of that week.
 * If the date falls on Saturday or Sunday, returns the upcoming Monday if `rollForwardWeekend` is true,
 * or the Monday of that ISO week.
 */
export function getMondayOfDate(input?: string | Date, rollForwardWeekend = true): string {
  let d = input ? dayjs.utc(input) : dayjs.utc()
  const isoDay = d.isoWeekday() // 1 = Monday ... 7 = Sunday
  if (rollForwardWeekend && isoDay >= 6) {
    // If weekend (Saturday/Sunday), roll forward to next Monday
    d = d.add(8 - isoDay, 'day')
  } else {
    d = d.startOf('isoWeek')
  }
  return d.format('YYYY-MM-DD')
}

export function addDays(dateStr: string, days: number): string {
  return dayjs.utc(dateStr).add(days, 'day').format('YYYY-MM-DD')
}

export function getWeekWorkdays(mondayStr: string): Array<{ date: string; dayOfWeek: number; dayName: string }> {
  return [1, 2, 3, 4, 5].map((dayOfWeek, idx) => ({
    date: addDays(mondayStr, idx),
    dayOfWeek,
    dayName: getDayName(dayOfWeek)
  }))
}

export async function getUserEquityStats(): Promise<UserEquityStat[]> {
  const db = await useDb()

  const usersRes = await db.execute(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.role,
      u.participates_in_coffee,
      u.manual_balance_adjustment,
      COALESCE(SUM(CASE WHEN s.original_user_id = u.id AND s.status != 'skipped' THEN 1 ELSE 0 END), 0) AS original_shifts_count,
      COALESCE(SUM(CASE WHEN s.assigned_user_id = u.id AND s.status != 'skipped' THEN 1 ELSE 0 END), 0) AS assigned_shifts_count,
      COALESCE(SUM(CASE WHEN s.assigned_user_id = u.id AND s.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_shifts_count,
      COALESCE(SUM(CASE WHEN s.assigned_user_id = u.id AND s.original_user_id != u.id AND s.status != 'skipped' THEN 1 ELSE 0 END), 0) AS covers_given,
      COALESCE(SUM(CASE WHEN s.original_user_id = u.id AND s.assigned_user_id != u.id AND s.status != 'skipped' THEN 1 ELSE 0 END), 0) AS covers_received,
      MAX(CASE WHEN s.assigned_user_id = u.id AND s.status != 'skipped' THEN s.shift_date ELSE NULL END) AS last_shift_date
    FROM users u
    LEFT JOIN shifts s ON (s.assigned_user_id = u.id OR s.original_user_id = u.id)
    GROUP BY u.id
    ORDER BY u.display_name ASC
  `)

  return usersRes.rows.map((row) => {
    const originalCount = Number(row.original_shifts_count ?? 0)
    const assignedCount = Number(row.assigned_shifts_count ?? 0)
    const completedCount = Number(row.completed_shifts_count ?? 0)
    const coversGiven = Number(row.covers_given ?? 0)
    const coversReceived = Number(row.covers_received ?? 0)
    const manualAdj = Number(row.manual_balance_adjustment ?? 0)

    return {
      id: Number(row.id),
      username: String(row.username),
      display_name: String(row.display_name),
      role: row.role === 'admin' ? 'admin' : 'user',
      participates_in_coffee: Boolean(Number(row.participates_in_coffee)),
      manual_balance_adjustment: manualAdj,
      original_shifts_count: originalCount,
      assigned_shifts_count: assignedCount,
      completed_shifts_count: completedCount,
      covers_given: coversGiven,
      covers_received: coversReceived,
      net_cover_balance: coversGiven - coversReceived,
      effective_load: assignedCount + manualAdj,
      last_shift_date: row.last_shift_date ? String(row.last_shift_date) : null
    }
  })
}

export async function generateWeekSchedule(options: {
  weekStart: string
  createdByUserId: number
  regenerate?: boolean
}) {
  const db = await useDb()
  const mondayStr = getMondayOfDate(options.weekStart, false)
  const fridayStr = addDays(mondayStr, 4)

  // Check if week already exists
  const existingWeek = await db.execute({
    sql: 'SELECT id FROM weeks WHERE week_start = ?',
    args: [mondayStr]
  })

  if (existingWeek.rows.length > 0) {
    if (!options.regenerate) {
      throw createError({
        statusCode: 409,
        statusMessage: `La semana del ${mondayStr} al ${fridayStr} ya fue generada. Usa la opción de regenerar si deseas recalcularla.`
      })
    }
    const weekIdToDelete = Number(existingWeek.rows[0].id)
    await db.execute({
      sql: 'DELETE FROM swap_requests WHERE shift_id IN (SELECT id FROM shifts WHERE week_id = ?)',
      args: [weekIdToDelete]
    })
    await db.execute({
      sql: 'DELETE FROM shifts WHERE week_id = ?',
      args: [weekIdToDelete]
    })
    await db.execute({
      sql: 'DELETE FROM weeks WHERE id = ?',
      args: [weekIdToDelete]
    })
  }

  // Fetch equity stats AFTER any deletion so counts reflect prior weeks accurately
  const allStats = await getUserEquityStats()
  const activeUsers = allStats.filter(u => u.participates_in_coffee)

  if (activeUsers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No hay usuarios activos en la lista de hacer café para asignar turnos.'
    })
  }

  // Create week record
  const insertWeek = await db.execute({
    sql: 'INSERT INTO weeks (week_start, week_end, created_by) VALUES (?, ?, ?) RETURNING id',
    args: [mondayStr, fridayStr, options.createdByUserId]
  })
  const weekId = Number(insertWeek.rows[0].id)

  // Track running state across the 5 days of this week
  const simState = activeUsers.map(u => ({
    ...u,
    currentLoad: u.effective_load,
    shiftsThisWeek: 0,
    simLastDate: u.last_shift_date || '0000-00-00'
  }))

  //Find previous Friday's assigned user to avoid Friday -> Monday back-to-back if possible
  const prevShiftRes = await db.execute({
    sql: 'SELECT assigned_user_id FROM shifts WHERE shift_date < ? AND status != ? ORDER BY shift_date DESC LIMIT 1',
    args: [mondayStr, 'skipped']
  })
  let previousDayUserId: number | null = prevShiftRes.rows[0]
    ? Number(prevShiftRes.rows[0].assigned_user_id)
    : null

  const workdays = getWeekWorkdays(mondayStr)

  for (const day of workdays) {
    // Sort candidates fairly:
    // 1. Lowest currentLoad (accounts for all past assigned shifts + covers + manual balance)
    // 2. Lowest shiftsThisWeek (distributes across the week before repeating anyone)
    // 3. Avoid back-to-back consecutive days when more than 1 user is available
    // 4. Oldest last shift date
    const sorted = [...simState].sort((a, b) => {
      if (a.currentLoad !== b.currentLoad) {
        return a.currentLoad - b.currentLoad
      }
      if (a.shiftsThisWeek !== b.shiftsThisWeek) {
        return a.shiftsThisWeek - b.shiftsThisWeek
      }
      const aConsecutive = a.id === previousDayUserId ? 1 : 0
      const bConsecutive = b.id === previousDayUserId ? 1 : 0
      if (aConsecutive !== bConsecutive) {
        return aConsecutive - bConsecutive
      }
      if (a.simLastDate !== b.simLastDate) {
        return a.simLastDate.localeCompare(b.simLastDate)
      }
      return a.id - b.id
    })

    const chosen = sorted[0]
    chosen.currentLoad += 1
    chosen.shiftsThisWeek += 1
    chosen.simLastDate = day.date
    previousDayUserId = chosen.id

    await db.execute({
      sql: `INSERT INTO shifts (week_id, shift_date, day_of_week, original_user_id, assigned_user_id, status)
            VALUES (?, ?, ?, ?, ?, 'pending')`,
      args: [weekId, day.date, day.dayOfWeek, chosen.id, chosen.id]
    })
  }

  return { weekId, weekStart: mondayStr, weekEnd: fridayStr }
}
