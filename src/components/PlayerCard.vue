<script setup>
import { ovrTier, POS_CN } from '../utils/random'
const props = defineProps({
  player: { type: Object, required: true },
  ovrAtPos: { type: Number, required: true },
  pos: { type: String, required: true },
  year: { type: Number, default: null }
})
defineEmits(['pick'])
</script>
<template>
  <button
    class="card-glass w-full text-left p-3 sm:p-4 hover:bg-white/10 active:scale-[0.99] transition flex items-center gap-3"
    @click="$emit('pick')"
  >
    <div :class="['rounded-lg shrink-0 w-14 h-14 flex flex-col items-center justify-center font-bold', ovrTier(ovrAtPos)]">
      <span class="text-2xl leading-none">{{ ovrAtPos }}</span>
      <span class="text-[10px] mt-0.5">{{ POS_CN[pos] || pos }}</span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2 flex-wrap">
        <span class="text-base sm:text-lg font-bold text-white truncate">{{ player.name_cn }}</span>
        <span class="text-xs text-white/60 truncate">{{ player.name_en }}</span>
      </div>
      <div class="text-xs text-white/70 mt-0.5">
        <span v-if="player.squad_no" class="mr-2">#{{ player.squad_no }}</span>
        <span v-if="player.age" class="mr-2">{{ player.age }} 岁</span>
        <span v-if="year" class="mr-2 text-gold">{{ year }} 届</span>
      </div>
      <div v-if="player.tags && player.tags.length" class="mt-1 flex flex-wrap gap-1">
        <span v-for="t in player.tags.slice(0, 4)" :key="t" class="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">{{ t }}</span>
      </div>
    </div>
  </button>
</template>
