import { requireUser } from '../../../utils/auth'
import { useDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const baristaId = Number(getRouterParam(event, 'id'))
  if (!baristaId) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido.' })
  }

  const db = await useDb()

  // Get user details
  const userRes = await db.execute({
    sql: 'SELECT id, username, display_name, role, participates_in_coffee, avatar_palette, avatar_variant FROM users WHERE id = ?',
    args: [baristaId]
  })

  const barista = userRes.rows[0]
  if (!barista) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  // Get all reviews received by this barista
  const reviewsRes = await db.execute({
    sql: `
      SELECT
        r.id, r.shift_id, r.rating, r.comment, r.created_at, r.updated_at,
        s.shift_date,
        u.id AS reviewer_id, u.display_name AS reviewer_name, u.username AS reviewer_username,
        u.avatar_palette AS reviewer_palette, u.avatar_variant AS reviewer_variant
      FROM coffee_reviews r
      JOIN shifts s ON s.id = r.shift_id
      JOIN users u ON u.id = r.reviewer_user_id
      WHERE r.target_user_id = ?
      ORDER BY s.shift_date DESC, r.created_at DESC
    `,
    args: [baristaId]
  })

  // Get total completed shifts
  const completedRes = await db.execute({
    sql: "SELECT COUNT(*) AS count FROM shifts WHERE assigned_user_id = ? AND status = 'completed'",
    args: [baristaId]
  })
  const completedShifts = Number(completedRes.rows[0]?.count ?? 0)

  let totalRating = 0
  const ratingDistribution: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  }

  const reviews = reviewsRes.rows.map((row) => {
    const rating = Number(row.rating)
    totalRating += rating

    // Bucket for distribution: round to nearest whole integer between 1 and 5
    const roundedBucket = Math.min(5, Math.max(1, Math.round(rating)))
    ratingDistribution[roundedBucket] = (ratingDistribution[roundedBucket] || 0) + 1

    let revPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.reviewer_palette) {
      try {
        const p = JSON.parse(String(row.reviewer_palette))
        if (Array.isArray(p) && p.length > 0) revPalette = p
      } catch {}
    }

    return {
      id: Number(row.id),
      shift_id: Number(row.shift_id),
      shift_date: String(row.shift_date),
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
  })

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : null

  let palette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
  if (barista.avatar_palette) {
    try {
      const p = JSON.parse(String(barista.avatar_palette))
      if (Array.isArray(p) && p.length > 0) palette = p
    } catch {}
  }

  return {
    barista: {
      id: Number(barista.id),
      username: String(barista.username),
      display_name: String(barista.display_name),
      role: barista.role === 'admin' ? 'admin' : 'user',
      participates_in_coffee: Boolean(Number(barista.participates_in_coffee)),
      avatar_palette: palette,
      avatar_variant: barista.avatar_variant ? String(barista.avatar_variant) : 'beam',
      completed_shifts: completedShifts,
      total_reviews: totalReviews,
      average_rating: averageRating,
      rating_distribution: ratingDistribution
    },
    reviews
  }
})
