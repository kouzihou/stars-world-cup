export function pickRandom(arr) {
  if (!arr || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

export function ovrTier(ovr) {
  if (ovr >= 90) return 'ovr-90'
  if (ovr >= 85) return 'ovr-85'
  if (ovr >= 80) return 'ovr-80'
  if (ovr >= 75) return 'ovr-75'
  if (ovr >= 70) return 'ovr-70'
  return 'ovr-default'
}

// ISO2 国家码 → 国旗 emoji（B 类传统队不一定能映射，回退⚽）
const ISO3_TO_ISO2 = {
  ALG:'DZ', ARG:'AR', AUS:'AU', AUT:'AT', BEL:'BE', BOL:'BO', BRA:'BR', CAN:'CA',
  CHI:'CL', CHN:'CN', CIV:'CI', CMR:'CM', COL:'CO', CRC:'CR', CRO:'HR', CZE:'CZ',
  CZE_LEGACY:'CZ', DEN:'DK', ECU:'EC', EGY:'EG', ENG:'GB-ENG', ESP:'ES', FRA:'FR',
  GER:'DE', GHA:'GH', GRE:'GR', HUN:'HU', IRL:'IE', IRN:'IR', ITA:'IT', JAM:'JM',
  JOR:'JO', JPN:'JP', KOR:'KR', KSA:'SA', MAR:'MA', MEX:'MX', NED:'NL', NGA:'NG',
  NOR:'NO', NZL:'NZ', PAN:'PA', PAR:'PY', PER:'PE', POL:'PL', POR:'PT', QAT:'QA',
  ROU:'RO', RSA:'ZA', RUS:'RU', SCO:'GB-SCT', SEN:'SN', SRB:'RS', SUI:'CH', SUR:'SR',
  SWE:'SE', TUN:'TN', TUR:'TR', UKR:'UA', URU:'UY', USA:'US', UZB:'UZ', VEN:'VE',
  WAL:'GB-WLS'
}

export function flagEmoji(code) {
  const iso = ISO3_TO_ISO2[code]
  if (!iso) return '⚽'
  if (iso === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (iso === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (iso === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  return iso.split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

export const CONFEDERATION_NAMES = {
  UEFA: '欧洲（UEFA）',
  CONMEBOL: '南美（CONMEBOL）',
  CONCACAF: '中北美（CONCACAF）',
  AFC: '亚洲（AFC）',
  CAF: '非洲（CAF）',
  OFC: '大洋洲（OFC）'
}

export const POS_CN = {
  GK: '门将', RB: '右后卫', LB: '左后卫', CB: '中后卫',
  CDM: '后腰', CM: '中场', CAM: '前腰',
  RM: '右中场', LM: '左中场', RW: '右边锋', LW: '左边锋',
  ST: '前锋', CF: '前锋'
}
