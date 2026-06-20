import { defineStore } from 'pinia'
import { loadCountries, loadFormations, loadCountryPlayers } from '../utils/dataLoader'
import { pickRandom } from '../utils/random'

export const useGameStore = defineStore('game', {
  state: () => ({
    countriesData: null,    // {countries, years, replacement_rules}
    formationsData: null,   // {formations}
    playersCache: {},       // CODE -> {country_code, squads}

    country: null,          // 选定的国家对象
    replacedCountry: null,  // B 类 → 顶替的 A 类
    formation: null,        // 选定的阵型对象
    picks: [],              // 长度=11
    usedPlayerIds: [],      // 用数组（Pinia 持久化友好）
    currentSlotIdx: 0,

    nickname: '',
    bootstrapped: false
  }),

  getters: {
    completedCount: (s) => s.picks.filter(p => p && p.player).length,
    teamOvr: (s) => {
      const list = s.picks.filter(p => p && p.player)
      if (!list.length) return 0
      return Math.floor(list.reduce((a, p) => a + p.ovrAtPos, 0) / list.length)
    },
    avgAge: (s) => {
      const list = s.picks.filter(p => p && p.player)
      if (!list.length) return 0
      return Math.round(list.reduce((a, p) => a + (p.player.age || 0), 0) / list.length)
    },
    yearDist: (s) => {
      const dist = {}
      s.picks.filter(p => p && p.player).forEach(p => {
        dist[p.year] = (dist[p.year] || 0) + 1
      })
      return Object.entries(dist).sort((a, b) => Number(a[0]) - Number(b[0]))
    },
    teamName: (s) => s.country ? s.country.name_cn : ''
  },

  actions: {
    async bootstrap() {
      if (this.bootstrapped) return
      const [c, f] = await Promise.all([loadCountries(), loadFormations()])
      this.countriesData = c
      this.formationsData = f
      this.bootstrapped = true
      // 默认昵称
      if (!this.nickname) {
        this.nickname = '球迷 #' + Math.floor(1000 + Math.random() * 9000)
      }
    },

    async ensureCountryPlayers(code) {
      if (this.playersCache[code]) return this.playersCache[code]
      const data = await loadCountryPlayers(code)
      this.playersCache[code] = data
      return data
    },

    selectCountry(country) {
      this.country = country
      this.replacedCountry = null
      if (country.category === 'B') {
        const rule = (this.countriesData?.replacement_rules || []).find(r => r.b_code === country.code)
        if (rule) {
          const a = (this.countriesData.countries || []).find(x => x.code === rule.a_code)
          this.replacedCountry = a || null
        }
      }
    },

    selectFormation(formation) {
      this.formation = formation
      this.picks = formation.slots.map(s => ({
        slotIdx: s.idx, slotPos: s.pos, x: s.x, y: s.y,
        year: null, player: null, ovrAtPos: 0
      }))
      this.usedPlayerIds = []
      this.currentSlotIdx = 0
    },

    async getCandidates(slotIdx) {
      if (!this.country) return null
      const slot = this.formation.slots[slotIdx]
      const data = await this.ensureCountryPlayers(this.country.code)
      const squads = data.squads || {}

      const used = new Set(this.usedPlayerIds)

      // 找到所有候选届：该届球员含 slotPos 且至少 1 人未被使用
      const validYears = []
      for (const y of Object.keys(squads)) {
        const list = squads[y] || []
        if (!list.length) continue
        const eligible = list.filter(p => !used.has(p.id) && (p.positions || []).some(po => po.pos === slot.pos))
        if (eligible.length > 0) validYears.push(y)
      }
      if (!validYears.length) return { year: null, candidates: [], slot }

      const year = pickRandom(validYears)
      const list = squads[year] || []
      const cands = list
        .filter(p => !used.has(p.id) && (p.positions || []).some(po => po.pos === slot.pos))
        .map(p => {
          const po = (p.positions || []).find(x => x.pos === slot.pos)
          return { player: p, ovrAtPos: po ? po.ovr : 0 }
        })
        .sort((a, b) => b.ovrAtPos - a.ovrAtPos)
      return { year: Number(year), candidates: cands, slot }
    },

    pickPlayer({ slotIdx, year, player, ovrAtPos }) {
      const slot = this.picks[slotIdx]
      slot.year = year
      slot.player = player
      slot.ovrAtPos = ovrAtPos
      this.usedPlayerIds.push(player.id)
      // 移到下一个未填的 slot
      const nextIdx = this.picks.findIndex((p, i) => i > slotIdx && !p.player)
      if (nextIdx >= 0) {
        this.currentSlotIdx = nextIdx
      } else {
        const earlierIdx = this.picks.findIndex(p => !p.player)
        this.currentSlotIdx = earlierIdx >= 0 ? earlierIdx : slotIdx
      }
    },

    setCurrentSlot(idx) {
      if (idx >= 0 && idx < this.picks.length) this.currentSlotIdx = idx
    },

    setNickname(n) { this.nickname = n },

    reset() {
      this.country = null
      this.replacedCountry = null
      this.formation = null
      this.picks = []
      this.usedPlayerIds = []
      this.currentSlotIdx = 0
    }
  }
})
