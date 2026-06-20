<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'
import { flagEmoji } from '../utils/random'

const route = useRoute()
const router = useRouter()
const game = useGameStore()
const tour = useTournamentStore()

const stage = ref(route.params.stage || 'group') // 'group_R1' / 'group_R2' / ... / 'R32' / 'R16' / 'QF' / 'SF' / 'Final'
const matchData = ref(null)
const events = ref([])
const visibleEvents = ref([])
const score = ref([0, 0])
const minute = ref(0)
const playing = ref(false)
const finished = ref(false)
const result = ref(null)
const errorMsg = ref('')

const home = computed(() => matchData.value?.home)
const away = computed(() => matchData.value?.away)

let timer = null
let scrollEl = null

async function loadMatch() {
  errorMsg.value = ''
  try {
    const stageKey = route.params.stage
    if (stageKey.startsWith('group')) {
      // group_R1 / group_R2 / group_R3
      const round = Number(stageKey.split('_R')[1])
      // 用户队该轮次的对手
      const userCode = game.country.code
      const fx = tour.fixtures.find(f =>
        f.round === round && (f.home.code === userCode || f.away.code === userCode)
      )
      if (!fx) { errorMsg.value = '找不到本轮比赛'; return }
      matchData.value = { home: fx.home, away: fx.away, fixture: fx }
      const r = await tour.runMatch(fx.home, fx.away, { salt: 'G' + round, allowDraw: true })
      events.value = r.events
      result.value = r
      // 记录小组赛结果
      tour.recordGroupResult({ groupId: fx.groupId, round: fx.round, home: fx.home, away: fx.away, homeScore: r.homeScore, awayScore: r.awayScore })
    } else {
      // 淘汰赛
      const stageKey2 = route.params.stage
      const matches = tour.knockout[stageKey2] || []
      const userCode = game.country.code
      const idx = matches.findIndex(m => m.home && m.away && (m.home.code === userCode || m.away.code === userCode))
      if (idx < 0) { errorMsg.value = '用户队未进入此阶段'; return }
      const m = matches[idx]
      matchData.value = { home: m.home, away: m.away, idx, stageKey: stageKey2 }
      const r = await tour.runMatch(m.home, m.away, { salt: stageKey2, allowDraw: false })
      events.value = r.events
      result.value = r
      tour.setUserMatchResult(stageKey2, idx, { homeScore: r.homeScore, awayScore: r.awayScore, events: r.events, penalties: r.penalties, homeWin: r.homeWin })
    }
    play()
  } catch (e) {
    errorMsg.value = e.message
  }
}

function play() {
  playing.value = true
  let i = 0
  timer = setInterval(() => {
    if (i >= events.value.length) {
      clearInterval(timer); timer = null
      playing.value = false
      finished.value = true
      onFinish()
      return
    }
    const ev = events.value[i++]
    visibleEvents.value.push(ev)
    minute.value = ev.min
    if (ev.type === 'goal') score.value = ev.score
    // 自动滚动
    setTimeout(() => {
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight
    }, 30)
  }, 800)
}

function skip() {
  if (timer) { clearInterval(timer); timer = null }
  visibleEvents.value = events.value.slice()
  if (result.value) score.value = [result.value.homeScore, result.value.awayScore]
  minute.value = 90
  playing.value = false
  finished.value = true
  onFinish()
}

function onFinish() {
  if (!matchData.value || !result.value) return
  const stageKey = route.params.stage
  const userCode = game.country.code
  const isHome = matchData.value.home.code === userCode
  const userScore = isHome ? result.value.homeScore : result.value.awayScore
  const oppScore = isHome ? result.value.awayScore : result.value.homeScore
  const opponent = isHome ? matchData.value.away : matchData.value.home

  if (stageKey.startsWith('group')) {
    // 小组赛不立即判出局
  } else {
    // 淘汰赛：判用户胜负
    const userWon = isHome ? result.value.homeWin : !result.value.homeWin
    tour.advanceUserPath(stageKey, userWon, opponent, `${userScore}-${oppScore}${result.value.penalties ? '(点)' : ''}`)
    if (stageKey === 'Final') {
      tour.userResult = userWon ? 'CHAMPION' : 'RUNNER_UP'
    }
  }
}

const simulating = ref(false)

async function nextAction() {
  const stageKey = route.params.stage
  if (stageKey.startsWith('group')) {
    router.push('/tournament')
    return
  }
  // 淘汰赛：用户输了 → 补模拟剩余赛事再去 Trophy；用户赢了/夺冠 → 回 Tournament
  if (tour.userOut && tour.userResult !== 'CHAMPION' && tour.userResult !== 'RUNNER_UP') {
    simulating.value = true
    try {
      await tour.simulateRemainingTournament()
    } finally {
      simulating.value = false
    }
    router.push('/trophy')
    return
  }
  if (tour.userResult === 'CHAMPION' || tour.userResult === 'RUNNER_UP') {
    router.push('/trophy')
    return
  }
  router.push('/tournament')
}

onMounted(() => {
  if (!tour.initialized) { router.push('/tournament'); return }
  // 自动滚动 ref
  setTimeout(() => { scrollEl = document.getElementById('match-scroll') }, 50)
  loadMatch()
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="max-w-2xl mx-auto p-3 sm:p-5">
    <div v-if="errorMsg" class="card-glass p-4 text-amber-300 text-center">
      {{ errorMsg }}
      <div class="mt-3"><button class="btn-gold text-sm" @click="router.push('/tournament')">返回赛程</button></div>
    </div>
    <template v-else>
      <!-- 顶部比分条 -->
      <div class="card-glass p-4 mb-3">
        <div class="text-center text-xs text-white/60 mb-1">{{ route.params.stage.replace('group_R', '小组赛第 ').replace('R', '').replace(/^32$/, '32强').replace(/^16$/, '16强').replace(/^QF$/, '8强').replace(/^SF$/, '4强').replace(/^Final$/, '决赛') }}</div>
        <div class="flex items-center justify-between">
          <div class="text-center flex-1">
            <div class="text-3xl">{{ flagEmoji(home?.code) }}</div>
            <div class="font-bold mt-1">{{ home?.name_cn }}</div>
          </div>
          <div class="text-center px-2">
            <div class="text-4xl font-extrabold text-gold leading-none">{{ score[0] }} - {{ score[1] }}</div>
            <div class="text-xs text-white/60 mt-1">{{ minute }}'</div>
          </div>
          <div class="text-center flex-1">
            <div class="text-3xl">{{ flagEmoji(away?.code) }}</div>
            <div class="font-bold mt-1">{{ away?.name_cn }}</div>
          </div>
        </div>
        <!-- 时间条 -->
        <div class="mt-3 w-full bg-white/10 rounded-full h-1 overflow-hidden">
          <div class="bg-gold h-full transition-all" :style="{ width: (minute / 90 * 100) + '%' }"></div>
        </div>
      </div>

      <!-- 解说滚动 -->
      <div id="match-scroll" class="card-glass p-3 h-[50vh] overflow-y-auto no-scrollbar space-y-2">
        <div v-for="(ev, i) in visibleEvents" :key="i"
          :class="[
            'rounded-lg p-2 text-sm leading-relaxed',
            ev.type === 'goal' ? 'bg-gold/15 border border-gold/40 text-gold font-bold' :
            ev.type === 'half' || ev.type === 'open' || ev.type === 'end' ? 'bg-navy/30 text-white/80 italic text-center' :
            ev.type === 'miss' ? 'bg-red-500/10 text-red-200' :
            ev.type === 'foul' ? 'bg-amber-500/10 text-amber-200' :
            'bg-white/5 text-white/85'
          ]">
          {{ ev.text }}
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="mt-3 flex gap-2 justify-center items-center">
        <button v-if="playing" class="btn-ghost" @click="skip">⏭ 跳到终场</button>
        <button v-else-if="finished && !simulating" class="btn-gold" @click="nextAction">
          {{ tour.userOut && tour.userResult !== 'CHAMPION' && tour.userResult !== 'RUNNER_UP' ? '查看终局海报 →' : '查看赛程 →' }}
        </button>
        <span v-if="simulating" class="text-white/70 text-sm">模拟剩余赛事，决出冠军...</span>
      </div>

      <!-- 点球（如有） -->
      <div v-if="finished && result?.penalties" class="mt-3 card-glass p-3 text-sm">
        <div class="text-gold font-bold mb-2">点球大战 {{ result.penalties.hg }}-{{ result.penalties.ag }}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div v-for="(r, i) in result.penalties.events" :key="i" class="border-b border-white/5 pb-1">
            <div :class="r.home.hit ? 'text-emerald-300' : 'text-red-300'">
              {{ r.home.player }} {{ r.home.hit ? '✓' : '✗' }}
            </div>
            <div :class="r.away.hit ? 'text-emerald-300' : 'text-red-300'">
              {{ r.away.player }} {{ r.away.hit ? '✓' : '✗' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
