<template>
  <div class="inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full shadow-sm">
    <ClientOnly>
      <Avatar
        :size="size"
        :name="name || 'Usuario'"
        :variant="variant"
        :colors="colors"
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
import Avatar from 'vue-boring-avatars'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    variant?: 'beam' | 'marble' | 'sunset' | 'bauhaus' | 'pixel' | 'ring'
    colors?: string[]
  }>(),
  {
    size: 40,
    variant: 'beam',
    colors: () => ['#5c4033', '#8b5a2b', '#cd853f', '#d2b48c', '#deb887']
  }
)
</script>
