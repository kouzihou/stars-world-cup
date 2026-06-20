<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'
import PitchView from '../components/PitchView.vue'
import { flagEmoji } from '../utils/random'
import html2canvas from 'html2canvas'

const router = useRouter()
const game = useGameStore()
const tour = useTournamentStore()

const posterEl = ref(null)
const generating = ref(false)

const stageLabel = computed(() => {
  const map = {
    GROUP_OUT: '小组出局',
    R32_OUT: '32 强',
    R16_OUT: '16 强',
    QF_OUT: '8 强',
    SF_OUT: '4 强',
    RUNNER_UP: '亚军',
    CHAMPION: '🏆 冠军'
  }
  return map[tour.userResult] || '未完赛'
})

const trophyColor = computed(() => {
  if (tour.userResult === 'CHAMPION') return 'from-yellow-300 to-amber-500'
  if (tour.userResult === 'RUNNER_UP') return 'from-slate-300 to-slate-500'
  if (tour.userResult === 'SF_OUT') return 'from-amber-700 to-amber-900'
  return 'from-white/30 to-white/10'
})

async function makePoster() {
  if (!posterEl.value || generating.value) return
  generating.value = true
  try {
    const canvas = await html2canvas(posterEl.value, {
      backgroundColor: '#0b1736',
      scale: window.devicePixelRatio > 1 ? 2 : 1.5,
      useCORS: true
    })
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `群星世界杯_${stageLabel.value}_${game.country?.name_cn}_${Date.now()}.png`
    a.click()
  } catch (e) {
    alert('海报生成失败：' + e.message)
  } finally {
    generating.value = false
  }
}

function restart() {
  tour.$reset()
  game.reset()
  router.push('/')
}
</script>

<template>
  <div class="max-w-2xl mx-auto p-3 sm:p-5">
    <div class="flex items-center justify-between mb-3">
      <button class="btn-ghost text-sm" @click="restart">重新开始</button>
      <button class="btn-gold text-sm" @click="makePoster" :disabled="generating">
        {{ generating ? '生成中...' : '📸 生成海报' }}
      </button>
    </div>

    <div ref="posterEl" class="card-glass p-4 sm:p-6">
      <!-- 顶部 -->
      <div class="text-center mb-3">
        <div class="text-xs text-gold tracking-widest">STARS WORLD CUP 2026</div>
        <div class="text-2xl font-extrabold mt-1">
          <span class="text-gold">群星</span>世界杯
        </div>
        <div class="text-xs text-white/60 italic mt-0.5">跨越时空，你的梦幻阵容能走多远</div>
      </div>

      <!-- 战绩徽章 -->
      <div :class="['rounded-xl bg-gradient-to-br', trophyColor, 'p-4 text-center mb-3 text-navy2']">
        <div class="text-xs font-bold opacity-80">最终成绩</div>
        <div class="text-3xl font-extrabold mt-1">{{ stageLabel }}</div>
        <div class="text-sm font-bold mt-1">
          {{ flagEmoji(game.country?.code) }} {{ game.country?.name_cn }}
          <span v-if="game.replacedCountry" class="text-xs opacity-70">(顶替 {{ game.replacedCountry.name_cn }})</span>
        </div>
        <div class="text-xs opacity-80 mt-1">{{ game.nickname }}</div>
      </div>

      <!-- 阵容 -->
      <div class="max-w-[400px] mx-auto mb-3">
        <PitchView :formation="game.formation" :picks="game.picks" mode="full" />
      </div>

      <!-- 战绩条带 -->
      <div class="card-glass p-3 mb-3">
        <div class="text-xs text-white/60 mb-2">晋级历程</div>
        <div class="space-y-1 text-xs">
          <div v-for="(p, i) in tour.userPath" :key="i"
            :class="[
              'border-l-2 pl-2 py-0.5',
              p.includes('胜') ? 'border-emerald-400 text-emerald-200' :
              p.includes('负') ? 'border-red-400 text-red-200' :
              'border-white/30 text-white/80'
            ]">
            {{ p }}
          </div>
        </div>
      </div>

      <!-- 数据卡 -->
      <div class="grid grid-cols-3 gap-2 mb-3 text-center">
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">综合</div>
          <div class="text-lg font-bold text-gold">{{ game.teamOvr }}</div>
        </div>
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">阵型</div>
          <div class="text-lg font-bold">{{ game.formation?.id }}</div>
        </div>
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">跨届</div>
          <div class="text-lg font-bold">{{ game.yearDist.length }} 届</div>
        </div>
      </div>

      <div class="text-center text-[10px] text-white/40 mt-2">
        kouzihou.github.io/stars-world-cup
      </div>
    </div>
  </div>
</template>
