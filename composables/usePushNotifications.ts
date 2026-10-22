function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const config = useRuntimeConfig()
  const vapidPublicKey = config.public?.vapidPublicKey as string

  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission | 'unsupported'>('default')
  const loading = ref(false)

  async function checkStatus() {
    if (!import.meta.client) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      permission.value = 'unsupported'
      isSupported.value = false
      return
    }

    isSupported.value = true
    permission.value = Notification.permission

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.getSubscription()
      isSubscribed.value = !!sub
    } catch (e) {
      // ignore
    }
  }

  async function subscribe(): Promise<boolean> {
    if (!import.meta.client || !isSupported.value) return false
    loading.value = true

    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') {
        loading.value = false
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        })
      }

      await $fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: sub.toJSON()
      })

      isSubscribed.value = true
      return true
    } catch (err) {
      console.error('Error al suscribir notificaciones push:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function unsubscribe(): Promise<boolean> {
    if (!import.meta.client || !isSupported.value) return false
    loading.value = true

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        await $fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          body: { endpoint: sub.endpoint }
        })
        await sub.unsubscribe()
      }

      isSubscribed.value = false
      return true
    } catch (err) {
      console.error('Error al desuscribir notificaciones:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function sendTest() {
    return await $fetch('/api/notifications/test', {
      method: 'POST'
    })
  }

  onMounted(() => {
    checkStatus()
  })

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
    checkStatus
  }
}
