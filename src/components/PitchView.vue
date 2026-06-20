<script setup>
import { computed } from 'vue'
import { ovrTier, POS_CN } from '../utils/random'

const props = defineProps({
  formation: { type: Object, default: null },
  picks: { type: Array, default: () => [] },
  currentIdx: { type: Number, default: -1 },
  mode: { type: String, default: 'full' }, // mini / full
  clickable: { type: Boolean, default: false }
})
const emit = defineEmits(['slot-click'])

const slots = computed(() => props.formation?.slots || [])

function pickAt(idx) {
  return props.picks[idx] || null
}
function showName(p) {
  return p?.player?.name_cn || p?.player?.name_en || ''
}
</script>
<template>
  <div class="pitch">
    <div class="pitch-circle"></div>
    <div class="pitch-box-top"></div>
    <div class="pitch-box-bottom"></div>
    <div class="pitch-small-top"></div>
    <div class="pitch-small-bottom"></div>

    <div
      v-for="s in slots" :key="s.idx"
      class="slot-dot"
      :style="{ left: s.x + '%', bottom: s.y + '%' }"
      @click="clickable && emit('slot-click', s.idx)"
    >
      <div
        :class="[
          'flex flex-col items-center cursor-pointer select-none',
          clickable ? 'hover:scale-110 transition' : ''
        ]"
      >
        <div
          :class="[
            'rounded-full border-2 flex items-center justify-center font-bold',
            mode === 'mini' ? 'w-3 h-3 text-[0px] border-white/70 bg-white/30' : 'w-12 h-12 text-sm border-white bg-white/95 text-navy2',
            currentIdx === s.idx ? 'pulse-gold ring-2 ring-gold' : '',
            pickAt(s.idx)?.player ? '' : 'bg-white/20 text-white/80'
          ]"
        >
          <template v-if="mode !== 'mini'">
            <span v-if="pickAt(s.idx)?.player">{{ pickAt(s.idx).player.squad_no || '' }}</span>
            <span v-else class="text-white">{{ POS_CN[s.pos] || s.pos }}</span>
          </template>
        </div>
        <template v-if="mode !== 'mini' && pickAt(s.idx)?.player">
          <div class="mt-1 text-[10px] sm:text-xs text-white bg-navy2/80 px-1.5 py-0.5 rounded leading-tight max-w-[80px] text-center truncate">
            {{ showName(pickAt(s.idx)) }}
          </div>
          <div :class="['mt-0.5 text-[10px] font-bold rounded px-1.5 py-0.5', ovrTier(pickAt(s.idx).ovrAtPos)]">
            {{ pickAt(s.idx).ovrAtPos }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
