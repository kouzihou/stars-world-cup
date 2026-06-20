<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import PitchView from '../components/PitchView.vue'
import { flagEmoji } from '../utils/random'

const game = useGameStore()
const router = useRouter()
const formations = computed(() => game.formationsData?.formations || [])

function pick(f) {
  game.selectFormation(f)
  router.push('/pick')
}
function back() { router.push('/') }
</script>
<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6">
    <div class="flex items-center justify-between mb-4">
      <button class="btn-ghost text-sm" @click="back">← 重选国家</button>
      <div class="text-right">
        <div class="text-sm text-white/70">出战球队</div>
        <div class="font-bold text-gold text-lg">
          {{ flagEmoji(game.country?.code) }} {{ game.country?.name_cn }}
          <span v-if="game.replacedCountry" class="text-xs text-white/60 ml-1">(顶替 {{ game.replacedCountry.name_cn }})</span>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-center mb-4">选择阵型</h2>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      <button
        v-for="f in formations" :key="f.id"
        class="card-glass p-3 hover:border-gold hover:bg-white/10 active:scale-[0.98] transition"
        @click="pick(f)"
      >
        <div class="aspect-[2/3] mb-2">
          <PitchView :formation="f" :picks="[]" mode="mini" />
        </div>
        <div class="text-center font-bold text-gold">{{ f.id }}</div>
        <div class="text-center text-[11px] text-white/70 mt-0.5 leading-tight">{{ f.description }}</div>
      </button>
    </div>
  </div>
</template>
