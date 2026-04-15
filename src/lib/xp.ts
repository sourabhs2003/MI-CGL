/** PRD: 10 XP per full hour studied; +5 task; +20 mock. */
export const XP_PER_HOUR_STUDY = 10
export const XP_TASK_DONE = 5
export const XP_MOCK_DONE = 20

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Topper'

export interface RankInfo {
  tier: RankTier
  icon: string
  color: string
  xpToNext: number
  xpIntoTier: number
  tierTotal: number
}

export const RANK_THRESHOLDS: Record<RankTier, number> = {
  Bronze: 0,
  Silver: 100,
  Gold: 300,
  Elite: 700,
  Topper: 1500,
}

export const RANK_ICONS: Record<RankTier, string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Elite: '💎',
  Topper: '👑',
}

export const RANK_COLORS: Record<RankTier, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Elite: '#7dd3fc',
  Topper: '#22c55e',
}

export function getRankTier(xp: number): RankInfo {
  let tier: RankTier = 'Bronze'
  if (xp >= 1500) tier = 'Topper'
  else if (xp >= 700) tier = 'Elite'
  else if (xp >= 300) tier = 'Gold'
  else if (xp >= 100) tier = 'Silver'

  const tierThreshold = RANK_THRESHOLDS[tier]
  const nextTier = getNextTier(tier)
  const xpToNext = nextTier ? RANK_THRESHOLDS[nextTier] - xp : 0
  const xpIntoTier = xp - tierThreshold
  const tierTotal = nextTier
    ? RANK_THRESHOLDS[nextTier] - tierThreshold
    : Math.max(1, xp - tierThreshold)

  return {
    tier,
    icon: RANK_ICONS[tier],
    color: RANK_COLORS[tier],
    xpToNext,
    xpIntoTier,
    tierTotal,
  }
}

function getNextTier(current: RankTier): RankTier | null {
  const tiers: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Elite', 'Topper']
  const idx = tiers.indexOf(current)
  return idx < tiers.length - 1 ? tiers[idx + 1] : null
}

export function levelFromTotalXp(totalXp: number): number {
  return Math.min(100, Math.floor(totalXp / 500) + 1)
}

export function levelProgress(totalXp: number): {
  level: number
  xpIntoLevel: number
  xpForNext: number
  pct: number
} {
  const level = levelFromTotalXp(totalXp)
  if (level >= 100) {
    return { level, xpIntoLevel: 0, xpForNext: 0, pct: 100 }
  }
  const floor = (level - 1) * 500
  const ceil = level * 500
  const xpIntoLevel = totalXp - floor
  const span = ceil - floor
  return {
    level,
    xpIntoLevel,
    xpForNext: ceil - totalXp,
    pct: Math.min(100, (xpIntoLevel / span) * 100),
  }
}

export function xpFromStudySeconds(durationSec: number): number {
  return Math.floor(durationSec / 3600) * XP_PER_HOUR_STUDY
}
