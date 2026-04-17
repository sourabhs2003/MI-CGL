import { collection, getDocs } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '../firebase'
import { USERS } from '../lib/auth'
import { lastNDaysKeys, todayKey } from '../lib/dates'
import { toMillis } from '../lib/firestoreTime'
import { capitalizeName, getIdentity } from '../lib/identity'
import { profileFromSnap } from '../services/userProfile'

export type HeatmapPoint = {
  dayKey: string
  value: number
}

export type LeaderboardRow = {
  username: string
  displayName: string
  avatarIcon: string
  avatarColor: string
  uid: string
  xp: number
  streak: number
  todayHours: number
  weekHours: number
  totalHours: number
  mockCount: number
  latestMockRawScore: number
  latestMockTotal: number
  latestMockScore: number
  averageMockScore: number
  averageAccuracy: number
  mockImprovement: number
  totalSessions: number
  lastActivity: string
  consistencyDays: number
  inactive: boolean
  morningHours: number
  eveningHours: number
  topSubject: string
  badges: string[]
  heatmap: HeatmapPoint[]
}

type RawMockMetric = {
  score: number
  total: number
  scorePct: number
  accuracy: number
  createdAt: number
}

const userNameByUid = Object.fromEntries(USERS.map((user) => [user.uid, user.username])) as Record<string, string>

function getMockMetric(data: Record<string, unknown>): RawMockMetric | null {
  if (typeof data.type === 'string') {
    const overall = (data.overall ?? {}) as Record<string, unknown>
    const score = Number(overall.score) || 0
    const total = Number(overall.total) || 0
    const accuracy = Number(overall.accuracy) || 0
    return {
      score,
      total,
      scorePct: total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0,
      accuracy: Number(accuracy.toFixed(1)),
      createdAt: toMillis(data.createdAt),
    }
  }

  const score = Number(data.score) || 0
  const total = Number(data.maxScore) || 0
  const accuracy = Number(data.accuracyPct) || 0
  return {
    score,
    total,
    scorePct: total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0,
    accuracy: Number(accuracy.toFixed(1)),
    createdAt: toMillis(data.createdAt),
  }
}

function roundHours(seconds: number) {
  return Number((seconds / 3600).toFixed(1))
}

function buildBadges(input: {
  consistencyDays: number
  todayHours: number
  averageAccuracy: number
  mockImprovement: number
  totalHours: number
  inactive: boolean
}) {
  const badges: string[] = []
  if (input.consistencyDays >= 20) badges.push('🔥 Streak Master')
  if (input.totalHours >= 40) badges.push('🧠 Deep Worker')
  if (input.averageAccuracy >= 80 || input.mockImprovement >= 8) badges.push('⚡ Fast Learner')
  if (input.inactive) badges.push('💤 Inactive')
  return badges
}

export function useLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  const meUid = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const user = JSON.parse(raw) as { uid?: string }
      return typeof user.uid === 'string' ? user.uid : null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const db = getDb()
        const usersSnap = await getDocs(collection(db, 'users'))
        const today = todayKey()
        const weekKeys = new Set(lastNDaysKeys(7))
        const consistencyKeys = new Set(lastNDaysKeys(28))
        const activeKeys = new Set(lastNDaysKeys(3))
        const heatmapKeys = lastNDaysKeys(35)
        const nextRows = await Promise.all(
          usersSnap.docs.map(async (userDoc) => {
            const uid = userDoc.id
            const profile = profileFromSnap(userDoc.data() as Record<string, unknown>)
            const [dailyStatsSnap, sessionsSnap, mocksSnap] = await Promise.all([
              getDocs(collection(db, `users/${uid}/dailyStats`)),
              getDocs(collection(db, `users/${uid}/sessions`)),
              getDocs(collection(db, `users/${uid}/mocks`)),
            ])

            let totalSec = 0
            let weekSec = 0
            let todaySec = 0
            let consistencyDays = 0
            let lastActivity = 'No activity'
            let morningSec = 0
            let eveningSec = 0
            const subjectTotals = new Map<string, number>()
            const heatmapLookup = new Map(heatmapKeys.map((key) => [key, 0]))

            for (const statDoc of dailyStatsSnap.docs) {
              const dayKey = statDoc.id
              const totalForDay = Number((statDoc.data() as { totalSec?: number }).totalSec) || 0
              totalSec += totalForDay
              if (weekKeys.has(dayKey)) weekSec += totalForDay
              if (dayKey === today) todaySec += totalForDay
              if (consistencyKeys.has(dayKey) && totalForDay > 0) consistencyDays += 1
              if (heatmapLookup.has(dayKey)) heatmapLookup.set(dayKey, totalForDay)
              if (lastActivity === 'No activity' || dayKey > lastActivity) lastActivity = dayKey
            }

            const mockMetrics = mocksSnap.docs
              .map((mockDoc) => getMockMetric(mockDoc.data() as Record<string, unknown>))
              .filter((metric): metric is RawMockMetric => metric !== null)
              .sort((a, b) => a.createdAt - b.createdAt)

            const latestMock = mockMetrics.at(-1)
            const averageMockScore = mockMetrics.length
              ? Number((mockMetrics.reduce((sum, item) => sum + item.scorePct, 0) / mockMetrics.length).toFixed(1))
              : 0
            const averageAccuracy = mockMetrics.length
              ? Number((mockMetrics.reduce((sum, item) => sum + item.accuracy, 0) / mockMetrics.length).toFixed(1))
              : 0
            const mockImprovement =
              mockMetrics.length >= 2
                ? Number((mockMetrics[mockMetrics.length - 1]!.scorePct - mockMetrics[0]!.scorePct).toFixed(1))
                : 0

            for (const sessionDoc of sessionsSnap.docs) {
              const data = sessionDoc.data() as { endedAt?: unknown; durationSec?: number; subject?: string; timeOfDay?: string }
              const stamp = toMillis(data.endedAt)
              const durationSec = Number(data.durationSec) || 0
              const subject = String(data.subject ?? '')
              if (!stamp || durationSec <= 0) continue
              subjectTotals.set(subject, (subjectTotals.get(subject) ?? 0) + durationSec)
              if (data.timeOfDay === 'morning' || data.timeOfDay === 'afternoon') morningSec += durationSec
              else if (data.timeOfDay === 'evening' || data.timeOfDay === 'night') eveningSec += durationSec
              else {
                const hour = new Date(stamp).getHours()
                if (hour < 15) morningSec += durationSec
                else eveningSec += durationSec
              }
            }

            const fallbackName = profile.displayName || userNameByUid[uid] || 'User'
            const identity = getIdentity(fallbackName)
            const topSubject = [...subjectTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None'
            const inactive = lastActivity === 'No activity' || !activeKeys.has(lastActivity)

            const badges = buildBadges({
              consistencyDays,
              todayHours: roundHours(todaySec),
              averageAccuracy,
              mockImprovement,
              totalHours: roundHours(totalSec),
              inactive,
            })

            return {
              uid,
              username: fallbackName,
              displayName: profile.displayName || identity.displayName || capitalizeName(fallbackName),
              avatarIcon: profile.avatarIcon || identity.avatar.icon,
              avatarColor: profile.avatarColor || identity.avatar.color,
              xp: profile.xp,
              streak: profile.streak,
              todayHours: roundHours(todaySec),
              weekHours: roundHours(weekSec),
              totalHours: roundHours(totalSec),
              mockCount: mockMetrics.length,
              latestMockRawScore: latestMock?.score ?? 0,
              latestMockTotal: latestMock?.total ?? 0,
              latestMockScore: latestMock?.scorePct ?? 0,
              averageMockScore,
              averageAccuracy,
              mockImprovement,
              totalSessions: sessionsSnap.size,
              lastActivity,
              consistencyDays,
              inactive,
              morningHours: roundHours(morningSec),
              eveningHours: roundHours(eveningSec),
              topSubject: topSubject === 'GS' ? 'GA' : topSubject,
              badges,
              heatmap: heatmapKeys.map((dayKey) => ({
                dayKey,
                value: heatmapLookup.get(dayKey) ?? 0,
              })),
            }
          }),
        )

        nextRows.sort((a, b) => {
          if (b.xp !== a.xp) return b.xp - a.xp
          if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours
          return b.streak - a.streak
        })

        if (!cancelled) setRows(nextRows)
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { rows, loading, meUid }
}
