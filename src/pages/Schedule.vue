<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import { useTournamentStore } from '../store/tournament'
import { rankGroup } from '../utils/tournament'
import { flagEmoji } from '../utils/random'
import SquadDialog from '../components/SquadDialog.vue'

const router = useRouter()
const game = useGameStore()
const tour = useTournamentStore()

const dialogTeam = ref('')
const dialogVisible = ref(false)
function showSquad(code) {
  if (!code) return
  dialogTeam.value = code
  dialogVisible.value = true
}
function closeDialog() { dialogVisible.value = false }

const userCode = computed(() => game.country?.code)

// 小组赛各组排名 + 比分汇总
const groupBoards = computed(() => tour.groups.map(g => {
  const matches = tour.groupResults.filter(r => r.groupId === g.id)
  const ranking = rankGroup(g.teams, matches)
  // 提取 6 场比赛（按轮次）
  const fixturesOrdered = tour.fixtures
    .filter(f => f.groupId === g.id)
    .map(f => {
      const r = matches.find(m => m.round === f.round && m.home.code === f.home.code && m.away.code === f.away.code)
      return { ...f, ...(r ? { homeScore: r.homeScore, awayScore: r.awayScore, played: true } : { played: false }) }
    })
    .sort((a, b) => a.round - b.round)
  return { group: g, ranking, fixtures: fixturesOrdered }
}))

// 8 个最佳第三：从 12 组第三名按 Pts/GD/GF 排，取前 8 个
const bestThirds = computed(() => {
  const thirds = groupBoards.value
    .filter(b => b.ranking.length >= 3)
    .map(b => ({ ...b.ranking[2], groupId: b.group.id }))
  if (!thirds.length) return { qualified: [], eliminated: [] }
  const sorted = thirds.slice().sort((a, b) => (b.Pts - a.Pts) || (b.GD - a.GD) || (b.GF - a.GF))
  return { qualified: sorted.slice(0, 8), eliminated: sorted.slice(8) }
})

// 淘汰赛各阶段
const stageInfo = [
  { key: 'R32', label: '32 强' },
  { key: 'R16', label: '16 强' },
  { key: 'QF', label: '8 强' },
  { key: 'SF', label: '4 强' },
  { key: 'Final', label: '决赛' }
]

function knockoutMatchView(stage, m, idx) {
  const resultsKey = stage + '_results'
  const r = (tour.knockout[resultsKey] || [])[idx]
  return { home: m.home, away: m.away, played: !!r, homeScore: r?.homeScore, awayScore: r?.awayScore, homeWin: r?.homeWin, penalties: r?.penalties }
}

const champion = computed(() => {
  const finalMatches = tour.knockout.Final || []
  const finalResults = tour.knockout.Final_results || []
  if (!finalMatches.length || !finalResults.length || !finalResults[0]) return null
  const r = finalResults[0]
  if (typeof r.homeWin !== 'boolean') return null
  return r.homeWin ? r.home : r.away
})

const runnerUp = computed(() => {
  const finalMatches = tour.knockout.Final || []
  const finalResults = tour.knockout.Final_results || []
  if (!finalMatches.length || !finalResults.length || !finalResults[0]) return null
  const r = finalResults[0]
  if (typeof r.homeWin !== 'boolean') return null
  return r.homeWin ? r.away : r.home
})
</script>

<template>
  <div class="max-w-5xl mx-auto p-3 sm:p-5">
    <!-- 顶部 -->
    <div class="flex items-center justify-between mb-3">
      <button class="btn-ghost text-sm" @click="router.back()">← 返回</button>
      <div class="text-center">
        <div class="text-xs text-white/60">2026 群星世界杯</div>
        <div class="font-bold text-gold">完整赛程</div>
      </div>
      <div class="w-16"></div>
    </div>

    <!-- 冠军徽章 -->
    <div v-if="champion" class="card-glass p-4 mb-4 text-center bg-gradient-to-br from-yellow-500/20 to-amber-700/10 border border-gold/40">
      <div class="text-xs text-gold tracking-widest mb-1">CHAMPION 冠军</div>
      <button class="text-3xl font-extrabold" @click="showSquad(champion.code)">
        {{ flagEmoji(champion.code) }} {{ champion.name_cn }}
      </button>
      <div v-if="runnerUp" class="text-xs text-white/60 mt-2">
        亚军 ·
        <button class="underline decoration-white/30 hover:decoration-white" @click="showSquad(runnerUp.code)">
          {{ flagEmoji(runnerUp.code) }} {{ runnerUp.name_cn }}
        </button>
      </div>
    </div>

    <!-- 淘汰赛 -->
    <div class="card-glass p-3 sm:p-4 mb-4">
      <div class="text-sm font-bold text-gold mb-2">🏆 淘汰赛</div>
      <div class="space-y-3">
        <div v-for="s in stageInfo" :key="s.key">
          <div class="text-xs text-white/60 mb-1.5">{{ s.label }}</div>
          <template v-if="(tour.knockout[s.key] || []).length">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div v-for="(m, i) in tour.knockout[s.key]" :key="i"
                class="flex items-center text-xs bg-white/5 rounded px-2 py-1.5 gap-1">
                <button :class="['flex-1 text-left truncate', m.home && (m.home.code === userCode) ? 'text-gold font-bold' : '']"
                  :disabled="!m.home" @click="m.home && showSquad(m.home.code)">
                  {{ m.home ? flagEmoji(m.home.code) + ' ' + m.home.name_cn : '—' }}
                </button>
                <span class="shrink-0 mx-1 text-center font-mono"
                  :class="knockoutMatchView(s.key, m, i).played ? 'text-gold font-bold' : 'text-white/30'">
                  <template v-if="knockoutMatchView(s.key, m, i).played">
                    {{ knockoutMatchView(s.key, m, i).homeScore }}-{{ knockoutMatchView(s.key, m, i).awayScore }}<span v-if="knockoutMatchView(s.key, m, i).penalties" class="text-[9px] text-amber-300">(点)</span>
                  </template>
                  <template v-else>VS</template>
                </span>
                <button :class="['flex-1 text-right truncate', m.away && (m.away.code === userCode) ? 'text-gold font-bold' : '']"
                  :disabled="!m.away" @click="m.away && showSquad(m.away.code)">
                  {{ m.away ? m.away.name_cn + ' ' + flagEmoji(m.away.code) : '—' }}
                </button>
              </div>
            </div>
          </template>
          <div v-else class="text-[11px] text-white/40 px-1">尚未生成</div>
        </div>
      </div>
    </div>

    <!-- 8 个最佳第三 -->
    <div v-if="bestThirds.qualified.length" class="card-glass p-3 mb-4">
      <div class="text-sm font-bold text-gold mb-2">🎟️ 最佳第三名（8 队晋级）</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
        <button v-for="t in bestThirds.qualified" :key="t.team.code" @click="showSquad(t.team.code)"
          class="bg-emerald-500/10 border border-emerald-300/30 rounded px-2 py-1.5 text-left truncate"
          :class="t.team.code === userCode ? 'text-gold font-bold' : 'text-emerald-200'">
          {{ flagEmoji(t.team.code) }} {{ t.team.name_cn }}
          <span class="text-[10px] text-white/50 ml-1">{{ t.Pts }}分</span>
        </button>
      </div>
      <div v-if="bestThirds.eliminated.length" class="text-[10px] text-white/40 mt-2">
        未晋级第三名：
        <span v-for="(t, i) in bestThirds.eliminated" :key="t.team.code">
          <button class="underline decoration-white/20" @click="showSquad(t.team.code)">{{ t.team.name_cn }}</button>{{ i < bestThirds.eliminated.length - 1 ? '、' : '' }}
        </span>
      </div>
    </div>

    <!-- 12 个小组 -->
    <div class="card-glass p-3 sm:p-4 mb-4">
      <div class="text-sm font-bold text-gold mb-2">📋 小组赛</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-for="b in groupBoards" :key="b.group.id" class="bg-white/5 rounded-lg p-2.5">
          <div class="text-xs font-bold text-gold mb-1.5">{{ b.group.id }} 组</div>
          <!-- 积分榜 -->
          <table class="w-full text-[11px] mb-2">
            <thead class="text-white/40">
              <tr>
                <th class="text-left py-0.5">球队</th>
                <th class="text-center w-5">P</th>
                <th class="text-center w-5">W</th>
                <th class="text-center w-5">D</th>
                <th class="text-center w-5">L</th>
                <th class="text-center w-7">GD</th>
                <th class="text-center w-6 text-gold">分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in b.ranking" :key="r.team.code"
                :class="[
                  r.team.code === userCode ? 'bg-gold/10' : '',
                  i < 2 ? 'text-emerald-200' : i === 2 ? 'text-amber-200' : 'text-white/55'
                ]">
                <td class="py-0.5">
                  <button @click="showSquad(r.team.code)" class="truncate text-left max-w-[110px]"
                    :class="r.team.code === userCode ? 'text-gold font-bold' : ''">
                    <span class="text-[10px] mr-0.5">{{ i+1 }}</span>{{ flagEmoji(r.team.code) }} {{ r.team.name_cn }}
                  </button>
                </td>
                <td class="text-center">{{ r.P }}</td>
                <td class="text-center">{{ r.W }}</td>
                <td class="text-center">{{ r.D }}</td>
                <td class="text-center">{{ r.L }}</td>
                <td class="text-center">{{ r.GD > 0 ? '+' : '' }}{{ r.GD }}</td>
                <td class="text-center text-gold font-bold">{{ r.Pts }}</td>
              </tr>
            </tbody>
          </table>
          <!-- 6 场比分 -->
          <div class="grid grid-cols-1 gap-0.5">
            <div v-for="(f, fi) in b.fixtures" :key="fi"
              class="flex items-center text-[10px] gap-1 leading-tight">
              <span class="text-white/30 shrink-0 w-3">R{{ f.round }}</span>
              <button class="flex-1 truncate text-right" @click="showSquad(f.home.code)"
                :class="f.home.code === userCode ? 'text-gold' : 'text-white/75'">
                {{ f.home.name_cn }}
              </button>
              <span class="font-mono shrink-0 text-center w-9"
                :class="f.played ? 'text-gold font-bold' : 'text-white/30'">
                <template v-if="f.played">{{ f.homeScore }}-{{ f.awayScore }}</template>
                <template v-else>vs</template>
              </span>
              <button class="flex-1 truncate text-left" @click="showSquad(f.away.code)"
                :class="f.away.code === userCode ? 'text-gold' : 'text-white/75'">
                {{ f.away.name_cn }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="text-[10px] text-white/40 mt-2">点击任意球队名 → 查看 AI 阵容；前 2 名直接晋级，第 3 名争 8 个最佳第三，第 4 名小组出局。</div>
    </div>

    <SquadDialog :visible="dialogVisible" :team-code="dialogTeam" @close="closeDialog" />
  </div>
</template>
