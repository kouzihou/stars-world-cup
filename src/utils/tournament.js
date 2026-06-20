// 赛程生成：48 队 → 12 组 → 32 强 → 16 强 → 8 强 → 4 强 → 决赛
import { hashString, makeRng, shuffleInPlace } from './seededRandom'

// 各大洲 2026 配额（共 48）
export const QUOTA = {
  UEFA: 16,
  CAF: 9,
  AFC: 8,
  CONCACAF: 6,
  CONMEBOL: 6,
  OFC: 1,
  EXTRA: 2  // 跨洲附加从剩余里挑实力强者
}

// 选 48 队：用户队必入；按各大洲配额从 A 类里按 strength_tier 取
export function pickTeams(countries, userCode) {
  const A = countries.filter(c => c.category === 'A')
  const byConf = {}
  A.forEach(c => {
    if (!byConf[c.confederation]) byConf[c.confederation] = []
    byConf[c.confederation].push(c)
  })
  Object.keys(byConf).forEach(k => {
    byConf[k].sort((a, b) => (a.strength_tier - b.strength_tier) || a.code.localeCompare(b.code))
  })

  const picked = new Set()
  const result = []
  function take(code) {
    if (picked.has(code)) return
    const c = A.find(x => x.code === code)
    if (c) { picked.add(code); result.push(c) }
  }

  // 1. 用户 A 类强制入；B 类用户由调用方处理顶替
  if (userCode) take(userCode)

  // 2. 按配额取
  for (const [conf, n] of [['UEFA',QUOTA.UEFA],['CAF',QUOTA.CAF],['AFC',QUOTA.AFC],['CONCACAF',QUOTA.CONCACAF],['CONMEBOL',QUOTA.CONMEBOL],['OFC',QUOTA.OFC]]) {
    const list = byConf[conf] || []
    let cnt = list.filter(c => picked.has(c.code)).length
    for (const c of list) {
      if (cnt >= n) break
      if (!picked.has(c.code)) { take(c.code); cnt++ }
    }
  }
  // 3. 附加赛：从剩余里按 tier 补到 48
  const all = A.slice().sort((a, b) => (a.strength_tier - b.strength_tier) || a.code.localeCompare(b.code))
  for (const c of all) {
    if (result.length >= 48) break
    if (!picked.has(c.code)) take(c.code)
  }
  return result.slice(0, 48)
}

// 顶替规则：B 类用户 → 顶替同大洲最弱 A 类（已在 countries.json replacement_rules 里）
// 这里返回最终 48 队（其中含用户队，无被顶替队）
export function buildFinalTeams(countriesData, userCountry, availableCodes = null) {
  let codes = countriesData.countries
  if (availableCodes && availableCodes.size) {
    codes = codes.filter(c => availableCodes.has(c.code) || c.code === userCountry.code)
  }
  if (userCountry.category === 'A') {
    return pickTeams(codes, userCountry.code)
  } else {
    // B 类：先按强度生成 48 队（不含用户），再用用户替换同大洲 strength_tier 最大值（最弱）的 A 类
    const rule = (countriesData.replacement_rules || []).find(r => r.b_code === userCountry.code)
    const replacedCode = rule?.a_code
    let teams = pickTeams(codes, null)
    if (replacedCode) {
      const idx = teams.findIndex(t => t.code === replacedCode)
      if (idx >= 0) teams[idx] = userCountry
      else teams[teams.length - 1] = userCountry  // 兜底
    } else {
      teams[teams.length - 1] = userCountry
    }
    return teams
  }
}

// 蛇形分组：按 strength_tier 升序 → 4 个种子档（pot）→ 每组从 4 档各抽 1 队
export function drawGroups(teams, rng) {
  const sorted = teams.slice().sort((a, b) => (a.strength_tier || 4) - (b.strength_tier || 4))
  const pot1 = sorted.slice(0, 12)
  const pot2 = sorted.slice(12, 24)
  const pot3 = sorted.slice(24, 36)
  const pot4 = sorted.slice(36, 48)
  shuffleInPlace(pot1, rng)
  shuffleInPlace(pot2, rng)
  shuffleInPlace(pot3, rng)
  shuffleInPlace(pot4, rng)
  const groups = []
  for (let i = 0; i < 12; i++) {
    groups.push({
      id: String.fromCharCode(65 + i), // A-L
      teams: [pot1[i], pot2[i], pot3[i], pot4[i]]
    })
  }
  return groups
}

// 小组循环：每组 6 场 = 12 组 × 6 = 72 场
export function buildGroupMatches(groups) {
  const fixtures = []
  for (const g of groups) {
    const t = g.teams
    fixtures.push({ groupId: g.id, round: 1, home: t[0], away: t[3] })
    fixtures.push({ groupId: g.id, round: 1, home: t[1], away: t[2] })
    fixtures.push({ groupId: g.id, round: 2, home: t[3], away: t[1] })
    fixtures.push({ groupId: g.id, round: 2, home: t[2], away: t[0] })
    fixtures.push({ groupId: g.id, round: 3, home: t[0], away: t[1] })
    fixtures.push({ groupId: g.id, round: 3, home: t[3], away: t[2] })
  }
  return fixtures
}

// 小组排名规则：积分 → 净胜球 → 进球 → 抽签
export function rankGroup(teams, results) {
  const stat = {}
  teams.forEach(t => stat[t.code] = { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 })
  for (const r of results) {
    if (!stat[r.home.code] || !stat[r.away.code]) continue
    const sh = stat[r.home.code], sa = stat[r.away.code]
    sh.P++; sa.P++
    sh.GF += r.homeScore; sh.GA += r.awayScore
    sa.GF += r.awayScore; sa.GA += r.homeScore
    if (r.homeScore > r.awayScore) { sh.W++; sa.L++; sh.Pts += 3 }
    else if (r.homeScore < r.awayScore) { sa.W++; sh.L++; sa.Pts += 3 }
    else { sh.D++; sa.D++; sh.Pts++; sa.Pts++ }
  }
  Object.values(stat).forEach(s => s.GD = s.GF - s.GA)
  return Object.values(stat).sort((a, b) =>
    b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.code.localeCompare(b.team.code)
  )
}

// 12 组每组前 2（24 队）+ 8 个最佳第 3 = 32 强
export function pickKnockout32(groups, allResults) {
  const rank1 = [], rank2 = [], rank3 = []
  for (const g of groups) {
    const groupResults = allResults.filter(r => r.groupId === g.id)
    const ranking = rankGroup(g.teams, groupResults)
    rank1.push({ groupId: g.id, ...ranking[0] })
    rank2.push({ groupId: g.id, ...ranking[1] })
    rank3.push({ groupId: g.id, ...ranking[2] })
  }
  // 8 个最佳第三
  const best3 = rank3.slice().sort((a, b) =>
    b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF
  ).slice(0, 8)
  return { rank1, rank2, best3 }
}

// 32 强对位：32 队（12 组第一 + 12 组第二 + 8 最佳第三）→ 16 场
// 简化版：32 队按综合排名（积分→净胜球→进球）排序后，1 vs 32、2 vs 31...，强弱大致错开
export function buildR32(rank1, rank2, best3) {
  // 给每队加一个标签便于显示
  const r1 = rank1.map(r => ({ ...r, label: '1' + r.groupId }))
  const r2 = rank2.map(r => ({ ...r, label: '2' + r.groupId }))
  const b3 = best3.map(r => ({ ...r, label: '3' + r.groupId }))
  const all32 = [...r1, ...r2, ...b3]
  // 排序：积分 → 净胜球 → 进球，1st 优先于 2nd 优先于 best3（同分情况下）
  const rankOrder = { '1': 0, '2': 1, '3': 2 }
  all32.sort((a, b) =>
    (b.Pts || 0) - (a.Pts || 0) ||
    (b.GD || 0) - (a.GD || 0) ||
    (b.GF || 0) - (a.GF || 0) ||
    (rankOrder[a.label[0]] - rankOrder[b.label[0]])
  )
  // 上下半区配对（16 vs 32, 1 vs 17 形式，保证强队先打弱队）
  // 经典锦标赛：1 vs 32, 2 vs 31, ..., 16 vs 17
  const matches = []
  for (let i = 0; i < 16; i++) {
    const a = all32[i]
    const b = all32[31 - i]
    matches.push({
      stage: 'R32',
      home: a.team, away: b.team,
      label: `${a.label} vs ${b.label}`
    })
  }
  return matches
}
