// 单场比赛模拟引擎
// 给定 home / away picks，返回事件列表（含进球/射门/犯规/扑救等）+ 终场比分
import { hashString, makeRng } from './seededRandom'
import { squadOvr } from './aiSquad'

const COMMENT_OPEN = [
  '裁判一声哨响，比赛开始！',
  '球员们已经站位完毕，比赛即将打响！',
  '开球！这是一场注定载入史册的对决。'
]
const COMMENT_HALF = [
  '上半场结束哨响起。',
  '中场休息时间。',
  '回到更衣室，教练们的部署即将见分晓。'
]
const COMMENT_END = [
  '终场哨响！',
  '本场比赛到此结束。',
  '比赛结束的哨声划破天际。'
]

const TPL_GOAL = [
  '第 {min} 分钟，{a_st}{a_pos}抓住反击机会，单刀挑射破门！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，{a_lw}边路传中，{a_st}头球攻门得手！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，{a_cam} 直塞撕开防线，{a_st} 推射近角入网！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，{a_cm}远射建功！皮球势大力沉直挂死角！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，{a_st}禁区内捕捉机会，凌空抽射破门！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，{a_rw}内切爆射，球击中立柱弹入网内！{home} {hs}-{as} {away}！',
  '第 {min} 分钟，角球开出，{a_cb}前插头槌破门！{home} {hs}-{as} {away}！'
]
const TPL_SHOT = [
  '第 {min} 分钟，{a_st}远射，{d_gk}飞身扑出！',
  '第 {min} 分钟，{a_lw}传中被{d_cb}头球解围。',
  '第 {min} 分钟，{a_cam}前场任意球直挂横梁！',
  '第 {min} 分钟，{a_rw}劲射高出横梁。',
  '第 {min} 分钟，{a_st}禁区内挑射偏出立柱。'
]
const TPL_DEF = [
  '第 {min} 分钟，{d_cb}及时铲断，化解危机。',
  '第 {min} 分钟，{d_cdm}抢断后送出长传。',
  '第 {min} 分钟，{d_gk}稳健地将球扑住。',
  '第 {min} 分钟，{d_lb}边路飞铲解围。'
]
const TPL_FOUL = [
  '第 {min} 分钟，{a_cm}犯规，吃到一张黄牌。',
  '第 {min} 分钟，双方因争抢发生冲突，主裁警告。',
  '第 {min} 分钟，{a_cdm}战术犯规。'
]
const TPL_MISS = [
  '第 {min} 分钟，{a_st}面对空门竟然踢飞了！',
  '第 {min} 分钟，{a_rw}单刀被{d_gk}化解！',
  '第 {min} 分钟，{a_st}漏掉了一个绝佳的机会。'
]

function pickFromArr(arr, rng) { return arr[Math.floor(rng() * arr.length)] }

function findByPos(picks, pos) {
  // 返回首个匹配 pos 的球员姓名，找不到回退到任意一名
  const m = picks.find(p => p && p.slotPos === pos && p.player)
  if (m) return m.player.name_cn || m.player.name_en
  // 兼容：找 pos 包含的
  const m2 = picks.find(p => p && p.slotPos && p.slotPos.includes(pos.charAt(0)) && p.player)
  if (m2) return m2.player.name_cn || m2.player.name_en
  // 兜底：返回任意进攻位/防守位
  const any = picks.find(p => p && p.player)
  return any ? (any.player.name_cn || any.player.name_en) : '某球员'
}

function fillTemplate(tpl, ctx) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? `{${k}}`)
}

// 综合实力公式
const POS_WEIGHT = { GK:0.07, CB:0.08, RB:0.07, LB:0.07, CDM:0.085, CM:0.09, CAM:0.09, RM:0.085, LM:0.085, RW:0.09, LW:0.09, ST:0.095, CF:0.095 }
function teamStrength(picks) {
  let s = 0, w = 0
  for (const p of picks) {
    if (!p?.player) continue
    const ww = POS_WEIGHT[p.slotPos] || 0.08
    s += p.ovrAtPos * ww
    w += ww
  }
  return w > 0 ? s / w * 1.0 : squadOvr(picks)
}

// 阵型克制（轻微 ±2）
const FORMATION_BONUS = {
  '4-3-3': { '5-3-2': 2, '3-5-2': -1 },
  '4-4-2': { '4-3-3': 1 },
  '3-5-2': { '4-3-3': 1 },
  '5-3-2': { '3-5-2': -1 },
  '4-2-3-1': { '4-4-2': 1 },
  '3-4-3': { '5-3-2': -1 }
}

export function simulateMatch({ home, away, homeFormationId, awayFormationId, seed, allowDraw = true }) {
  const rng = makeRng(seed >>> 0)
  let homeStr = teamStrength(home)
  let awayStr = teamStrength(away)
  homeStr += (FORMATION_BONUS[homeFormationId]?.[awayFormationId] || 0)
  awayStr += (FORMATION_BONUS[awayFormationId]?.[homeFormationId] || 0)

  // 弱队 10% 概率超神
  if (homeStr < awayStr && rng() < 0.10) homeStr += 6
  if (awayStr < homeStr && rng() < 0.10) awayStr += 6

  const events = []
  let hs = 0, as = 0
  const homeName = home.__teamName, awayName = away.__teamName

  events.push({ min: 0, type: 'open', text: pickFromArr(COMMENT_OPEN, rng) })

  // 30 个回合，每回合代表 3 分钟
  for (let r = 0; r < 30; r++) {
    const min = (r + 1) * 3
    if (min === 45) events.push({ min: 45, type: 'half', text: pickFromArr(COMMENT_HALF, rng) })

    // 控球归属
    const total = homeStr + awayStr + 0.0001
    const homePoss = homeStr / total + (rng() - 0.5) * 0.1
    const isHome = rng() < homePoss
    const att = isHome ? home : away, def = isHome ? away : home
    const attStr = isHome ? homeStr : awayStr
    const defStr = isHome ? awayStr : homeStr

    // 该回合是否产生射门：实力差 + 50% 基础
    const dice = rng()
    const shotProb = 0.45 + (attStr - defStr) * 0.005
    if (dice > shotProb) continue  // 平淡，无事件

    // 是否进球：sigmoid(实力差)
    const goalRoll = rng()
    const diff = attStr - defStr
    const goalProb = 1 / (1 + Math.exp(-(diff * 0.05 + (attStr - 70) * 0.01))) * 0.55
    // 强队胜率封顶（间接）：单场最多 6 球
    const cappedGoalProb = Math.min(goalProb, 0.40)

    const ctx = {
      min,
      home: homeName, away: awayName,
      a_st: findByPos(att, 'ST'), a_lw: findByPos(att, 'LW'), a_rw: findByPos(att, 'RW'),
      a_cam: findByPos(att, 'CAM'), a_cm: findByPos(att, 'CM'), a_cdm: findByPos(att, 'CDM'),
      a_cb: findByPos(att, 'CB'),
      d_gk: findByPos(def, 'GK'), d_cb: findByPos(def, 'CB'), d_lb: findByPos(def, 'LB'),
      d_cdm: findByPos(def, 'CDM'),
      hs: 0, as: 0
    }

    if (goalRoll < cappedGoalProb && (isHome ? hs : as) < 6) {
      if (isHome) hs++; else as++;
      ctx.hs = hs; ctx.as = as
      const tpl = pickFromArr(TPL_GOAL, rng)
      events.push({ min, type: 'goal', side: isHome ? 'home' : 'away', text: fillTemplate(tpl, ctx), score: [hs, as] })
    } else if (goalRoll < cappedGoalProb + 0.10) {
      events.push({ min, type: 'miss', side: isHome ? 'home' : 'away', text: fillTemplate(pickFromArr(TPL_MISS, rng), ctx) })
    } else if (goalRoll < cappedGoalProb + 0.30) {
      events.push({ min, type: 'shot', side: isHome ? 'home' : 'away', text: fillTemplate(pickFromArr(TPL_SHOT, rng), ctx) })
    } else if (goalRoll < cappedGoalProb + 0.45) {
      events.push({ min, type: 'foul', side: isHome ? 'home' : 'away', text: fillTemplate(pickFromArr(TPL_FOUL, rng), ctx) })
    } else {
      events.push({ min, type: 'def', side: isHome ? 'home' : 'away', text: fillTemplate(pickFromArr(TPL_DEF, rng), ctx) })
    }
  }

  events.push({ min: 90, type: 'end', text: pickFromArr(COMMENT_END, rng) + ` ${homeName} ${hs}-${as} ${awayName}！` })

  // 平局淘汰：点球
  let pen = null
  if (!allowDraw && hs === as) {
    pen = simulatePenalties(home, away, rng, homeName, awayName)
    if (pen.homeWin) hs = hs + 0.5 // 仅用于判定胜方，不改变可视比分
  }

  return {
    homeScore: Math.floor(hs),
    awayScore: Math.floor(as === Math.floor(as) ? as : as),
    events,
    penalties: pen,
    homeWin: pen ? pen.homeWin : (Math.floor(hs) > Math.floor(as) ? true : (Math.floor(hs) < Math.floor(as) ? false : null))
  }
}

function simulatePenalties(home, away, rng, hN, aN) {
  const hScores = [], aScores = []
  const hList = home.filter(p => p?.player).slice(0, 5)
  const aList = away.filter(p => p?.player).slice(0, 5)
  let hg = 0, ag = 0
  const events = []
  for (let i = 0; i < 5; i++) {
    const hPlayer = hList[i % hList.length]?.player
    const aPlayer = aList[i % aList.length]?.player
    const hHit = rng() < 0.7
    const aHit = rng() < 0.7
    if (hHit) hg++
    if (aHit) ag++
    events.push({ round: i + 1, home: { player: hPlayer?.name_cn, hit: hHit }, away: { player: aPlayer?.name_cn, hit: aHit } })
  }
  // 突死
  let i = 0
  while (hg === ag && i < 10) {
    const hHit = rng() < 0.65
    const aHit = rng() < 0.65
    if (hHit) hg++
    if (aHit) ag++
    events.push({ round: 6 + i, home: { player: '替补1', hit: hHit }, away: { player: '替补2', hit: aHit }, sudden: true })
    i++
  }
  return { homeWin: hg > ag, hg, ag, events, homeName: hN, awayName: aN }
}
