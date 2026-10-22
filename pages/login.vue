<template>
  <div class="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-base-200 via-base-300 to-base-200">
    <div class="max-w-md w-full">
      <!-- Header Brand -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-content shadow-lg mb-3 text-3xl">
          ☕
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight">Sede Café</h1>
        <p class="text-sm opacity-75 mt-1">
          Asignación semanal equitativa e intercambio de turnos de café
        </p>
      </div>

      <!-- Card -->
      <div class="card bg-base-100 shadow-xl border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg justify-center mb-2">Iniciar Sesión</h2>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-medium">Usuario</span>
              </label>
              <input
                v-model="form.username"
                type="text"
                placeholder="ej. admin, carlos, maria..."
                class="input input-bordered w-full"
                required
                autocomplete="username"
                autofocus
              />
            </div>

            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-medium">PIN / Contraseña</span>
              </label>
              <input
                v-model="form.pin"
                type="password"
                placeholder="••••"
                class="input input-bordered w-full tracking-widest text-lg"
                required
                autocomplete="current-password"
              />
            </div>

            <div v-if="errorMsg" class="alert alert-error text-sm py-2">
              <span>{{ errorMsg }}</span>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-full"
              :disabled="loading"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <span>Entrar al Panel de Café</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const form = reactive({
  username: '',
  pin: ''
})

const loading = ref(false)
const errorMsg = ref('')

const { data: meData } = await useFetch('/api/auth/me')
if (meData.value?.user) {
  await navigateTo('/')
}

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: form.username,
        pin: form.pin
      }
    })
    await router.push('/')
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Error al iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>
