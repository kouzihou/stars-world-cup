<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' }
})
defineEmits(['confirm', 'cancel'])
</script>
<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div class="card-glass w-full max-w-sm p-5 text-white">
        <h3 class="text-lg font-bold text-gold mb-2">{{ title }}</h3>
        <p class="text-sm text-white/90 leading-relaxed whitespace-pre-line">{{ message }}</p>
        <div class="mt-4 flex gap-2 justify-end">
          <button class="btn-ghost" @click="$emit('cancel')">{{ cancelText }}</button>
          <button class="btn-gold" @click="$emit('confirm')">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
