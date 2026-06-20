// 锦标赛 store：48 队 / 12 组 / 小组赛 / 32 强 / 16 强 / 8 强 / 4 强 / 决赛
import { defineStore } from 'pinia'
import { useGameStore } from './game'
import { hashString, makeRng } from '../utils/seededRandom'
import { buildFinalTeams, drawGroups, buildGroupMatches, rankGroup, pickKnockout32, buildR32 } from '../utils/tournament'
import { generateAISquad } from '../utils/aiSquad'
import { simulateMatch } from '../utils/matchEngine'

export const useTournamentStore = defineStore('tournament', {
  state: () => ({
    initialized: false,
    seed: 0,
    teams: [],          // 48 个国家对象
    groups: [],         // [{id, teams[]}]
    fixtures: [],       // 小组赛 72 场
    groupResults: [],   // {groupId, round, home, away, homeScore, awayScore}
    aiSquadCache: {},   // CODE -> picks
    knockout: {
      R32: [],          // 16 场
      R32_results: [],
      R16: [],
      R16_results: [],
      QF: [],
      QF_results: [],
      SF: [],
      SF_results: [],
      Final: [],
      Final_results: [],
      ThirdPlace: null,
      ThirdPlace_result: null
    },
    userPath: [],       // 用户队晋级历程：['G3-2','R32 W','R16 L'] 等
    userOut: false,     // 用户是否已被淘汰
    userResult: null,   // 'GROUP_OUT' / 'R32_OUT' / 'R16_OUT' / 'QF_OUT' / 'SF_OUT' / 'RUNNER_UP' / 'CHAMPION' / null
    matchProgress: 'group' // 'group' / 'knockout' / 'final'
  }),

  getters: {
    userTeam: (s) => {
      const game = useGameStore()
      return game.country
    },
    userGroup: (s) => {
      const game = useGameStore()
      if (!game.country) return null
      return s.groups.find(g => g.teams.some(t => t.code === game.country.code)) || null
    }
  },

  actions: {
    async startTournament() {
      const game = useGameStore()
      if (!game.country || !game.formation) return
      const seed = hashString(game.country.code + '_' + game.formation.id + '_' + Date.now().toString(36))
      this.seed = seed
      const rng = makeRng(seed)
      // 加载 manifest 获取可用球员国家清单
      let availableCodes = null
      try {
        const r = await fetch(import.meta.env.BASE_URL.replace(/\/$/, '') + '/data/manifest.json')
        const m = await r.json()
        availableCodes = new Set(m.country_codes || [])
      } catch (e) {
        console.warn('manifest load failed', e)
      }
      this.teams = buildFinalTeams(game.countriesData, game.country, availableCodes)
      this.groups = drawGroups(this.teams, rng)
      this.fixtures = buildGroupMatches(this.groups)
      this.groupResults = []
      this.knockout = { R32:[], R32_results:[], R16:[], R16_results:[], QF:[], QF_results:[], SF:[], SF_results:[], Final:[], Final_results:[], ThirdPlace:null, ThirdPlace_result:null }
      this.userPath = []
      this.userOut = false
      this.userResult = null
      this.matchProgress = 'group'
      this.aiSquadCache = {}
      this.initialized = true
    },

    async ensureSquad(teamCode) {
      const game = useGameStore()
      if (teamCode === game.country.code) {
        // 用户阵容
        const picks = game.picks.map(p => ({ ...p }))
        return picks
      }
      if (this.aiSquadCache[teamCode]) return this.aiSquadCache[teamCode]
      const team = this.teams.find(t => t.code === teamCode)
      const picks = await generateAISquad(team, game.formation, {
        loadCountryPlayers: (code) => game.ensureCountryPlayers(code)
      }, this.seed.toString())
      this.aiSquadCache[teamCode] = picks
      return picks
    },

    async runMatch(home, away, opts = {}) {
      const game = useGameStore()
      const homePicks = await this.ensureSquad(home.code)
      const awayPicks = await this.ensureSquad(away.code)
      homePicks.__teamName = home.name_cn
      awayPicks.__teamName = away.name_cn
      const seed = hashString(`${this.seed}_${home.code}_${away.code}_${opts.salt || ''}`)
      return simulateMatch({
        home: homePicks, away: awayPicks,
        homeFormationId: game.formation.id,
        awayFormationId: game.formation.id,
        seed,
        allowDraw: opts.allowDraw !== false
      })
    },

    async simulateAllGroupExceptUser() {
      const game = useGameStore()
      const userCode = game.country.code
      // 模拟所有不含用户的小组赛，用户的 3 场单独模拟
      for (const f of this.fixtures) {
        const involvesUser = f.home.code === userCode || f.away.code === userCode
        if (involvesUser) continue
        if (this.groupResults.find(r => r.groupId === f.groupId && r.round === f.round && r.home.code === f.home.code && r.away.code === f.away.code)) continue
        const result = await this.runMatch(f.home, f.away, { salt: 'G' + f.round, allowDraw: true })
        this.groupResults.push({ ...f, homeScore: result.homeScore, awayScore: result.awayScore, events: result.events })
      }
    },

    recordGroupResult({ groupId, round, home, away, homeScore, awayScore }) {
      this.groupResults.push({ groupId, round, home, away, homeScore, awayScore })
    },

    finalizeGroupStage() {
      // 计算 32 强名单
      const game = useGameStore()
      const userCode = game.country.code
      const { rank1, rank2, best3 } = pickKnockout32(this.groups, this.groupResults)
      this.knockout.R32 = buildR32(rank1, rank2, best3)
      // 用户是否进 32 强？
      const inR32 = this.knockout.R32.find(m => m.home.code === userCode || m.away.code === userCode)
      if (!inR32) {
        // 检查用户在小组赛中名次
        const grp = this.groups.find(g => g.teams.some(t => t.code === userCode))
        const ranking = rankGroup(grp.teams, this.groupResults.filter(r => r.groupId === grp.id))
        const idx = ranking.findIndex(r => r.team.code === userCode)
        this.userPath.push(`小组第 ${idx + 1}`)
        this.userOut = true
        this.userResult = 'GROUP_OUT'
      } else {
        const grp = this.groups.find(g => g.teams.some(t => t.code === userCode))
        const ranking = rankGroup(grp.teams, this.groupResults.filter(r => r.groupId === grp.id))
        const idx = ranking.findIndex(r => r.team.code === userCode)
        this.userPath.push(`${grp.id} 组第 ${idx + 1}（${ranking[idx].W}W ${ranking[idx].D}D ${ranking[idx].L}L）`)
      }
      this.matchProgress = 'knockout'
    },

    async simulateKnockoutStage(stageKey, nextKey) {
      // stageKey: 'R32' | 'R16' | 'QF' | 'SF' | 'Final'
      const game = useGameStore()
      const userCode = game.country?.code
      const matches = this.knockout[stageKey] || []
      const resultsKey = stageKey + '_results'
      // 确保 results 数组长度与 matches 对齐（按 idx 赋值，避免下标错位）
      while (this.knockout[resultsKey].length < matches.length) {
        this.knockout[resultsKey].push(null)
      }
      const winners = []
      for (let mi = 0; mi < matches.length; mi++) {
        const m = matches[mi]
        if (!m || !m.home || !m.away) {
          winners.push(null)
          continue
        }
        // 已经有结果则跳过（防止重复模拟与重复 push）
        const existing = this.knockout[resultsKey][mi]
        if (existing && typeof existing.homeWin === 'boolean') {
          winners.push(existing.homeWin ? m.home : m.away)
          continue
        }
        const involvesUser = userCode && (m.home.code === userCode || m.away.code === userCode)
        if (involvesUser) {
          // 用户对局留待页面交互式播放，此处只占位
          winners.push(null)
          continue
        }
        const r = await this.runMatch(m.home, m.away, { salt: stageKey, allowDraw: false })
        this.knockout[resultsKey][mi] = { ...m, homeScore: r.homeScore, awayScore: r.awayScore, events: r.events, penalties: r.penalties, homeWin: r.homeWin }
        winners.push(r.homeWin ? m.home : m.away)
      }
      // 构建下一轮（成对 1v2 / 3v4 ...）
      if (nextKey) {
        const existed = this.knockout[nextKey] || []
        if (!existed.length) {
          const next = []
          for (let i = 0; i < winners.length; i += 2) {
            next.push({ stage: nextKey, home: winners[i], away: winners[i + 1] })
          }
          this.knockout[nextKey] = next
        } else {
          // 下一阶段已存在（可能由用户场 setUserMatchResult 提前填了一侧），按 slot 补充
          for (let i = 0; i < winners.length; i += 2) {
            const idx = Math.floor(i / 2)
            if (!existed[idx]) {
              existed[idx] = { stage: nextKey, home: winners[i], away: winners[i + 1] }
            } else {
              if (!existed[idx].home) existed[idx].home = winners[i]
              if (!existed[idx].away) existed[idx].away = winners[i + 1]
            }
          }
        }
      }
    },

    async simulateRemainingTournament() {
      // 用户已淘汰后调用：把剩余所有阶段（含未模拟场次）跑完决出冠军。
      // 也能从用户小组出局后直接跑（此时 R32 已 build 但全空）。
      const stages = [
        { key: 'R32', next: 'R16' },
        { key: 'R16', next: 'QF' },
        { key: 'QF',  next: 'SF' },
        { key: 'SF',  next: 'Final' },
        { key: 'Final', next: null }
      ]
      for (const s of stages) {
        await this.simulateKnockoutStage(s.key, s.next)
      }
    },

    setUserMatchResult(stageKey, matchIndex, result) {
      const resultsKey = stageKey + '_results'
      const m = this.knockout[stageKey][matchIndex]
      this.knockout[resultsKey][matchIndex] = { ...m, ...result }
      // 把胜方填入下一阶段对应位置（晋级桥接）
      const nextKey = { R32: 'R16', R16: 'QF', QF: 'SF', SF: 'Final' }[stageKey]
      if (!nextKey) return
      const winner = result.homeWin ? m.home : m.away
      const nextIdx = Math.floor(matchIndex / 2)
      const slot = matchIndex % 2 === 0 ? 'home' : 'away'
      if (!this.knockout[nextKey] || !this.knockout[nextKey][nextIdx]) return
      this.knockout[nextKey][nextIdx][slot] = winner
    },

    advanceUserPath(stage, userWon, opponent, score) {
      const txt = `${stage} ${userWon ? '胜' : '负'} ${opponent.name_cn} ${score}`
      this.userPath.push(txt)
      if (!userWon) {
        this.userOut = true
        const map = { R32: 'R32_OUT', R16: 'R16_OUT', QF: 'QF_OUT', SF: 'SF_OUT', Final: 'RUNNER_UP' }
        this.userResult = map[stage] || 'GROUP_OUT'
      } else if (stage === 'Final') {
        this.userResult = 'CHAMPION'
      }
    }
  }
})
