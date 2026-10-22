<template>
  <div :data-theme="theme" class="min-h-screen bg-base-200 text-base-content transition-colors duration-200">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const theme = useState<string>('sede_cafe_theme', () => 'cupcake')

useHead({
  htmlAttrs: {
    'data-theme': theme
  }
})

watch(theme, (newTheme) => {
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('sede_cafe_theme', newTheme)
  }
}, { immediate: true })

onMounted(() => {
  const saved = localStorage.getItem('sede_cafe_theme')
  if (saved && (saved === 'coffee' || saved === 'cupcake' || saved === 'dark' || saved === 'light')) {
    theme.value = saved
  }
  document.documentElement.setAttribute('data-theme', theme.value)
})
</script>
