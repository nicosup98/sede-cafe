<template>
  <div class="inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full shadow-sm">
    <ClientOnly>
      <Avatar
        :size="size"
        :name="name || 'Usuario'"
        :variant="resolvedVariant"
        :colors="resolvedColors"
      />
      <template #fallback>
        <div
          :style="{ width: `${size}px`, height: `${size}px` }"
          class="rounded-full bg-neutral text-neutral-content flex items-center justify-center font-bold text-xs"
        >
          <span>{{ (name || 'U').slice(0, 2).toUpperCase() }}</span>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Avatar from 'vue-boring-avatars'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    variant?: string
    colors?: string[] | string | null
  }>(),
  {
    size: 40,
    variant: 'beam',
    colors: () => ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
  }
)

const DEFAULT_COLORS = ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']

const resolvedColors = computed<string[]>(() => {
  if (!props.colors) return DEFAULT_COLORS
  if (Array.isArray(props.colors) && props.colors.length > 0) {
    return props.colors
  }
  if (typeof props.colors === 'string') {
    try {
      const parsed = JSON.parse(props.colors)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      const parts = props.colors.split(',').map(s => s.trim()).filter(Boolean)
      if (parts.length > 0) return parts
    }
  }
  return DEFAULT_COLORS
})

const resolvedVariant = computed<'beam' | 'marble' | 'sunset' | 'bauhaus' | 'pixel' | 'ring'>(() => {
  const valid = ['beam', 'marble', 'sunset', 'bauhaus', 'pixel', 'ring']
  return (valid.includes(props.variant || '') ? props.variant : 'beam') as any
})
</script>
