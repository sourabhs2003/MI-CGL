import { addDays, subDays } from 'date-fns'
import type { StudySessionDoc } from '../types'

export function parseDayKey(dayKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return new Date(year, month - 1, day)
}

export function formatDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dayKeysEndingAt(endDate: Date, count: number): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    out.push(formatDayKey(subDays(endDate, i)))
  }
  return out
}

export function hasStudyInKeys(sessions: StudySessionDoc[], keys: Set<string>): boolean {
  return sessions.some((session) => keys.has(session.dayKey) && session.durationSec > 0)
}

export function hasAnyStudy(sessions: StudySessionDoc[]): boolean {
  return sessions.some((session) => session.durationSec > 0)
}

export function getLatestStudyDate(sessions: StudySessionDoc[]): Date | null {
  const latestKey = sessions
    .filter((session) => session.durationSec > 0 && parseDayKey(session.dayKey))
    .map((session) => session.dayKey)
    .sort()
    .at(-1)

  return latestKey ? parseDayKey(latestKey) : null
}

export function getDisplayKeys(sessions: StudySessionDoc[], days: number) {
  const todayKeys = dayKeysEndingAt(new Date(), days)
  const todayKeySet = new Set(todayKeys)
  if (hasStudyInKeys(sessions, todayKeySet) || !hasAnyStudy(sessions)) {
    return { keys: todayKeys, isFallback: false }
  }

  const latestStudyDate = getLatestStudyDate(sessions)
  return {
    keys: latestStudyDate ? dayKeysEndingAt(latestStudyDate, days) : todayKeys,
    isFallback: Boolean(latestStudyDate),
  }
}

export function weekBucketsEndingAt(endDate: Date, weekCount: number) {
  const firstDay = subDays(endDate, weekCount * 7 - 1)
  return Array.from({ length: weekCount }, (_, index) => {
    const startDate = addDays(firstDay, index * 7)
    return {
      label: formatDayKey(startDate).slice(5),
      keys: dayKeysEndingAt(addDays(startDate, 6), 7),
    }
  })
}
