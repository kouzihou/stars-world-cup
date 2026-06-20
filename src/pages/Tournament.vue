<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'
import { flagEmoji } from '../utils/random'
import { rankGroup } from '../utils/tournament'

const router = useRouter()
const game = useGameStore()
const tour = useTournamentStore()

const loading = ref(false)
const loadingText = ref('')

const userCode = computed(() => game.country?.code)
const userGroup = computed(() => tour.userGroup)
const userGroupRanking = computed(() => {
  if (!userGroup.value) return []
  const results = tour.groupResults.filter(r => r.groupId === userGroup.value.id)
  return rankGroup(userGroup.value.teams, results)
})

// 用户在小组赛的下一场比赛
const userNextGroupMatch = computed(() => {
  if (!userCode.value) return null
  for (let r = 1; r <= 3; r++) {
    const fx = tour.fixtures.find(f =>
      f.round === r && (f.home.code === userCode.value || f.away.code === userCode.value)
    )
    if (!fx) continue
    const played = tour.groupResults.find(rr =>
      rr.round === r && (rr.home.code === userCode.value || rr.away.code === userCode.value)
    )
    if (!played) return { fx, round: r }
  }
  return null
})

// 用户在淘汰赛的下一场
const userNextKnockoutMatch = computed(() => {
  for (const stage of ['R32', 'R16', 'QF', 'SF', 'Final']) {
    const matches = tour.knockout[stage]
    if (!matches || (Array.isArray(matches) && !matches.length) || (!Array.isArray(matches) && !matches)) continue
    const arr = Array.isArray(matches) ? matches : [matches]
    const m = arr.find(x => x && x.home && x.away && (x.home.code === userCode.value || x.away.code === userCode.value))
    if (!m) continue
    const resultsKey = stage + '_results'
    const played = (tour.knockout[resultsKey] || []).find(r => r && r.home && (r.home.code === m.home.code) && (r.away.code === m.away.code))
    if (!played) return { stage, match: m }
  }
  return null
})

const groupStageDone = computed(() =>
  tour.fixtures.length > 0 && tour.groupResults.length === tour.fixtures.length
)

async function startGroupAuto() {
  if (loading.value) return
  loading.value = true
  loadingText.value = '生成 47 队 AI 阵容并模拟小组赛...'
  try {
    await tour.simulateAllGroupExceptUser()
    loadingText.value = '小组赛其它场次已模拟完成'
  } catch (e) {
    loadingText.value = '出错: ' + e.message
  } finally {
    loading.value = false
  }
}

async function playUserNext() {
  const next = userNextGroupMatch.value
  if (!next) return
  router.push(`/match/group_R${next.round}`)
}

async function finalizeGroup() {
  // 完成小组赛进入 32 强
  tour.finalizeGroupStage()
  if (tour.userOut) {
    router.push('/trophy')
  }
}

async function playUserKnockout() {
  if (userNextKnockoutMatch.value) {
    // 先模拟该阶段所有不含用户的比赛
    loading.value = true
    loadingText.value = '模拟其它场次...'
    try {
      const stage = userNextKnockoutMatch.value.stage
      await tour.simulateKnockoutStage(stage, nextStageKey(stage))
    } finally {
      loading.value = false
    }
    router.push(`/match/${userNextKnockoutMatch.value.stage}`)
  }
}

function nextStageKey(s) {
  const map = { R32: 'R16', R16: 'QF', QF: 'SF', SF: 'Final' }
  return map[s] || null
}

// 是否当前阶段已完成（用户场+其他场都打完）
const currentStage = computed(() => {
  if (!groupStageDone.value) return 'group'
  if (tour.userOut) return 'out'
  if (!tour.knockout.R32 || !tour.knockout.R32.length) return 'group_done'
  for (const s of ['R32','R16','QF','SF','Final']) {
    const matches = s === 'Final' ? (tour.knockout.Final ? [tour.knockout.Final] : []) : tour.knockout[s]
    if (!matches || !matches.length) continue
    const userIn = matches.some(m => m && m.home && m.away && (m.home.code === userCode.value || m.away.code === userCode.value))
    if (!userIn) continue
    const results = tour.knockout[s + '_results']
    const userPlayed = (results || []).some(r => r && r.home && (r.home.code === userCode.value || r.away.code === userCode.value))
    if (!userPlayed) return s
  }
  return 'done'
})

function reset() {
  tour.$reset()
  game.reset()
  router.push('/')
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-3 sm:p-5">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-4">
      <button class="btn-ghost text-sm" @click="reset">放弃比赛</button>
      <div class="text-center">
        <div class="text-xs text-white/60">2026 群星世界杯</div>
        <div class="font-bold text-gold">
          {{ flagEmoji(userCode) }} {{ game.country?.name_cn }}
          <span class="text-xs text-white/60">/ {{ game.formation?.id }}</span>
        </div>
      </div>
      <div class="w-20"></div>
    </div>

    <!-- 用户队 / 下一场 -->
    <div class="card-glass p-4 mb-4">
      <div class="flex items-baseline justify-between flex-wrap gap-2 mb-2">
        <div class="font-bold text-gold">用户队赛程</div>
        <div class="text-xs text-white/60">综合 {{ game.teamOvr }}</div>
      </div>

      <div v-if="loading" class="text-center text-white/70 py-3">{{ loadingText }}</div>

      <template v-else>
        <!-- 已淘汰 -->
        <div v-if="tour.userOut" class="text-center py-2">
          <div class="text-amber-300 mb-2">您的旅程已结束</div>
          <button class="btn-gold" @click="router.push('/trophy')">查看终局海报</button>
        </div>

        <!-- 小组赛 -->
        <template v-else-if="currentStage === 'group'">
          <div v-if="userNextGroupMatch" class="border border-gold/40 rounded-lg p-3 mb-2 bg-gold/5">
            <div class="text-xs text-gold/80">小组赛第 {{ userNextGroupMatch.round }} 轮</div>
            <div class="flex items-center justify-between mt-1">
              <span class="font-bold">{{ flagEmoji(userNextGroupMatch.fx.home.code) }} {{ userNextGroupMatch.fx.home.name_cn }}</span>
              <span class="text-white/50">VS</span>
              <span class="font-bold">{{ flagEmoji(userNextGroupMatch.fx.away.code) }} {{ userNextGroupMatch.fx.away.name_cn }}</span>
            </div>
            <button class="btn-gold w-full mt-3 text-sm" @click="playUserNext">▶ 模拟此场</button>
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost text-xs flex-1" @click="startGroupAuto" :disabled="loading">
              📊 一键模拟其它场次
            </button>
          </div>
        </template>

        <!-- 小组赛结束待入淘汰赛 -->
        <template v-else-if="currentStage === 'group_done'">
          <div class="text-center py-2">
            <div class="text-emerald-300 mb-2">小组赛结束！</div>
            <button class="btn-gold" @click="finalizeGroup">进入淘汰赛</button>
          </div>
        </template>

        <!-- 淘汰赛 -->
        <template v-else-if="['R32','R16','QF','SF','Final'].includes(currentStage)">
          <div v-if="userNextKnockoutMatch" class="border border-gold/40 rounded-lg p-3 mb-2 bg-gold/5">
            <div class="text-xs text-gold/80">{{ {R32:'32 强',R16:'16 强',QF:'8 强',SF:'4 强',Final:'决赛'}[currentStage] }}</div>
            <div class="flex items-center justify-between mt-1">
              <span class="font-bold">{{ flagEmoji(userNextKnockoutMatch.match.home.code) }} {{ userNextKnockoutMatch.match.home.name_cn }}</span>
              <span class="text-white/50">VS</span>
              <span class="font-bold">{{ flagEmoji(userNextKnockoutMatch.match.away.code) }} {{ userNextKnockoutMatch.match.away.name_cn }}</span>
            </div>
            <button class="btn-gold w-full mt-3 text-sm" @click="playUserKnockout">▶ 出战 {{ {R32:'32 强',R16:'16 强',QF:'8 强',SF:'4 强',Final:'决赛'}[currentStage] }}</button>
          </div>
        </template>

        <!-- 全部完成 -->
        <template v-else-if="currentStage === 'done'">
          <div class="text-center py-2">
            <div class="text-gold mb-2 text-lg font-bold">🏆 您完成了所有比赛！</div>
            <button class="btn-gold" @click="router.push('/trophy')">查看终局海报</button>
          </div>
        </template>
      </template>
    </div>

    <!-- 用户晋级历程 -->
    <div v-if="tour.userPath.length" class="card-glass p-3 mb-4">
      <div class="text-xs text-white/60 mb-1">晋级历程</div>
      <div class="flex flex-wrap gap-1 text-xs">
        <span v-for="(p, i) in tour.userPath" :key="i" class="bg-white/10 px-2 py-1 rounded">{{ p }}</span>
      </div>
    </div>

    <!-- 用户所在小组积分榜 -->
    <div v-if="userGroup" class="card-glass p-3 mb-4">
      <div class="text-sm font-bold text-gold mb-2">{{ userGroup.id }} 组积分榜</div>
      <table class="w-full text-xs">
        <thead class="text-white/50">
          <tr>
            <th class="text-left py-1">球队</th>
            <th class="text-center">P</th>
            <th class="text-center">W</th>
            <th class="text-center">D</th>
            <th class="text-center">L</th>
            <th class="text-center">GD</th>
            <th class="text-center text-gold">分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in userGroupRanking" :key="r.team.code"
            :class="[r.team.code === userCode ? 'bg-gold/10 text-gold font-bold' : '', i < 2 ? '' : i === 2 ? 'text-emerald-300' : 'text-white/60']">
            <td class="py-1">{{ flagEmoji(r.team.code) }} {{ r.team.name_cn }}</td>
            <td class="text-center">{{ r.P }}</td>
            <td class="text-center">{{ r.W }}</td>
            <td class="text-center">{{ r.D }}</td>
            <td class="text-center">{{ r.L }}</td>
            <td class="text-center">{{ r.GD > 0 ? '+' : '' }}{{ r.GD }}</td>
            <td class="text-center text-gold font-bold">{{ r.Pts }}</td>
          </tr>
        </tbody>
      </table>
      <div class="text-[10px] text-white/40 mt-1">前 2 名直接晋级 · 第 3 名争 8 个最佳第三 · 第 4 名小组出局</div>
    </div>

    <!-- 全部小组速览（折叠） -->
    <details class="card-glass p-3">
      <summary class="text-sm cursor-pointer text-white/70">查看全部 12 个小组</summary>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        <div v-for="g in tour.groups" :key="g.id" class="bg-white/5 rounded p-2">
          <div class="text-xs text-gold mb-1">{{ g.id }} 组</div>
          <div v-for="t in g.teams" :key="t.code" class="text-[11px] truncate"
            :class="t.code === userCode ? 'text-gold font-bold' : 'text-white/80'">
            {{ flagEmoji(t.code) }} {{ t.name_cn }}
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
