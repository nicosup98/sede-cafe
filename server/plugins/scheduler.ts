import { processReminder } from '../utils/reminders'

export default defineNitroPlugin(() => {
  // Only start in non-build environments
  if (process.env.NODE_ENV === 'test') return

  console.log('⏰ [Scheduler] Iniciando motor de recordatorios automáticos de Sede Café...')

  let isRunning = false

  const checkScheduledReminders = async () => {
    if (isRunning) return
    isRunning = true

    try {
      // Check morning reminder
      const morningRes = await processReminder({
        type: 'morning',
        checkTimeMatch: true
      })
      if (morningRes.status === 'sent') {
        console.log(`⏰ [Scheduler] Recordatorio de la mañana enviado a ${morningRes.reminded_user} (${morningRes.devices_notified} disp.)`)
      }

      // Check afternoon reminder
      const afternoonRes = await processReminder({
        type: 'afternoon',
        checkTimeMatch: true
      })
      if (afternoonRes.status === 'sent') {
        console.log(`⏰ [Scheduler] Recordatorio previo de la tarde enviado a ${afternoonRes.reminded_user} (${afternoonRes.devices_notified} disp.)`)
      }
    } catch (err) {
      console.error('⏰ [Scheduler] Error al procesar recordatorios automáticos:', err)
    } finally {
      isRunning = false
    }
  }

  // Check every 30 seconds to catch exact minute match accurately
  const timer = setInterval(checkScheduledReminders, 30_000)

  // Initial check after 5 seconds
  setTimeout(checkScheduledReminders, 5_000)

  // Ensure timer does not prevent process termination
  if (timer.unref) {
    timer.unref()
  }
})
