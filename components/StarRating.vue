<template>
  <div class="inline-flex flex-col gap-1.5" :class="{ 'cursor-default': readonly }">
    <!-- Star Visual Bar -->
    <div class="inline-flex items-center gap-1">
      <div class="flex items-center gap-0.5">
        <template v-for="star in 5" :key="star">
          <!-- Interactive or Readonly Star -->
          <div
            class="relative inline-flex items-center justify-center select-none"
            :class="[
              starSizeClass,
              !readonly ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            ]"
          >
            <!-- SVG Star Container -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-full h-full drop-shadow-xs transition-colors"
              :class="getStarColorClass(star)"
              fill="currentColor"
            >
              <defs v-if="getFillType(star) === 'half'">
                <linearGradient :id="'half-grad-' + star + '-' + uniqueId">
                  <stop offset="50%" stop-color="#f59e0b" />
                  <stop offset="50%" stop-color="#d1d5db" stop-opacity="0.4" />
                </linearGradient>
              </defs>
              <path
                :fill="getFillType(star) === 'half' ? `url(#half-grad-${star}-${uniqueId})` : 'currentColor'"
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>

            <!-- Interactive Click Areas (Left half = star - 0.5, Right half = star) -->
            <div
              v-if="!readonly"
              class="absolute inset-0 flex z-10"
            >
              <div
                class="w-1/2 h-full"
                title="Puntuar medio punto menos"
                @click.stop="setRating(star - 0.5)"
              ></div>
              <div
                class="w-1/2 h-full"
                title="Puntuar estrella completa"
                @click.stop="setRating(star)"
              ></div>
            </div>
          </div>
        </template>
      </div>

      <!-- Numeric rating label -->
      <span
        v-if="showValue && (modelValue || modelValue === 0)"
        class="font-black text-amber-500 font-mono tracking-tight ml-1"
        :class="textSizeClass"
      >
        {{ formatRating(modelValue) }}
      </span>
      <span
        v-else-if="showValue && !modelValue"
        class="text-xs text-base-content/70 italic ml-1"
      >
        Sin puntuar
      </span>
    </div>

    <!-- Quick Touch / Click Selector Pills for Mobile & Desktop when Interactive -->
    <div
      v-if="!readonly && showPills"
      class="flex flex-wrap items-center gap-1 pt-1"
    >
      <span class="text-[11px] font-bold text-base-content/70 uppercase tracking-wider mr-1">
        Puntuación:
      </span>
      <button
        v-for="val in allowedRatings"
        :key="val"
        type="button"
        class="btn btn-xs rounded-lg px-2 transition-all font-bold"
        :class="modelValue === val ? 'btn-warning shadow-sm scale-105' : 'btn-ghost border border-base-300 text-base-content/80 hover:bg-base-200'"
        @click="setRating(val)"
      >
        {{ val }} ⭐
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    readonly?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg'
    showValue?: boolean
    showPills?: boolean
  }>(),
  {
    modelValue: null,
    readonly: false,
    size: 'md',
    showValue: true,
    showPills: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const uniqueId = Math.random().toString(36).substring(2, 9)

const allowedRatings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function formatRating(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-'
  return Number.isInteger(val) ? `${val}.0` : `${val}`
}

function setRating(val: number) {
  if (props.readonly) return
  // Clamped between 0.5 and 5.0
  const clamped = Math.max(0.5, Math.min(5, Math.round(val * 2) / 2))
  emit('update:modelValue', clamped)
}

function getFillType(starIndex: number): 'full' | 'half' | 'empty' {
  const current = props.modelValue ?? 0
  if (current >= starIndex) {
    return 'full'
  }
  if (current >= starIndex - 0.5) {
    return 'half'
  }
  return 'empty'
}

function getStarColorClass(starIndex: number): string {
  const fill = getFillType(starIndex)
  if (fill === 'full') {
    return 'text-amber-400'
  }
  if (fill === 'half') {
    return 'text-amber-400'
  }
  return 'text-base-content/20'
}

const starSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3.5 h-3.5'
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-7 h-7'
    default:
      return 'w-5 h-5'
  }
})

const textSizeClass = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-[11px]'
    case 'sm':
      return 'text-xs'
    case 'lg':
      return 'text-base font-extrabold'
    default:
      return 'text-sm'
  }
})
</script>
