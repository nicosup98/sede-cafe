import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  app: {
    head: {
      title: 'Sede Café — Gestión de Turnos de Café',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'description', content: 'Sistema equitativo de asignación e intercambio de turnos semanales para hacer café' },
        { name: 'theme-color', content: '#20161f' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/icon.svg' }
      ]
    }
  },
  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_URL || process.env.TURSO_DATABASE_URL || 'file:./data/sede-cafe.db',
    tursoAuthToken: process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || '',
    sessionSecret: process.env.SESSION_SECRET || 'sede-cafe-super-secret-key-2026',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || 'kMPU2FZdk1zF_F3KyViN1ydjEQicYzyjsT6-CaFd8x4',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:soporte@sedecafe.local',
    public: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || 'BJro9TqXcGfzvwtBOAz6ZDuoqrFnbEn5rs9fjlC7Piy1FWOGLrV7NHT9qSlNbNCOXza1atVUIMpkw-4JH7msZY4'
    }
  }
})
