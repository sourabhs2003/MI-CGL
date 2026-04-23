import { collection, getDocs } from 'firebase/firestore'
import { formatDistanceToNowStrict } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '../firebase'
import { USERS } from '../lib/auth'
import { lastNDaysKeys, todayKey } from '../lib/dates'
import { toMillis } from '../lib/firestoreTime'
import { capitalizeName, getIdentity } from '../lib/identity'
import { normalizeStoredStudySeconds } from '../lib/studyDuration'
import { XP_MOCK_DONE, xpFromStudySeconds } from '../lib/xp'
import { listenToActiveSessions, type ActiveSession } from '../services/studySession'
import { profileFromSnap } from '../services/userProfile'

type Movement = 'up' | 'down' | 'same'
type Momentum = 'up' | 'down' | 'same'
type RoleKey = 'Leader' | 'Grinder' | 'Sniper' | 'At Risk'
type MemberStatus = 'Active' | 'Inactive' | 'Frozen'
type StatusLevel = 'active' | 'low' | 'inactive' | 'frozen'

type RawSession = {
  id: string
  dayKey: string
  durationSec: number
  subject: string
  endedAtMs: number
  startedAtMs: number
}

type RawMock = {
  id: string
  createdAtMs: number
  dayKey: string
  rawScore: number
  total: number
  scorePct: number
  accuracy: number
  subjectBreakdown: Array<{
    subject: string
    scorePct: number
  }>
}

type MemberAggregate = {
  uid: string
  username: string
  displayName: string
  avatarColor: string
  xp: number
  streak: number
  lastStudyDay: string | null
  totalStudySec: number
  todayStudySec: number
  weekStudySec: number
  lastWeekStudySec: number
  last30StudySec: number
  todaySessions: number
  weekSessions: number
  last30Sessions: number
  totalSessions: number
  last7ConsistencyDays: number
  last30ConsistencyDays: number
  lastActivityMs: number
  mocks: RawMock[]
  sessions: RawSession[]
  heatmap: Array<{ dayKey: string; value: number }>
  subjectTotals30d: Map<string, number>
  frozen: boolean
  inactive: boolean
}

export type SquadFeedItem = {
  id: string
  uid: string
  displayName: string
  username: string
  action: string
  timestampLabel: string
  occurredAtMs: number
  active: boolean
}

export type SquadRoleCard = {
  role: RoleKey
  uid: string
  displayName: string
  username: string
  meta: string
}

export type SquadMemberCard = {
  uid: string
  displayName: string
  username: string
  avatarColor: string
  xp: number
  todayHours: number
  weekHours: number
  totalHours: number
  streak: number
  contributionPct: number
  rank: number | null
  rankMovement: Movement
  momentum: Momentum
  role: RoleKey | null
  status: MemberStatus
  statusLevel: StatusLevel
  inactive: boolean
  frozen: boolean
  isMe: boolean
  live: boolean
  mockAverageScore: number | null
  mockLatestScore: number | null
  mockAccuracy: number | null
}

export type MemberComparison = {
  todayHoursDiff: number
  weeklyHoursDiff: number
  mockScoreDiff: number | null
  againstName: string
}

export type MemberProfileData = {
  uid: string
  displayName: string
  username: string
  avatarColor: string
  rank: number | null
  role: RoleKey | null
  status: MemberStatus
  xp: number
  streak: number
  todayHours: number
  weekHours: number
  totalHours: number
  studyHistory: {
    today: { totalHours: number; sessions: number; avgSessionMinutes: number }
    sevenDays: { totalHours: number; sessions: number; avgSessionMinutes: number }
    thirtyDays: { totalHours: number; sessions: number; avgSessionMinutes: number }
  }
  heatmap: Array<{ dayKey: string; hours: number }>
  mockPerformance: {
    latestScore: number
    bestScore: number
    averageScore: number
    accuracy: number
  } | null
  subjectAnalysis: Array<{
    subject: string
    hours: number
    intensityPct: number
    emphasis: 'Strength' | 'Weakness' | 'Neutral'
  }>
  comparison: MemberComparison | null
  insights: string[]
  isMe: boolean
}

export type SquadPageData = {
  loading: boolean
  mission: {
    goalHours: number
    currentHours: number
    remainingHours: number
    activeMembers: number
    totalMembers: number
    contributors: Array<{
      uid: string
      displayName: string
      username: string
      contributionPct: number
    }>
  }
  alerts: Array<{
    tone: 'warning' | 'critical'
    message: string
  }>
  activity: SquadFeedItem[]
  leaderboard: SquadMemberCard[]
  health: {
    score: number
    label: 'Good' | 'Needs Improvement' | 'Critical'
    activeRatio: number
    consistencyRatio: number
  }
  weeklyTrend: {
    currentWeekHours: number
    lastWeekHours: number
  } | null
  roles: SquadRoleCard[]
  membersById: Record<string, MemberProfileData>
}

const MISSION_GOAL_HOURS = 10

function roundHours(seconds: number) {
  return Number((seconds / 3600).toFixed(1))
}

function roundMinutes(seconds: number) {
  return Math.round(seconds / 60)
}

function compactRelativeTime(timestamp: number) {
  if (!timestamp) return ''
  const text = formatDistanceToNowStrict(timestamp, { addSuffix: true })
  return text
    .replace(' seconds ago', 's ago')
    .replace(' second ago', 's ago')
    .replace(' minutes ago', 'm ago')
    .replace(' minute ago', 'm ago')
    .replace(' hours ago', 'h ago')
    .replace(' hour ago', 'h ago')
    .replace(' days ago', 'd ago')
    .replace(' day ago', 'd ago')
}

function getDayKeyFromTimestamp(timestamp: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseMock(data: Record<string, unknown>, id: string): RawMock | null {
  const overall = (data.overall ?? {}) as Record<string, unknown>
  const rawScore = Number(overall.score ?? data.score) || 0
  const total = Number(overall.total ?? data.maxScore) || 0
  const accuracy = Number(overall.accuracy ?? data.accuracyPct) || 0
  const createdAtMs = toMillis(data.createdAt)
  const dayKey = typeof data.dayKey === 'string' ? data.dayKey : getDayKeyFromTimestamp(createdAtMs)
  const scorePct = total > 0 ? Number(((rawScore / total) * 100).toFixed(1)) : 0
  const subjectBreakdown: Array<{ subject: string; scorePct: number }> = []

  if (Array.isArray(data.sections)) {
    for (const section of data.sections) {
      if (!section || typeof section !== 'object') continue
      const item = section as Record<string, unknown>
      const sectionTotal = Number(item.total ?? item.maxScore) || 0
      const sectionScore = Number(item.score) || 0
      if (!sectionTotal) continue
      const subject = String(item.name ?? '').trim()
      if (!subject) continue
      subjectBreakdown.push({
        subject,
        scorePct: Number(((sectionScore / sectionTotal) * 100).toFixed(1)),
      })
    }
  } else if (typeof data.subject === 'string' && total > 0) {
    subjectBreakdown.push({
      subject: String(data.subject),
      scorePct,
    })
  }

  return {
    id,
    createdAtMs,
    dayKey,
    rawScore,
    total,
    scorePct,
    accuracy: Number(accuracy.toFixed(1)),
    subjectBreakdown,
  }
}

function parseSession(uid: string, id: string, data: Record<string, unknown>): RawSession | null {
  const dayKey = String(data.dayKey ?? data.dateKey ?? '')
  const subject = String(data.subject ?? 'Miscellaneous')
  const durationSec = normalizeStoredStudySeconds({
    durationSec: data.durationSec,
    duration: data.duration,
    startTime: data.startTime,
    endTime: data.endTime,
  })
  const endedAtMs = toMillis(data.endedAt) || (typeof data.endTime === 'number' ? data.endTime : 0)
  const startedAtMs = typeof data.startTime === 'number' ? data.startTime : 0
  const isActiveTimerSession = data.endTime === null

  if (isActiveTimerSession) return null
  if (!dayKey || durationSec <= 0) return null

  return {
    id: `${uid}-${id}`,
    dayKey,
    durationSec,
    subject,
    endedAtMs,
    startedAtMs,
  }
}

function getRoleAssignments(members: MemberAggregate[]) {
  const eligible = members.filter((member) => !member.frozen)
  const roleByUid = new Map<string, RoleKey>()
  const cards: SquadRoleCard[] = []

  const assign = (role: RoleKey, member: MemberAggregate | undefined, meta: string) => {
    if (!member) return
    if (!roleByUid.has(member.uid)) roleByUid.set(member.uid, role)
    cards.push({
      role,
      uid: member.uid,
      displayName: member.displayName,
      username: member.username,
      meta,
    })
  }

  const leader = [...eligible].sort((a, b) => b.xp - a.xp)[0]
  const grinder = [...eligible].sort((a, b) => b.last30StudySec - a.last30StudySec)[0]
  const sniper = [...eligible]
    .filter((member) => member.mocks.length > 0)
    .sort((a, b) => {
      const aAvg = a.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / a.mocks.length
      const bAvg = b.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / b.mocks.length
      return bAvg - aAvg
    })[0]
  const atRisk = [...eligible]
    .filter((member) => member.inactive || member.weekStudySec > 0 || member.totalStudySec > 0)
    .sort((a, b) => {
      if (a.inactive !== b.inactive) return Number(b.inactive) - Number(a.inactive)
      return a.weekStudySec - b.weekStudySec
    })[0]

  assign('Leader', leader, `${leader?.xp ?? 0} XP`)
  assign('Grinder', grinder, `${roundHours(grinder?.last30StudySec ?? 0)}h in 30d`)
  if (sniper) {
    const avg = sniper.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / sniper.mocks.length
    assign('Sniper', sniper, `${avg.toFixed(1)}% avg mock`)
  }
  if (atRisk && (atRisk.inactive || atRisk.weekStudySec > 0 || atRisk.totalStudySec > 0)) {
    assign('At Risk', atRisk, atRisk.inactive ? 'No recent study' : `${roundHours(atRisk.weekStudySec)}h this week`)
  }

  return { roleByUid, cards }
}

function healthLabel(score: number): 'Good' | 'Needs Improvement' | 'Critical' {
  if (score >= 75) return 'Good'
  if (score >= 45) return 'Needs Improvement'
  return 'Critical'
}

function buildMemberInsights(params: {
  member: MemberAggregate
  currentRank: number | null
  sortedMembers: MemberAggregate[]
  role: RoleKey | null
}) {
  const { member, currentRank, sortedMembers } = params
  const insights: string[] = []
  const last7Hours = roundHours(member.weekStudySec)
  const prev7Hours = roundHours(member.lastWeekStudySec)

  if (prev7Hours > 0 && last7Hours > 0 && last7Hours < prev7Hours * 0.8) {
    const dropPct = Math.round(((prev7Hours - last7Hours) / prev7Hours) * 100)
    insights.push(`Consistency dropped ${dropPct}% versus the previous 7 days.`)
  }

  const strongestSubject = [...member.subjectTotals30d.entries()].sort((a, b) => b[1] - a[1])[0]
  const weakestSubject = [...member.subjectTotals30d.entries()].sort((a, b) => a[1] - b[1])[0]
  if (strongestSubject && weakestSubject && strongestSubject[0] !== weakestSubject[0] && strongestSubject[1] > weakestSubject[1] * 1.5) {
    insights.push(
      `Strongest focus is ${strongestSubject[0]} at ${roundHours(strongestSubject[1])}h, while ${weakestSubject[0]} is down at ${roundHours(weakestSubject[1])}h.`,
    )
  }

  const subjectMocks = new Map<string, number[]>()
  for (const mock of member.mocks) {
    for (const subject of mock.subjectBreakdown) {
      if (!subjectMocks.has(subject.subject)) subjectMocks.set(subject.subject, [])
      subjectMocks.get(subject.subject)!.push(subject.scorePct)
    }
  }

  if (subjectMocks.size >= 2) {
    const ranked = [...subjectMocks.entries()]
      .map(([subject, scores]) => ({
        subject,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      }))
      .sort((a, b) => b.average - a.average)

    const strongest = ranked[0]
    const weakest = ranked.at(-1)
    if (strongest && weakest && strongest.subject !== weakest.subject && strongest.average - weakest.average >= 8) {
      insights.push(`Mock pattern shows ${strongest.subject} stronger than ${weakest.subject} by ${(strongest.average - weakest.average).toFixed(1)} points.`)
    }
  }

  if (currentRank != null && currentRank > 1) {
    const nextUp = sortedMembers[currentRank - 2]
    const dailyPaceXp = Math.max(
      0.1,
      (
        xpFromStudySeconds(member.weekStudySec) +
        member.mocks.filter((mock) => lastNDaysKeys(7).includes(mock.dayKey)).length * XP_MOCK_DONE
      ) / 7,
    )
    const gap = (nextUp?.xp ?? member.xp) - member.xp
    if (gap > 0 && gap / dailyPaceXp <= 14) {
      insights.push(`At the current pace, ${Math.ceil(gap / dailyPaceXp)} more day(s) can close the ${gap} XP gap to ${nextUp.displayName}.`)
    }
  }

  if (params.role === 'At Risk' && member.inactive) {
    insights.push('No study logged in the last 3 days, which is putting this rank under pressure.')
  }

  return insights.slice(0, 3)
}

function getMemberStatus(member: Pick<MemberAggregate, 'frozen' | 'inactive'>): MemberStatus {
  if (member.frozen) return 'Frozen'
  if (member.inactive) return 'Inactive'
  return 'Active'
}

function getStatusLevel(input: {
  frozen: boolean
  inactive: boolean
  todayStudySec: number
  hasActiveSession: boolean
}): StatusLevel {
  if (input.frozen) return 'frozen'
  if (input.inactive) return 'inactive'
  if (input.hasActiveSession || input.todayStudySec >= 1800) return 'active'
  return 'low'
}

function getMomentum(member: MemberAggregate): Momentum {
  const recentDays = new Set(lastNDaysKeys(3))
  const previousDays = new Set(lastNDaysKeys(6).slice(0, 3))
  let recentSec = 0
  let previousSec = 0

  for (const session of member.sessions) {
    if (recentDays.has(session.dayKey)) recentSec += session.durationSec
    else if (previousDays.has(session.dayKey)) previousSec += session.durationSec
  }

  const recentMocks = member.mocks.filter((mock) => recentDays.has(mock.dayKey)).length
  const previousMocks = member.mocks.filter((mock) => previousDays.has(mock.dayKey)).length
  const recentScore = recentSec + recentMocks * 1800
  const previousScore = previousSec + previousMocks * 1800

  if (recentScore >= previousScore + 1800) return 'up'
  if (previousScore >= recentScore + 1800) return 'down'
  return 'same'
}

export function useSquadPageData(input: {
  meUid: string | null
  isFrozen: boolean
  frozenAt: number | null
}) {
  const { meUid, isFrozen, frozenAt } = input
  const [loading, setLoading] = useState(true)
  const [pageData, setPageData] = useState<SquadPageData>({
    loading: true,
    mission: {
      goalHours: MISSION_GOAL_HOURS,
      currentHours: 0,
      remainingHours: MISSION_GOAL_HOURS,
      activeMembers: 0,
      totalMembers: 0,
      contributors: [],
    },
    alerts: [],
    activity: [],
    leaderboard: [],
    health: {
      score: 0,
      label: 'Critical',
      activeRatio: 0,
      consistencyRatio: 0,
    },
    weeklyTrend: null,
    roles: [],
    membersById: {},
  })
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [tick, setTick] = useState(() => Date.now())
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const unsubscribe = listenToActiveSessions(setActiveSessions)
    return unsubscribe
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const db = getDb()
        const now = Date.now()
        const usersSnap = await getDocs(collection(db, 'users'))
        const today = todayKey()
        const weekKeys = new Set(lastNDaysKeys(7))
        const lastWeekKeys = new Set(lastNDaysKeys(14).slice(0, 7))
        const last30Keys = new Set(lastNDaysKeys(30))
        const heatmapKeys = lastNDaysKeys(35)
        const activeWindow = new Set(lastNDaysKeys(5))
        const currentDayStart = new Date(`${today}T00:00:00`).getTime()

        const nameByUid = Object.fromEntries(USERS.map((user) => [user.uid, user.username])) as Record<string, string>

        const members = await Promise.all(
          usersSnap.docs.map(async (userDoc) => {
            const uid = userDoc.id
            const profile = profileFromSnap(userDoc.data() as Record<string, unknown>)
            const [sessionsSnap, mocksSnap] = await Promise.all([
              getDocs(collection(db, `users/${uid}/sessions`)),
              getDocs(collection(db, `users/${uid}/mocks`)),
            ])

            let totalStudySec = 0
            let todayStudySec = 0
            let weekStudySec = 0
            let lastWeekStudySec = 0
            let last30StudySec = 0
            let todaySessions = 0
            let weekSessions = 0
            let last30Sessions = 0
            let totalSessions = 0
            let last7ConsistencyDays = 0
            let last30ConsistencyDays = 0
            let lastActivityMs = 0
            const subjectTotals30d = new Map<string, number>()
            const heatmapLookup = new Map(heatmapKeys.map((dayKey) => [dayKey, 0]))
            const activeDays7 = new Set<string>()
            const activeDays30 = new Set<string>()

            const sessions = sessionsSnap.docs
              .map((sessionDoc) => parseSession(uid, sessionDoc.id, sessionDoc.data() as Record<string, unknown>))
              .filter((session): session is RawSession => session !== null)
              .sort((a, b) => b.endedAtMs - a.endedAtMs)

            for (const session of sessions) {
              totalSessions += 1
              totalStudySec += session.durationSec
              if (session.dayKey === today) todaySessions += 1
              if (weekKeys.has(session.dayKey)) weekSessions += 1
              if (last30Keys.has(session.dayKey)) last30Sessions += 1
              if (session.dayKey === today) todayStudySec += session.durationSec
              if (weekKeys.has(session.dayKey)) {
                weekStudySec += session.durationSec
                activeDays7.add(session.dayKey)
              }
              if (lastWeekKeys.has(session.dayKey)) lastWeekStudySec += session.durationSec
              if (last30Keys.has(session.dayKey)) {
                last30StudySec += session.durationSec
                activeDays30.add(session.dayKey)
              }
              if (session.endedAtMs > lastActivityMs) lastActivityMs = session.endedAtMs

              if (heatmapLookup.has(session.dayKey)) {
                heatmapLookup.set(session.dayKey, (heatmapLookup.get(session.dayKey) ?? 0) + session.durationSec)
              }
              if (last30Keys.has(session.dayKey)) {
                subjectTotals30d.set(session.subject, (subjectTotals30d.get(session.subject) ?? 0) + session.durationSec)
              }
            }
            last7ConsistencyDays = activeDays7.size
            last30ConsistencyDays = activeDays30.size

            const mocks = mocksSnap.docs
              .map((mockDoc) => parseMock(mockDoc.data() as Record<string, unknown>, mockDoc.id))
              .filter((mock): mock is RawMock => mock !== null)
              .sort((a, b) => b.createdAtMs - a.createdAtMs)

            for (const mock of mocks) {
              if (mock.createdAtMs > lastActivityMs) lastActivityMs = mock.createdAtMs
            }

            const fallbackName = profile.displayName || nameByUid[uid] || 'User'
            const identity = getIdentity(fallbackName)
            const frozen = profile.isFrozen === true || (uid === meUid && isFrozen)
            const lastActivityDay = lastActivityMs ? getDayKeyFromTimestamp(lastActivityMs) : profile.lastStudyDay
            const inactive = frozen || !lastActivityDay || !activeWindow.has(lastActivityDay)

            return {
              uid,
              username: nameByUid[uid] || fallbackName,
              displayName: profile.displayName || identity.displayName || capitalizeName(fallbackName),
              avatarColor: profile.avatarColor || identity.avatar.color,
              xp: profile.xp,
              streak: profile.streak,
              lastStudyDay: profile.lastStudyDay,
              totalStudySec,
              todayStudySec,
              weekStudySec,
              lastWeekStudySec,
              last30StudySec,
              todaySessions,
              weekSessions,
              last30Sessions,
              totalSessions,
              last7ConsistencyDays,
              last30ConsistencyDays,
              lastActivityMs,
              mocks,
              sessions,
              heatmap: heatmapKeys.map((dayKey) => ({
                dayKey,
                value: heatmapLookup.get(dayKey) ?? 0,
              })),
              subjectTotals30d,
              frozen,
              inactive,
            } satisfies MemberAggregate
          }),
        )

        const { roleByUid, cards } = getRoleAssignments(members)
        const activeByUid = new Map(activeSessions.map((session) => [session.userId, session]))
        const liveSecByUid = new Map(
          activeSessions.map((session) => [session.userId, Math.max(0, Math.round((now - session.startTime) / 1000))]),
        )
        const rankingPool = members.filter((member) => !member.frozen && !member.inactive)
        const ranked = [...rankingPool].sort((a, b) => {
          if (b.xp !== a.xp) return b.xp - a.xp
          if (b.weekStudySec !== a.weekStudySec) return b.weekStudySec - a.weekStudySec
          return b.streak - a.streak
        })
        const currentRankByUid = new Map(ranked.map((member, index) => [member.uid, index + 1]))

        const previousRankByUid = new Map(
          [...rankingPool]
            .sort((a, b) => {
              const aTodayMocks = a.mocks.filter((mock) => mock.dayKey === today).length * XP_MOCK_DONE
              const bTodayMocks = b.mocks.filter((mock) => mock.dayKey === today).length * XP_MOCK_DONE
              const aPreviousXp = a.xp - xpFromStudySeconds(a.todayStudySec) - aTodayMocks
              const bPreviousXp = b.xp - xpFromStudySeconds(b.todayStudySec) - bTodayMocks
              if (bPreviousXp !== aPreviousXp) return bPreviousXp - aPreviousXp
              return b.streak - a.streak
            })
            .map((member, index) => [member.uid, index + 1] as const),
        )

        const eligibleMembers = members.filter((member) => !member.frozen && !member.inactive)
        const missionMembers = eligibleMembers.filter((member) => !member.inactive)
        const missionStudySec = missionMembers.reduce(
          (sum, member) => sum + member.todayStudySec + (liveSecByUid.get(member.uid) ?? 0),
          0,
        )
        const missionCurrentHours = roundHours(missionStudySec)
        const missionContributors = missionStudySec > 0
          ? missionMembers
              .filter((member) => member.todayStudySec + (liveSecByUid.get(member.uid) ?? 0) > 0)
              .map((member) => ({
                uid: member.uid,
                displayName: member.displayName,
                username: member.username,
                contributionPct: Math.round(((member.todayStudySec + (liveSecByUid.get(member.uid) ?? 0)) / missionStudySec) * 100),
              }))
              .sort((a, b) => b.contributionPct - a.contributionPct)
          : []

        const alerts: SquadPageData['alerts'] = []
        const activeSessionCount = missionMembers.filter((member) => activeByUid.has(member.uid)).length
        const inactiveMissionMembers = eligibleMembers.filter((member) => member.inactive)
        if (inactiveMissionMembers.length > 0) {
          alerts.push({
            tone: inactiveMissionMembers.length > 1 ? 'critical' : 'warning',
            message: `${inactiveMissionMembers[0]!.displayName} inactive today -> squad mission is under pressure.`,
          })
        }
        const remainingHours = Math.max(0, Number((MISSION_GOAL_HOURS - missionCurrentHours).toFixed(1)))
        if (remainingHours > 0 && missionCurrentHours > 0 && missionCurrentHours < MISSION_GOAL_HOURS * 0.5) {
          alerts.push({
            tone: 'critical',
            message: `${remainingHours.toFixed(1)}h still needed to hit the squad goal today.`,
          })
        }
        if (activeSessionCount === 0 && missionMembers.length > 0 && remainingHours > 0) {
          alerts.push({
            tone: 'warning',
            message: 'Nobody is studying live right now, so the squad streak window is getting tighter.',
          })
        }

        const completedStudyFeed = members.flatMap((member) =>
          member.sessions.slice(0, 5).map((session) => ({
            id: `session-${session.id}`,
            uid: member.uid,
            displayName: member.displayName,
            username: member.username,
            action:
              session.durationSec >= 3600
                ? `Studied ${roundHours(session.durationSec)}h`
                : `Studied ${roundMinutes(session.durationSec)} min`,
            timestampLabel: compactRelativeTime(session.endedAtMs || currentDayStart),
            occurredAtMs: session.endedAtMs || currentDayStart,
            active: false,
          })),
        )

        const mockFeed = members.flatMap((member) =>
          member.mocks.slice(0, 3).map((mock) => ({
            id: `mock-${member.uid}-${mock.id}`,
            uid: member.uid,
            displayName: member.displayName,
            username: member.username,
            action: 'Completed mock',
            timestampLabel: compactRelativeTime(mock.createdAtMs || currentDayStart),
            occurredAtMs: mock.createdAtMs || currentDayStart,
            active: false,
          })),
        )

        const liveFeed = activeSessions.map((session) => {
          const member = members.find((item) => item.uid === session.userId)
          return {
            id: `live-${session.userId}-${session.id}`,
            uid: session.userId,
            displayName: member?.displayName ?? 'User',
            username: member?.username ?? 'user',
            action: 'Started study session',
            timestampLabel: compactRelativeTime(session.startTime || Date.now()),
            occurredAtMs: session.startTime || Date.now(),
            active: true,
          } satisfies SquadFeedItem
        })

        const activity = [...liveFeed, ...completedStudyFeed, ...mockFeed]
          .filter((item) => item.occurredAtMs > 0)
          .sort((a, b) => b.occurredAtMs - a.occurredAtMs)
          .slice(0, 8)

        const eligibleForHealth = members.filter((member) => !member.frozen && !member.inactive)
        const activeRatio = eligibleForHealth.length
          ? missionMembers.length / eligibleForHealth.length
          : 0
        const totalWeekHours = roundHours(eligibleForHealth.reduce((sum, member) => sum + member.weekStudySec, 0))
        const consistencyRatio = eligibleForHealth.length
          ? eligibleForHealth.reduce((sum, member) => sum + member.last7ConsistencyDays / 7, 0) / eligibleForHealth.length
          : 0
        const weekGoalHours = Math.max(eligibleForHealth.length * 7, 1)
        const healthScore = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              activeRatio * 40 +
              Math.min(totalWeekHours / weekGoalHours, 1) * 35 +
              consistencyRatio * 25,
            ),
          ),
        )

        const totalCurrentWeekHours = roundHours(eligibleForHealth.reduce((sum, member) => sum + member.weekStudySec, 0))
        const totalLastWeekHours = roundHours(eligibleForHealth.reduce((sum, member) => sum + member.lastWeekStudySec, 0))
        const weeklyTrend =
          totalCurrentWeekHours > 0 && totalLastWeekHours > 0
            ? {
                currentWeekHours: totalCurrentWeekHours,
                lastWeekHours: totalLastWeekHours,
              }
            : null

        const leaderboard: SquadMemberCard[] = members
          .map((member) => {
            const currentRank = currentRankByUid.get(member.uid) ?? null
            const previousRank = previousRankByUid.get(member.uid) ?? currentRank
            const movement: Movement =
              currentRank == null || previousRank == null || currentRank === previousRank
                ? 'same'
                : currentRank < previousRank
                  ? 'up'
                  : 'down'

            const mockAverageScore = member.mocks.length
              ? Number((member.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / member.mocks.length).toFixed(1))
              : null
            const latestMock = member.mocks[0]
            const averageAccuracy = member.mocks.length
              ? Number((member.mocks.reduce((sum, mock) => sum + mock.accuracy, 0) / member.mocks.length).toFixed(1))
              : null
            const hasActiveSession = activeByUid.has(member.uid)
            const liveStudySec = liveSecByUid.get(member.uid) ?? 0

            return {
              uid: member.uid,
              displayName: member.displayName,
              username: member.username,
              avatarColor: member.avatarColor,
              xp: member.xp,
              todayHours: roundHours(member.todayStudySec + liveStudySec),
              weekHours: roundHours(member.weekStudySec + liveStudySec),
              totalHours: roundHours(member.totalStudySec + liveStudySec),
              streak: member.streak,
              contributionPct:
                missionStudySec > 0 && !member.frozen && !member.inactive
                  ? Math.round(((member.todayStudySec + liveStudySec) / missionStudySec) * 100)
                  : 0,
              rank: currentRank,
              rankMovement: movement,
              momentum: getMomentum(member),
              role: roleByUid.get(member.uid) ?? null,
              status: getMemberStatus(member),
              statusLevel: getStatusLevel({
                frozen: member.frozen,
                inactive: member.inactive,
                todayStudySec: member.todayStudySec,
                hasActiveSession,
              }),
              inactive: member.inactive,
              frozen: member.frozen,
              isMe: member.uid === meUid,
              live: hasActiveSession,
              mockAverageScore,
              mockLatestScore: latestMock?.scorePct ?? null,
              mockAccuracy: averageAccuracy,
            }
          })
          .sort((a, b) => {
            if (a.frozen !== b.frozen) return Number(a.frozen) - Number(b.frozen)
            if (a.rank == null && b.rank == null) return 0
            if (a.rank == null) return 1
            if (b.rank == null) return -1
            return a.rank - b.rank
          })

        const membersById = Object.fromEntries(
          members.map((member) => {
            const currentRank = currentRankByUid.get(member.uid) ?? null
            const liveStudySec = liveSecByUid.get(member.uid) ?? 0
            const mockPerformance = member.mocks.length > 0
              ? {
                  latestScore: member.mocks[0]!.scorePct,
                  bestScore: Number(Math.max(...member.mocks.map((mock) => mock.scorePct)).toFixed(1)),
                  averageScore: Number((member.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / member.mocks.length).toFixed(1)),
                  accuracy: Number((member.mocks.reduce((sum, mock) => sum + mock.accuracy, 0) / member.mocks.length).toFixed(1)),
                }
              : null

            const subjectEntries = [...member.subjectTotals30d.entries()]
              .filter(([, value]) => value > 0)
              .sort((a, b) => b[1] - a[1])

            const maxSubjectSec = subjectEntries[0]?.[1] ?? 0
            const minSubjectSec = subjectEntries.at(-1)?.[1] ?? 0
            const subjectAnalysis = subjectEntries.map(([subject, value]) => ({
              subject,
              hours: roundHours(value),
              intensityPct: maxSubjectSec > 0 ? Math.max(12, Math.round((value / maxSubjectSec) * 100)) : 0,
              emphasis:
                maxSubjectSec > 0 && value === maxSubjectSec
                  ? ('Strength' as const)
                  : minSubjectSec > 0 && value === minSubjectSec
                    ? ('Weakness' as const)
                    : ('Neutral' as const),
            }))

            const me = meUid ? members.find((item) => item.uid === meUid) : null
            const meMockAverage = me && me.mocks.length
              ? Number((me.mocks.reduce((sum, mock) => sum + mock.scorePct, 0) / me.mocks.length).toFixed(1))
              : null
            const comparison =
              me && me.uid !== member.uid
                ? {
                    todayHoursDiff: Number(
                      (
                        roundHours(member.todayStudySec + liveStudySec) -
                        roundHours(me.todayStudySec + (liveSecByUid.get(me.uid) ?? 0))
                      ).toFixed(1),
                    ),
                    weeklyHoursDiff: Number(
                      (
                        roundHours(member.weekStudySec + liveStudySec) -
                        roundHours(me.weekStudySec + (liveSecByUid.get(me.uid) ?? 0))
                      ).toFixed(1),
                    ),
                    mockScoreDiff:
                      mockPerformance?.averageScore != null && meMockAverage != null
                        ? Number((mockPerformance.averageScore - meMockAverage).toFixed(1))
                        : null,
                    againstName: me.displayName,
                  }
                : null

            return [
              member.uid,
              {
                uid: member.uid,
                displayName: member.displayName,
                username: member.username,
                avatarColor: member.avatarColor,
                rank: currentRank,
                role: roleByUid.get(member.uid) ?? null,
                status: getMemberStatus(member),
                xp: member.xp,
                streak: member.streak,
                todayHours: roundHours(member.todayStudySec + liveStudySec),
                weekHours: roundHours(member.weekStudySec + liveStudySec),
                totalHours: roundHours(member.totalStudySec + liveStudySec),
                studyHistory: {
                  today: {
                    totalHours: roundHours(member.todayStudySec + liveStudySec),
                    sessions: member.todaySessions,
                    avgSessionMinutes: member.todaySessions ? roundMinutes(member.todayStudySec / member.todaySessions) : 0,
                  },
                  sevenDays: {
                    totalHours: roundHours(member.weekStudySec + liveStudySec),
                    sessions: member.weekSessions,
                    avgSessionMinutes: member.weekSessions ? roundMinutes(member.weekStudySec / member.weekSessions) : 0,
                  },
                  thirtyDays: {
                    totalHours: roundHours(member.last30StudySec + liveStudySec),
                    sessions: member.last30Sessions,
                    avgSessionMinutes: member.last30Sessions ? roundMinutes(member.last30StudySec / member.last30Sessions) : 0,
                  },
                },
                heatmap: member.heatmap.map((item) => ({
                  dayKey: item.dayKey,
                  hours: Number((item.value / 3600).toFixed(1)),
                })),
                mockPerformance,
                subjectAnalysis,
                comparison,
                insights: buildMemberInsights({
                  member,
                  currentRank,
                  sortedMembers: ranked,
                  role: roleByUid.get(member.uid) ?? null,
                }),
                isMe: member.uid === meUid,
              } satisfies MemberProfileData,
            ]
          }),
        ) as Record<string, MemberProfileData>

        if (!cancelled) {
          setPageData({
            loading: false,
            mission: {
              goalHours: MISSION_GOAL_HOURS,
              currentHours: missionCurrentHours,
              remainingHours,
              activeMembers: missionMembers.length,
              totalMembers: members.length,
              contributors: missionContributors,
            },
            alerts,
            activity,
            leaderboard,
            health: {
              score: healthScore,
              label: healthLabel(healthScore),
              activeRatio,
              consistencyRatio,
            },
            weeklyTrend,
            roles: cards,
            membersById,
          })
        }

        if (!cancelled && isFrozen && meUid) {
          const myLatestSession = members.find((member) => member.uid === meUid)?.sessions[0]
          if (frozenAt && myLatestSession && myLatestSession.endedAtMs > frozenAt) {
            window.dispatchEvent(new CustomEvent('squad:auto-unfreeze'))
          }
          const myActiveSession = activeByUid.get(meUid)
          if (frozenAt && myActiveSession && myActiveSession.startTime > frozenAt) {
            window.dispatchEvent(new CustomEvent('squad:auto-unfreeze'))
          }
        }
      } catch (error) {
        console.error('Failed to load squad page data:', error)
        if (!cancelled) {
          setPageData((previous) => ({
            ...previous,
            loading: false,
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [activeSessions, frozenAt, isFrozen, meUid, refreshKey])

  return useMemo(
    () => ({
      ...pageData,
      activity: pageData.activity.map((item) => ({
        ...item,
        timestampLabel: compactRelativeTime(item.occurredAtMs || tick),
      })),
      loading,
    }),
    [loading, pageData, tick],
  )
}
