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
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema equitativo de asignación e intercambio de turnos semanales para hacer café' }
      ]
    }
  },
  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || 'file:./data/sede-cafe.db',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    sessionSecret: process.env.SESSION_SECRET || 'sede-cafe-super-secret-key-2026'
  }
})
