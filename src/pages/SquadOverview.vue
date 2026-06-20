<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import PitchView from '../components/PitchView.vue'
import { flagEmoji } from '../utils/random'
import html2canvas from 'html2canvas'

const game = useGameStore()
const router = useRouter()

const editing = ref(false)
const nicknameInput = ref('')
const posterEl = ref(null)
const generating = ref(false)

const yearDist = computed(() => game.yearDist)
const ovr = computed(() => game.teamOvr)
const avgAge = computed(() => game.avgAge)

function startEdit() {
  nicknameInput.value = game.nickname
  editing.value = true
}
function saveNickname() {
  if (nicknameInput.value.trim()) {
    game.setNickname(nicknameInput.value.trim().slice(0, 20))
    try { localStorage.setItem('swc_nickname', game.nickname) } catch {}
  }
  editing.value = false
}

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
    a.download = `群星世界杯_${game.country?.name_cn || ''}_${Date.now()}.png`
    a.click()
  } catch (e) {
    alert('海报生成失败：' + e.message)
  } finally {
    generating.value = false
  }
}

function restart() {
  game.reset()
  router.push('/')
}

onMounted(() => {
  try {
    const n = localStorage.getItem('swc_nickname')
    if (n && !game.nickname.startsWith('球迷')) game.setNickname(n)
    else if (n) game.setNickname(n)
  } catch {}
})
</script>
<template>
  <div class="max-w-4xl mx-auto p-3 sm:p-6">
    <div class="flex items-center justify-between mb-3">
      <button class="btn-ghost text-sm" @click="restart">重新开始</button>
      <button class="btn-gold text-sm" @click="makePoster" :disabled="generating">
        {{ generating ? '生成中...' : '📸 生成海报' }}
      </button>
    </div>

    <!-- 海报截屏区域 -->
    <div ref="posterEl" class="card-glass p-4 sm:p-6">
      <!-- 顶部：LOGO + 用户 + 队伍 -->
      <div class="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div>
          <div class="text-xs text-gold tracking-widest">STARS WORLD CUP</div>
          <div class="text-xl sm:text-2xl font-extrabold">
            <span class="text-gold">群星</span>世界杯
          </div>
        </div>
        <div class="text-right">
          <button class="text-sm font-bold text-white/90 hover:text-gold" @click="startEdit">
            {{ game.nickname }} <span class="text-xs text-white/50">✎</span>
          </button>
          <div class="text-xs text-white/60 mt-0.5 italic">跨越时空，你的梦幻阵容能走多远</div>
        </div>
      </div>

      <!-- 队伍信息条 -->
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="text-3xl">{{ flagEmoji(game.country?.code) }}</span>
          <div>
            <div class="font-bold text-lg">{{ game.country?.name_cn }}</div>
            <div v-if="game.replacedCountry" class="text-[10px] text-amber-300">情怀队 · 顶替 {{ game.replacedCountry.name_cn }}</div>
            <div class="text-xs text-white/60">{{ game.formation?.id }} · {{ game.formation?.name }}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-white/60">综合评分</div>
          <div class="text-3xl font-extrabold text-gold leading-none">{{ ovr }}</div>
        </div>
      </div>

      <!-- 球场 -->
      <div class="max-w-[440px] mx-auto mb-4">
        <PitchView :formation="game.formation" :picks="game.picks" mode="full" />
      </div>

      <!-- 战绩条带 -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">综合 OVR</div>
          <div class="text-lg font-bold text-gold">{{ ovr }}</div>
        </div>
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">平均年龄</div>
          <div class="text-lg font-bold">{{ avgAge }}</div>
        </div>
        <div class="card-glass py-2">
          <div class="text-[10px] text-white/60">跨届数</div>
          <div class="text-lg font-bold">{{ yearDist.length }}</div>
        </div>
      </div>

      <!-- 跨届分布 -->
      <div class="mt-3 card-glass p-3">
        <div class="text-xs text-white/70 mb-2">跨届分布</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="[y, n] in yearDist" :key="y" class="text-[11px] bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
            {{ y }} × {{ n }}
          </span>
        </div>
      </div>

      <!-- 阵容名单 -->
      <details class="mt-3">
        <summary class="text-xs text-white/70 cursor-pointer">查看完整名单</summary>
        <div class="mt-2 space-y-1 text-xs">
          <div v-for="(p, i) in game.picks" :key="i" class="flex items-center gap-2 py-1 border-b border-white/5">
            <span class="text-white/50 w-4">{{ i + 1 }}</span>
            <span class="text-white/70 w-10">{{ p.slotPos }}</span>
            <span class="font-bold text-white flex-1 truncate">{{ p.player?.name_cn }}</span>
            <span class="text-white/50 text-[10px]">{{ p.year }}</span>
            <span class="text-gold font-bold w-8 text-right">{{ p.ovrAtPos }}</span>
          </div>
        </div>
      </details>

      <div class="mt-4 text-center text-[10px] text-white/40">
        kouzihou.github.io/stars-world-cup
      </div>
    </div>

    <!-- 昵称编辑 -->
    <div v-if="editing" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div class="card-glass w-full max-w-sm p-5">
        <h3 class="text-lg font-bold text-gold mb-2">修改昵称</h3>
        <input v-model="nicknameInput" maxlength="20" class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-gold" placeholder="输入昵称" />
        <div class="mt-3 flex gap-2 justify-end">
          <button class="btn-ghost" @click="editing=false">取消</button>
          <button class="btn-gold" @click="saveNickname">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
