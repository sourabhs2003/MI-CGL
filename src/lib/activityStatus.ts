const INACTIVITY_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isInactiveByLastStudyDay(lastStudyDay: string | null, now = new Date()) {
  if (!lastStudyDay) return true
  const last = new Date(`${lastStudyDay}T12:00:00`)
  if (Number.isNaN(last.getTime())) return true
  const current = new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00`)
  return current.getTime() - last.getTime() >= INACTIVITY_DAYS * DAY_MS
}

export function isFrozenProfile(data: Record<string, unknown> | undefined) {
  if (!data) return false
  if (data.isFrozen === true) return true
  return isInactiveByLastStudyDay((data.lastStudyDay as string | null) ?? null)
}

export function getMonthlyXp(data: Record<string, unknown> | undefined) {
  if (!data) return 0
  return data.xpMonth === currentMonthKey() ? Number(data.xp) || 0 : 0
}
