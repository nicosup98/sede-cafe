import { requireUser } from '../../utils/auth'
import { useDb } from '../../utils/db'

const VALID_VARIANTS = ['beam', 'marble', 'sunset', 'bauhaus', 'pixel', 'ring']

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  if (!body || !Array.isArray(body.colors) || body.colors.length !== 5) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes proporcionar una paleta de exactamente 5 colores.'
    })
  }

  // Validate hex colors
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
  const cleanColors = body.colors.map((c: any) => {
    const s = String(c || '').trim()
    return hexRegex.test(s) ? s : '#5c4033'
  })

  let variant = 'beam'
  if (body.variant && VALID_VARIANTS.includes(String(body.variant).toLowerCase())) {
    variant = String(body.variant).toLowerCase()
  }

  const db = await useDb()
  const paletteJson = JSON.stringify(cleanColors)

  await db.execute({
    sql: 'UPDATE users SET avatar_palette = ?, avatar_variant = ? WHERE id = ?',
    args: [paletteJson, variant, user.id]
  })

  return {
    ok: true,
    avatar_palette: cleanColors,
    avatar_variant: variant
  }
})
