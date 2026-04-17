import { differenceInCalendarDays } from 'date-fns'
import type { MockDoc, StudySessionDoc, Subject } from '../types'
import { toMillis } from './firestoreTime'
import { lastNDaysKeys } from './dates'

export function buildInsights(input: {
  sessions: StudySessionDoc[]
  mocks: MockDoc[]
  todayKey: string
}): string[] {
  const insights: string[] = []
  const { sessions, mocks, todayKey } = input
  const weekKeys = new Set(lastNDaysKeys(7))
  const sessionsWeek = sessions.filter((session) => weekKeys.has(session.dayKey))

  const bySubject: Record<Subject, number> = {
    Maths: 0,
    English: 0,
    Reasoning: 0,
    GS: 0,
    Mock: 0,
    Mixed: 0,
  }

  for (const session of sessionsWeek) {
    bySubject[session.subject] += session.durationSec
  }

  if (bySubject.GS === 0 && sessionsWeek.length > 0) {
    insights.push('No GS this week.')
  }

  const mockWeek = mocks
    .filter((mock) => {
      const ms = toMillis(mock.createdAt)
      if (!ms) return false
      return differenceInCalendarDays(new Date(), new Date(ms)) <= 7
    })
    .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))

  if (mockWeek.length >= 2) {
    const first = mockWeek[0]!.overall.accuracy
    const last = mockWeek[mockWeek.length - 1]!.overall.accuracy
    const drop = first - last
    if (drop > 8) {
      insights.push(`Accuracy down ${Math.round(drop)}%.`)
    }
  }

  const strong = (Object.entries(bySubject) as [Subject, number][]).sort((a, b) => b[1] - a[1])[0]
  if (strong && strong[1] > 0) {
    insights.push(`${strong[0]} leads.`)
  }

  insights.push(sessions.some((session) => session.dayKey === todayKey) ? 'Logged today.' : 'Start today.')
  return insights.slice(0, 6)
}

export function weekStartMonday(d: Date): string {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
}
