import { requireUser } from '../../utils/auth'
import { sendPushToUser } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const results = await sendPushToUser(user.id, {
    title: '☕ Notificación de Prueba — Sede Café',
    body: `¡Hola ${user.display_name}! Tu dispositivo está recibiendo notificaciones push correctamente.`,
    url: '/'
  })

  const sentCount = results.filter(r => r.status === 'fulfilled').length

  return {
    ok: true,
    sentCount,
    message: sentCount > 0
      ? `Notificación enviada a ${sentCount} dispositivo(s).`
      : 'No se encontraron suscripciones activas en este dispositivo o falló el envío.'
  }
})
