import webpush from 'web-push'
import { useDb } from './db'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

let _vapidInitialized = false

function initVapid() {
  if (_vapidInitialized) return

  let subject = 'mailto:soporte@sedecafe.local'
  let publicKey = 'BJro9TqXcGfzvwtBOAz6ZDuoqrFnbEn5rs9fjlC7Piy1FWOGLrV7NHT9qSlNbNCOXza1atVUIMpkw-4JH7msZY4'
  let privateKey = 'kMPU2FZdk1zF_F3KyViN1ydjEQicYzyjsT6-CaFd8x4'

  try {
    const config = useRuntimeConfig()
    subject = config.vapidSubject || process.env.VAPID_SUBJECT || subject
    publicKey = (config.public?.vapidPublicKey as string) || process.env.VAPID_PUBLIC_KEY || publicKey
    privateKey = (config.vapidPrivateKey as string) || process.env.VAPID_PRIVATE_KEY || privateKey
  } catch {
    subject = process.env.VAPID_SUBJECT || subject
    publicKey = process.env.VAPID_PUBLIC_KEY || publicKey
    privateKey = process.env.VAPID_PRIVATE_KEY || privateKey
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  _vapidInitialized = true
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  initVapid()
  const db = await useDb()

  const subsRes = await db.execute({
    sql: 'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    args: [userId]
  })

  const results = await Promise.allSettled(
    subsRes.rows.map(async (sub) => {
      const subId = Number(sub.id)
      const pushConfig = {
        endpoint: String(sub.endpoint),
        keys: {
          p256dh: String(sub.p256dh),
          auth: String(sub.auth)
        }
      }

      try {
        await webpush.sendNotification(pushConfig, JSON.stringify(payload))
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or unregistered -> cleanup
          await db.execute({
            sql: 'DELETE FROM push_subscriptions WHERE id = ?',
            args: [subId]
          })
        }
        throw err
      }
    })
  )

  return results
}

export async function sendPushToAll(payload: PushPayload, excludeUserId?: number) {
  initVapid()
  const db = await useDb()

  let sql = 'SELECT id, endpoint, p256dh, auth, user_id FROM push_subscriptions'
  const args: any[] = []

  if (excludeUserId) {
    sql += ' WHERE user_id != ?'
    args.push(excludeUserId)
  }

  const subsRes = await db.execute({ sql, args })

  const results = await Promise.allSettled(
    subsRes.rows.map(async (sub) => {
      const subId = Number(sub.id)
      const pushConfig = {
        endpoint: String(sub.endpoint),
        keys: {
          p256dh: String(sub.p256dh),
          auth: String(sub.auth)
        }
      }

      try {
        await webpush.sendNotification(pushConfig, JSON.stringify(payload))
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.execute({
            sql: 'DELETE FROM push_subscriptions WHERE id = ?',
            args: [subId]
          })
        }
      }
    })
  )

  return results
}
