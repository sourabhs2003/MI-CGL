/**
 * XP Calculation Service (Anti-Cheat)
 * Implements strict XP rules to prevent fake data
 */

type MockAccuracy = {
  score: number
  total: number
}

/**
 * Calculate XP for study session based on duration
 * Rules:
 * - <30 min → 0 XP
 * - 30-60 min → 5 XP
 * - 60+ min → 10 XP per hour (rounded down)
 * - Manual entries → 50% XP
 * - Suspicious sessions (>3h) → 0 XP
 */
export function calculateStudyXP(
  durationSeconds: number,
  isManual: boolean = false,
  isSuspicious: boolean = false,
): number {
  if (isSuspicious) {
    return 0
  }

  const durationMinutes = durationSeconds / 60

  if (durationMinutes < 30) {
    return 0
  }

  if (durationMinutes < 60) {
    return isManual ? 2 : 5 // 50% for manual
  }

  // 60+ minutes: 10 XP per hour (rounded down)
  const hours = Math.floor(durationMinutes / 60)
  const baseXP = hours * 10

  return isManual ? Math.floor(baseXP / 2) : baseXP
}

/**
 * Calculate XP for mock test result
 * Rules:
 * - Base: 20 XP
 * - Accuracy >80% → +10 XP
 * - Accuracy <50% → -5 XP
 */
export function calculateMockXP(accuracy: MockAccuracy): number {
  const percentage = (accuracy.score / accuracy.total) * 100
  let xp = 20

  if (percentage > 80) {
    xp += 10
  } else if (percentage < 50) {
    xp -= 5
  }

  return Math.max(0, xp) // Never negative
}

/**
 * Calculate XP for task completion
 * Rules:
 * - Each task → 1 XP (low value)
 */
export function calculateTaskXP(): number {
  return 1
}

/**
 * Calculate daily penalty for no study
 * Rules:
 * - No study day → -10 XP
 */
export function calculateNoStudyPenalty(): number {
  return -10
}

/**
 * Check if session duration is suspicious (>3 hours)
 */
export function isSessionSuspicious(durationSeconds: number): boolean {
  const durationHours = durationSeconds / 3600
  return durationHours > 3
}

/**
 * Calculate session duration in seconds from start and end timestamps
 */
export function calculateDuration(startTime: number, endTime: number): number {
  return endTime - startTime
}
