import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const shiftId = Number(getRouterParam(event, 'id'))
  if (!shiftId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de turno inválido.' })
  }

  const db = await useDb()

  // Get shift info
  const shiftRes = await db.execute({
    sql: `
      SELECT
        s.id, s.shift_date, s.status,
        bu.id AS barista_id, bu.display_name AS barista_name, bu.username AS barista_username,
        bu.avatar_palette AS barista_palette, bu.avatar_variant AS barista_variant
      FROM shifts s
      JOIN users bu ON bu.id = s.assigned_user_id
      WHERE s.id = ?
    `,
    args: [shiftId]
  })

  const shift = shiftRes.rows[0]
  if (!shift) {
    throw createError({ statusCode: 404, statusMessage: 'Turno no encontrado.' })
  }

  // Get all reviews for this shift
  const reviewsRes = await db.execute({
    sql: `
      SELECT
        r.id, r.rating, r.comment, r.created_at, r.updated_at,
        u.id AS reviewer_id, u.display_name AS reviewer_name, u.username AS reviewer_username,
        u.avatar_palette AS reviewer_palette, u.avatar_variant AS reviewer_variant
      FROM coffee_reviews r
      JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.shift_id = ?
      ORDER BY r.created_at DESC
    `,
    args: [shiftId]
  })

  let baristaPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
  if (shift.barista_palette) {
    try {
      const p = JSON.parse(String(shift.barista_palette))
      if (Array.isArray(p) && p.length > 0) baristaPalette = p
    } catch {}
  }

  let totalRating = 0
  let myReview: any = null

  const reviews = reviewsRes.rows.map((row) => {
    const rating = Number(row.rating)
    totalRating += rating

    let revPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.reviewer_palette) {
      try {
        const p = JSON.parse(String(row.reviewer_palette))
        if (Array.isArray(p) && p.length > 0) revPalette = p
      } catch {}
    }

    const revObj = {
      id: Number(row.id),
      rating,
      comment: String(row.comment || ''),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      reviewer: {
        id: Number(row.reviewer_id),
        display_name: String(row.reviewer_name),
        username: String(row.reviewer_username),
        avatar_palette: revPalette,
        avatar_variant: row.reviewer_variant ? String(row.reviewer_variant) : 'beam'
      }
    }

    if (Number(row.reviewer_id) === user.id) {
      myReview = revObj
    }

    return revObj
  })

  const reviewsCount = reviews.length
  const averageRating = reviewsCount > 0 ? Number((totalRating / reviewsCount).toFixed(1)) : null

  return {
    shift: {
      id: Number(shift.id),
      shift_date: String(shift.shift_date),
      status: String(shift.status),
      barista: {
        id: Number(shift.barista_id),
        display_name: String(shift.barista_name),
        username: String(shift.barista_username),
        avatar_palette: baristaPalette,
        avatar_variant: shift.barista_variant ? String(shift.barista_variant) : 'beam'
      }
    },
    reviews,
    reviews_count: reviewsCount,
    average_rating: averageRating,
    my_review: myReview,
    can_rate: user.id !== Number(shift.barista_id) && shift.status === 'completed'
  }
})
