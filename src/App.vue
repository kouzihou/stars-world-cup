<script setup>
import { onMounted } from 'vue'
import { useGameStore } from './store/game'
const game = useGameStore()
onMounted(async () => {
  await game.bootstrap()
})
</script>
<template>
  <div class="min-h-full">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </div>
</template>
<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
