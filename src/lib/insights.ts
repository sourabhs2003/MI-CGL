import { differenceInCalendarDays } from 'date-fns'
import { lastNDaysKeys } from './dates'
import { toMillis } from './firestoreTime'
import type { MockDoc, StudySessionDoc, Subject } from '../types'

export function buildInsights(input: {
  sessions: StudySessionDoc[]
  mocks: MockDoc[]
  todayKey: string
}): string[] {
  const insights: string[] = []
  const { sessions, mocks, todayKey } = input
  const weekKeys = new Set(lastNDaysKeys(7))
  const sessionsWeek = sessions.filter((s) => weekKeys.has(s.dayKey))

  const bySubject: Record<Subject, number> = {
    Maths: 0,
    English: 0,
    Reasoning: 0,
    GS: 0,
    Mixed: 0,
  }
  for (const s of sessionsWeek) {
    bySubject[s.subject] += s.durationSec
  }

  if (bySubject.GS === 0 && sessionsWeek.length > 0) {
    insights.push(
      'You have not logged GS time in the last 7 days. Consider one short GS block.',
    )
  }

  const mockWeek = mocks
    .filter((m) => {
      const ms = toMillis(m.createdAt)
      if (!ms) return false
      return differenceInCalendarDays(new Date(), new Date(ms)) <= 7
    })
    .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
  if (mockWeek.length >= 2) {
    const first = mockWeek[0]!.accuracyPct
    const last = mockWeek[mockWeek.length - 1]!.accuracyPct
    const drop = first - last
    if (drop > 8) {
      insights.push(
        `Mock accuracy is down about ${Math.round(drop)}% from your first to latest mock this week. Tighten review + retry.`,
      )
    }
  }

  const strong = (Object.entries(bySubject) as [Subject, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0]
  if (strong && strong[1] > 0) {
    insights.push(
      `This week your most logged time is ${strong[0]} — keep balancing other subjects.`,
    )
  }

  if (sessions.some((s) => s.dayKey === todayKey)) {
    insights.push('Nice — you already have study time logged today.')
  } else {
    insights.push('Start a session today to protect your streak.')
  }

  return insights.slice(0, 6)
}

export function weekStartMonday(d: Date): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}

