<script setup>
import { ref, watch, computed } from 'vue'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'
import PitchView from './PitchView.vue'
import { flagEmoji, ovrTier, POS_CN } from '../utils/random'
import { squadOvr } from '../utils/aiSquad'

const props = defineProps({
  visible: { type: Boolean, default: false },
  teamCode: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const game = useGameStore()
const tour = useTournamentStore()

const loading = ref(false)
const picks = ref([])
const errorMsg = ref('')

const team = computed(() => tour.teams.find(t => t.code === props.teamCode) || null)
const isUser = computed(() => game.country?.code === props.teamCode)
const ovr = computed(() => Math.round(squadOvr(picks.value) * 10) / 10)

watch(() => [props.visible, props.teamCode], async ([vis, code]) => {
  if (!vis || !code) return
  picks.value = []
  errorMsg.value = ''
  loading.value = true
  try {
    const res = await tour.ensureSquad(code)
    // 按 slotIdx 重排，保证 PitchView 通过下标取值正确
    const arr = []
    for (const p of (res || [])) {
      arr[p.slotIdx] = p
    }
    picks.value = arr
  } catch (e) {
    errorMsg.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function close() { emit('close') }

// 按 slotIdx 顺序展示球员列表（保持站位编号）
const sortedPicks = computed(() =>
  picks.value.filter(Boolean).slice().sort((a, b) => a.slotIdx - b.slotIdx)
)
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" @click.self="close">
      <div class="card-glass w-full max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar p-4 sm:p-5 relative">
        <button class="absolute top-2 right-3 text-white/60 hover:text-white text-xl" @click="close">✕</button>
        <!-- 头部 -->
        <div class="flex items-center gap-2 mb-3 pr-8">
          <span class="text-3xl">{{ flagEmoji(teamCode) }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <span class="text-lg sm:text-xl font-bold">{{ team?.name_cn || teamCode }}</span>
              <span v-if="isUser" class="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30">您的球队</span>
            </div>
            <div class="text-xs text-white/60">{{ team?.confederation }} · {{ game.formation?.name || game.formation?.id }}</div>
          </div>
          <div v-if="ovr" class="text-right shrink-0">
            <div class="text-[10px] text-white/60">综合</div>
            <div class="text-2xl font-extrabold text-gold leading-none">{{ ovr }}</div>
          </div>
        </div>

        <div v-if="loading" class="py-10 text-center text-white/60 text-sm">阵容加载中...</div>
        <div v-else-if="errorMsg" class="py-10 text-center text-amber-300 text-sm">{{ errorMsg }}</div>

        <template v-else>
          <!-- 球场站位 -->
          <div class="mb-3">
            <PitchView :formation="game.formation" :picks="picks" mode="full" />
          </div>

          <!-- 11 人列表 -->
          <div class="space-y-1.5">
            <div v-for="p in sortedPicks" :key="p.slotIdx"
              class="flex items-center gap-2 bg-white/5 rounded p-2 text-sm">
              <div :class="['rounded shrink-0 w-10 h-10 flex flex-col items-center justify-center font-bold', ovrTier(p.ovrAtPos)]">
                <span class="text-base leading-none">{{ p.ovrAtPos }}</span>
                <span class="text-[8px] mt-0.5 opacity-80">{{ POS_CN[p.slotPos] || p.slotPos }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1 flex-wrap">
                  <span class="font-bold truncate">{{ p.player.name_cn }}</span>
                  <span v-if="p.year" class="text-[10px] text-gold">{{ p.year }}届</span>
                </div>
                <div class="text-[10px] text-white/55 truncate">
                  <span v-if="p.player.squad_no" class="mr-1.5">#{{ p.player.squad_no }}</span>
                  <span v-if="p.player.age" class="mr-1.5">{{ p.player.age }}岁</span>
                  <span class="text-white/40">{{ p.player.name_en }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
