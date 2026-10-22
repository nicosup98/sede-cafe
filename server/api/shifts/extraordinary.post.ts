import { requireAdmin } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { getMondayOfDate, getDayName, addDays } from '../../utils/scheduler'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)

  const shiftDate = String(body?.shift_date || '').trim()
  const assignedUserId = Number(body?.assigned_user_id)
  const notes = String(body?.notes || 'Turno extraordinario').trim()

  if (!shiftDate || !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Fecha inválida. Debe tener formato YYYY-MM-DD.'
    })
  }

  if (!assignedUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes seleccionar al encargado del turno.'
    })
  }

  const db = await useDb()

  // Verify assigned user exists
  const userRes = await db.execute({
    sql: 'SELECT id, display_name FROM users WHERE id = ?',
    args: [assignedUserId]
  })
  if (userRes.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  // Check if shift on that date already exists
  const existingShift = await db.execute({
    sql: 'SELECT id FROM shifts WHERE shift_date = ?',
    args: [shiftDate]
  })
  if (existingShift.rows.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `Ya existe un turno registrado para la fecha ${shiftDate}.`
    })
  }

  // Calculate day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const [y, m, d] = shiftDate.split('-').map(Number)
  const dateObj = new Date(Date.UTC(y, m - 1, d))
  const rawDayOfWeek = dateObj.getUTCDay()
  const dayOfWeek = rawDayOfWeek === 0 ? 7 : rawDayOfWeek // 1 = Lunes .. 7 = Domingo

  // Find or create the week record for this date
  const weekStart = getMondayOfDate(shiftDate, false)
  const weekEnd = addDays(weekStart, 4)

  let weekRes = await db.execute({
    sql: 'SELECT id FROM weeks WHERE week_start = ?',
    args: [weekStart]
  })

  let weekId: number
  if (weekRes.rows.length === 0) {
    const insertWeek = await db.execute({
      sql: 'INSERT INTO weeks (week_start, week_end, created_by) VALUES (?, ?, ?) RETURNING id',
      args: [weekStart, weekEnd, admin.id]
    })
    weekId = Number(insertWeek.rows[0].id)
  } else {
    weekId = Number(weekRes.rows[0].id)
  }

  // Insert the extraordinary shift
  const insertShift = await db.execute({
    sql: `INSERT INTO shifts (week_id, shift_date, day_of_week, original_user_id, assigned_user_id, status, notes)
          VALUES (?, ?, ?, ?, ?, 'pending', ?) RETURNING id`,
    args: [weekId, shiftDate, rawDayOfWeek, assignedUserId, assignedUserId, notes]
  })

  const shiftId = Number(insertShift.rows[0].id)

  return {
    ok: true,
    shift: {
      id: shiftId,
      week_id: weekId,
      shift_date: shiftDate,
      day_of_week: rawDayOfWeek,
      day_name: getDayName(rawDayOfWeek),
      assigned_user_id: assignedUserId,
      assigned_user_name: userRes.rows[0].display_name,
      notes,
      is_extraordinary: true
    }
  }
})
