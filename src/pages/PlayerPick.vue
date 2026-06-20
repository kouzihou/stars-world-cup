<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import PitchView from '../components/PitchView.vue'
import PlayerCard from '../components/PlayerCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { POS_CN, flagEmoji } from '../utils/random'

const game = useGameStore()
const router = useRouter()

const loading = ref(false)
const errorMsg = ref('')
const candidates = ref([])
const drawnYear = ref(null)
const resetDialog = ref(false)

const currentSlot = computed(() => game.formation?.slots?.[game.currentSlotIdx])

async function loadForCurrent() {
  if (!game.country || !game.formation) return
  loading.value = true
  errorMsg.value = ''
  candidates.value = []
  try {
    const res = await game.getCandidates(game.currentSlotIdx)
    if (!res || !res.year) {
      errorMsg.value = '该位置已无可用球员，建议重置阵容。'
      candidates.value = []
      drawnYear.value = null
      return
    }
    drawnYear.value = res.year
    candidates.value = res.candidates
  } catch (e) {
    errorMsg.value = '加载失败：' + e.message
  } finally {
    loading.value = false
  }
}

function onPick(c) {
  game.pickPlayer({
    slotIdx: game.currentSlotIdx,
    year: drawnYear.value,
    player: c.player,
    ovrAtPos: c.ovrAtPos
  })
  if (game.completedCount >= 11) {
    router.push('/squad')
  } else {
    loadForCurrent()
  }
}

function reroll() {
  // 重新随机一届（同 slot）
  loadForCurrent()
}

function confirmReset() {
  game.reset()
  resetDialog.value = false
  router.push('/')
}

function selectSlot(idx) {
  // 仅允许查看进度，不允许跳过未填的 slot
  if (game.picks[idx]?.player) return
  if (idx === game.currentSlotIdx) return
  // 不允许向前跳
}

onMounted(() => {
  if (!game.formation) {
    router.push('/')
    return
  }
  loadForCurrent()
})

watch(() => game.currentSlotIdx, () => {
  // 由 pickPlayer 内部管理
})

const ovrSummary = computed(() => {
  const list = game.picks.filter(p => p && p.player)
  if (!list.length) return 0
  return Math.round(list.reduce((a, p) => a + p.ovrAtPos, 0) / list.length)
})
</script>
<template>
  <div class="max-w-6xl mx-auto p-3 sm:p-6">
    <div class="flex items-center justify-between mb-3">
      <button class="btn-ghost text-sm" @click="resetDialog=true">重新开始</button>
      <div class="text-right">
        <div class="text-xs text-white/60">{{ flagEmoji(game.country?.code) }} {{ game.country?.name_cn }} · {{ game.formation?.id }}</div>
        <div class="text-sm font-bold text-gold">已选 {{ game.completedCount }} / 11 · 综合 {{ ovrSummary }}</div>
      </div>
    </div>

    <div class="w-full bg-white/10 rounded-full h-1.5 mb-4 overflow-hidden">
      <div class="bg-gold h-full transition-all" :style="{ width: (game.completedCount / 11 * 100) + '%' }"></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <!-- 球场 -->
      <div class="md:sticky md:top-3 md:self-start">
        <div class="max-w-[420px] mx-auto">
          <PitchView
            :formation="game.formation"
            :picks="game.picks"
            :current-idx="game.currentSlotIdx"
            mode="full"
            :clickable="false"
            @slot-click="selectSlot"
          />
        </div>
      </div>

      <!-- 候选 -->
      <div>
        <div class="card-glass p-3 sm:p-4 mb-3">
          <div class="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <span class="text-xs text-white/60">第 {{ game.currentSlotIdx + 1 }} 个位置</span>
              <div class="font-bold text-lg text-gold">{{ POS_CN[currentSlot?.pos] || currentSlot?.pos }}</div>
            </div>
            <div v-if="drawnYear" class="text-right">
              <span class="text-xs text-white/60">系统抽中</span>
              <div class="font-bold text-lg">{{ drawnYear }} 年世界杯</div>
            </div>
          </div>
          <div class="mt-2 flex gap-2">
            <button class="btn-ghost text-xs" @click="reroll" :disabled="loading">🎲 换一届</button>
          </div>
        </div>

        <div v-if="loading" class="text-center text-white/60 py-8">加载中…</div>
        <div v-else-if="errorMsg" class="card-glass p-4 text-center text-amber-300">
          {{ errorMsg }}
          <div class="mt-3"><button class="btn-gold text-sm" @click="resetDialog=true">重置阵容</button></div>
        </div>
        <div v-else class="space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          <PlayerCard
            v-for="(c, i) in candidates" :key="c.player.id + '_' + i"
            :player="c.player"
            :ovr-at-pos="c.ovrAtPos"
            :pos="currentSlot?.pos"
            :year="drawnYear"
            @pick="onPick(c)"
          />
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="resetDialog"
      title="确认重新开始"
      message="当前阵容将清空，回到选国家页面。"
      confirm-text="重新开始"
      cancel-text="再想想"
      @confirm="confirmReset"
      @cancel="resetDialog=false"
    />
  </div>
</template>
