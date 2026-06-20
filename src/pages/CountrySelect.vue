<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import { flagEmoji, CONFEDERATION_NAMES } from '../utils/random'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const game = useGameStore()
const router = useRouter()

const filterCat = ref('ALL')

const grouped = computed(() => {
  const list = (game.countriesData?.countries || []).filter(c => {
    if (filterCat.value === 'A') return c.category === 'A'
    if (filterCat.value === 'B') return c.category === 'B'
    return true
  })
  const order = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']
  const map = {}
  list.forEach(c => {
    const k = c.confederation || 'OTHER'
    if (!map[k]) map[k] = []
    map[k].push(c)
  })
  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => (a.strength_tier - b.strength_tier) || a.name_cn.localeCompare(b.name_cn))
  })
  return order.filter(k => map[k]).map(k => ({ key: k, name: CONFEDERATION_NAMES[k] || k, items: map[k] }))
})

const dialog = ref({ visible: false, country: null })

function clickCountry(c) {
  if (c.category === 'B') {
    dialog.value = { visible: true, country: c }
  } else {
    game.selectCountry(c)
    router.push('/formation')
  }
}
function confirmReplace() {
  const c = dialog.value.country
  game.selectCountry(c)
  dialog.value.visible = false
  router.push('/formation')
}
function tierStars(tier) {
  // tier 1=最强=4★，4=最弱=1★
  return '★'.repeat(Math.max(1, 5 - (tier || 4)))
}
</script>
<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6">
    <header class="text-center pt-6 pb-6">
      <div class="inline-flex items-center gap-2">
        <span class="text-3xl sm:text-4xl">⚽</span>
        <h1 class="text-2xl sm:text-4xl font-extrabold tracking-wide">
          <span class="text-gold">群星</span>世界杯
        </h1>
      </div>
      <p class="mt-1 text-sm sm:text-base text-white/80 italic">Stars World Cup · 跨越时空，你的梦幻阵容能走多远</p>
      <p class="mt-4 text-xs sm:text-sm text-white/60 max-w-2xl mx-auto leading-relaxed">
        从 1990 到 2026，十届世界杯的真实球员任你召唤。<br />
        选 1 个国家 · 1 套阵型 · 11 名球员，组建你的跨时代梦幻阵容。
      </p>
    </header>

    <div class="flex justify-center gap-2 mb-4">
      <button :class="filterCat==='ALL' ? 'btn-gold' : 'btn-ghost'" @click="filterCat='ALL'">全部</button>
      <button :class="filterCat==='A' ? 'btn-gold' : 'btn-ghost'" @click="filterCat='A'">2026 参赛队</button>
      <button :class="filterCat==='B' ? 'btn-gold' : 'btn-ghost'" @click="filterCat='B'">情怀队</button>
    </div>

    <section v-for="g in grouped" :key="g.key" class="mb-6">
      <h2 class="text-sm font-bold text-gold/90 uppercase tracking-widest mb-2 px-1">{{ g.name }}</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        <button
          v-for="c in g.items" :key="c.code"
          class="card-glass p-3 text-left hover:border-gold hover:bg-white/10 active:scale-[0.98] transition relative"
          @click="clickCountry(c)"
        >
          <div class="flex items-center gap-2">
            <span class="text-2xl">{{ flagEmoji(c.code) }}</span>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-white truncate">{{ c.name_cn }}</div>
              <div class="text-[10px] text-white/50 truncate">{{ c.name_en }}</div>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-gold text-xs">{{ tierStars(c.strength_tier) }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded', c.category==='A' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40']">
              {{ c.category === 'A' ? '参赛' : '情怀' }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <ConfirmDialog
      :visible="dialog.visible"
      title="情怀队顶替规则"
      :message="dialog.country ? `${dialog.country.name_cn} 未参加 2026 世界杯，将顶替 ${(game.countriesData?.replacement_rules?.find(r=>r.b_code===dialog.country.code)?.a_code) || ''} 出战正赛。\n\n确认选择此情怀队吗？` : ''"
      confirm-text="确认顶替"
      cancel-text="再想想"
      @confirm="confirmReplace"
      @cancel="dialog.visible=false"
    />

    <footer class="text-center text-xs text-white/40 mt-8 pb-6">
      v0.1 · MVP · 数据来源真实历届名单整理
    </footer>
  </div>
</template>
