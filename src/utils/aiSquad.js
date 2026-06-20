// AI 阵容生成：对每个国家，按用户阵型，跨届选位置 OVR 高的球员
// 同 country + formation 输出确定（用 hash 做 seed）
import { hashString, makeRng, pickFrom } from './seededRandom'

export async function generateAISquad(country, formation, dataLoader, seedSalt = '') {
  const data = await dataLoader.loadCountryPlayers(country.code)
  const seed = hashString(country.code + '_' + formation.id + '_' + seedSalt)
  const rng = makeRng(seed)
  const used = new Set()
  const usedNames = new Set()
  const picks = []
  // 收集所有届的球员，扁平化
  const allPlayers = []
  for (const y of Object.keys(data.squads || {})) {
    for (const p of data.squads[y]) {
      allPlayers.push({ ...p, _year: Number(y) })
    }
  }
  for (const slot of formation.slots) {
    const cands = allPlayers
      .filter(p => !used.has(p.id) && !usedNames.has(p.name_cn || p.name_en) && (p.positions || []).some(po => po.pos === slot.pos))
      .map(p => {
        const po = (p.positions || []).find(x => x.pos === slot.pos)
        return { ...p, _ovrAtPos: po ? po.ovr : 0 }
      })
      .sort((a, b) => b._ovrAtPos - a._ovrAtPos)
    if (cands.length === 0) {
      // 没有完全匹配的，挑任意未用球员的最高 OVR
      const fb = allPlayers
        .filter(p => !used.has(p.id) && !usedNames.has(p.name_cn || p.name_en))
        .map(p => ({ ...p, _ovrAtPos: Math.max(...(p.positions || [{ovr:60}]).map(x => x.ovr)) - 10 }))
        .sort((a, b) => b._ovrAtPos - a._ovrAtPos)
      if (!fb.length) continue
      const top = fb.slice(0, 3)
      const chosen = top[Math.floor(rng() * top.length)]
      used.add(chosen.id); usedNames.add(chosen.name_cn || chosen.name_en)
      picks.push({ slotIdx: slot.idx, slotPos: slot.pos, x: slot.x, y: slot.y, year: chosen._year, player: chosen, ovrAtPos: Math.max(60, chosen._ovrAtPos) })
      continue
    }
    // 从前 5 名按 RNG 选 1
    const top = cands.slice(0, Math.min(5, cands.length))
    const chosen = top[Math.floor(rng() * top.length)]
    used.add(chosen.id); usedNames.add(chosen.name_cn || chosen.name_en)
    picks.push({
      slotIdx: slot.idx, slotPos: slot.pos, x: slot.x, y: slot.y,
      year: chosen._year,
      player: { id: chosen.id, name_cn: chosen.name_cn, name_en: chosen.name_en, age: chosen.age, squad_no: chosen.squad_no, positions: chosen.positions, tags: chosen.tags },
      ovrAtPos: chosen._ovrAtPos
    })
  }
  return picks
}

export function squadOvr(picks) {
  const list = (picks || []).filter(p => p && p.player)
  if (!list.length) return 0
  return list.reduce((a, p) => a + p.ovrAtPos, 0) / list.length
}
