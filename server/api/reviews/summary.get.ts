import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const db = await useDb()

  // 1. Fetch all users with completed shifts & review stats
  const usersRes = await db.execute(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.role,
      u.participates_in_coffee,
      u.avatar_palette,
      u.avatar_variant,
      COUNT(DISTINCT s.id) AS completed_shifts,
      COUNT(r.id) AS total_reviews,
      AVG(r.rating) AS average_rating
    FROM users u
    LEFT JOIN shifts s ON s.assigned_user_id = u.id AND s.status = 'completed'
    LEFT JOIN coffee_reviews r ON r.target_user_id = u.id
    GROUP BY u.id
    ORDER BY
      CASE WHEN AVG(r.rating) IS NOT NULL THEN 1 ELSE 2 END ASC,
      AVG(r.rating) DESC,
      COUNT(r.id) DESC,
      u.display_name ASC
  `)

  // 2. Fetch all reviews to compute distribution per barista and create all_comments feed
  const allReviewsRes = await db.execute(`
    SELECT
      r.id,
      r.shift_id,
      r.rating,
      r.comment,
      r.created_at,
      r.updated_at,
      s.shift_date,
      bu.id AS barista_id,
      bu.display_name AS barista_name,
      bu.username AS barista_username,
      bu.avatar_palette AS barista_palette,
      bu.avatar_variant AS barista_variant,
      ru.id AS reviewer_id,
      ru.display_name AS reviewer_name,
      ru.username AS reviewer_username,
      ru.avatar_palette AS reviewer_palette,
      ru.avatar_variant AS reviewer_variant
    FROM coffee_reviews r
    JOIN shifts s ON s.id = r.shift_id
    JOIN users bu ON bu.id = r.target_user_id
    JOIN users ru ON ru.id = r.reviewer_user_id
    ORDER BY s.shift_date DESC, r.created_at DESC
  `)

  // Build distribution map per barista
  const distributionMap = new Map<number, Record<number, number>>()
  const reviewsByShiftMap = new Map<number, any[]>()
  const allComments: any[] = []

  let globalTotalReviews = 0
  let globalRatingSum = 0

  for (const row of allReviewsRes.rows) {
    const baristaId = Number(row.barista_id)
    const shiftId = Number(row.shift_id)
    const rating = Number(row.rating)

    globalTotalReviews += 1
    globalRatingSum += rating

    // Distribution
    if (!distributionMap.has(baristaId)) {
      distributionMap.set(baristaId, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
    }
    const dist = distributionMap.get(baristaId)!
    const bucket = Math.min(5, Math.max(1, Math.round(rating)))
    dist[bucket] = (dist[bucket] || 0) + 1

    let baristaPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.barista_palette) {
      try {
        const p = JSON.parse(String(row.barista_palette))
        if (Array.isArray(p) && p.length > 0) baristaPalette = p
      } catch {}
    }

    let reviewerPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.reviewer_palette) {
      try {
        const p = JSON.parse(String(row.reviewer_palette))
        if (Array.isArray(p) && p.length > 0) reviewerPalette = p
      } catch {}
    }

    const reviewObj = {
      id: Number(row.id),
      shift_id: shiftId,
      shift_date: String(row.shift_date),
      rating,
      comment: String(row.comment || ''),
      created_at: String(row.created_at),
      barista: {
        id: baristaId,
        display_name: String(row.barista_name),
        username: String(row.barista_username),
        avatar_palette: baristaPalette,
        avatar_variant: row.barista_variant ? String(row.barista_variant) : 'beam'
      },
      reviewer: {
        id: Number(row.reviewer_id),
        display_name: String(row.reviewer_name),
        username: String(row.reviewer_username),
        avatar_palette: reviewerPalette,
        avatar_variant: row.reviewer_variant ? String(row.reviewer_variant) : 'beam'
      }
    }

    allComments.push(reviewObj)

    if (!reviewsByShiftMap.has(shiftId)) {
      reviewsByShiftMap.set(shiftId, [])
    }
    reviewsByShiftMap.get(shiftId)!.push(reviewObj)
  }

  // 3. Fetch all completed shifts (individual coffee preparations)
  const completedShiftsRes = await db.execute(`
    SELECT
      s.id,
      s.shift_date,
      s.day_of_week,
      s.notes,
      u.id AS barista_id,
      u.display_name AS barista_name,
      u.username AS barista_username,
      u.avatar_palette AS barista_palette,
      u.avatar_variant AS barista_variant
    FROM shifts s
    JOIN users u ON u.id = s.assigned_user_id
    WHERE s.status = 'completed'
    ORDER BY s.shift_date DESC
    LIMIT 100
  `)

  const completedCoffees = completedShiftsRes.rows.map((row) => {
    const shiftId = Number(row.id)
    const reviews = reviewsByShiftMap.get(shiftId) || []
    const reviewsCount = reviews.length
    let avg = null
    if (reviewsCount > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
      avg = Number((sum / reviewsCount).toFixed(1))
    }

    let bPalette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.barista_palette) {
      try {
        const p = JSON.parse(String(row.barista_palette))
        if (Array.isArray(p) && p.length > 0) bPalette = p
      } catch {}
    }

    return {
      shift_id: shiftId,
      shift_date: String(row.shift_date),
      day_of_week: Number(row.day_of_week),
      notes: String(row.notes || ''),
      barista: {
        id: Number(row.barista_id),
        display_name: String(row.barista_name),
        username: String(row.barista_username),
        avatar_palette: bPalette,
        avatar_variant: row.barista_variant ? String(row.barista_variant) : 'beam'
      },
      average_rating: avg,
      reviews_count: reviewsCount,
      reviews
    }
  })

  // 4. Map baristas summary
  const baristas = usersRes.rows.map((row) => {
    const id = Number(row.id)
    const totalReviews = Number(row.total_reviews ?? 0)
    const rawAvg = row.average_rating !== null ? Number(row.average_rating) : null
    const avgRating = rawAvg !== null ? Number(rawAvg.toFixed(1)) : null

    let palette = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
    if (row.avatar_palette) {
      try {
        const p = JSON.parse(String(row.avatar_palette))
        if (Array.isArray(p) && p.length > 0) palette = p
      } catch {}
    }

    const dist = distributionMap.get(id) || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

    return {
      id,
      username: String(row.username),
      display_name: String(row.display_name),
      role: row.role === 'admin' ? 'admin' : 'user',
      participates_in_coffee: Boolean(Number(row.participates_in_coffee)),
      avatar_palette: palette,
      avatar_variant: row.avatar_variant ? String(row.avatar_variant) : 'beam',
      completed_shifts: Number(row.completed_shifts ?? 0),
      total_reviews: totalReviews,
      average_rating: avgRating,
      rating_distribution: dist
    }
  })

  const teamAverage = globalTotalReviews > 0
    ? Number((globalRatingSum / globalTotalReviews).toFixed(1))
    : null

  const ratedBaristas = baristas.filter(b => b.total_reviews > 0 && b.average_rating !== null)
  const topBarista = ratedBaristas.length > 0 ? ratedBaristas[0] : null

  return {
    baristas,
    individual_coffees: completedCoffees,
    all_comments: allComments,
    stats: {
      team_average_rating: teamAverage,
      total_reviews_count: globalTotalReviews,
      total_coffees_made: completedCoffees.length,
      top_barista: topBarista
    }
  }
})
