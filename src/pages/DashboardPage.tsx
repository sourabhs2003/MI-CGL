import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useMocks, useSessions } from '../hooks/useFirestoreData'
import { lastNDaysKeys, todayKey } from '../lib/dates'
import {
  buildFullSectionBreakdown,
  buildMockScoreTrend,
  buildSectionalSubjectPerformance,
  getAverageAccuracy,
  getLatestMock,
  splitMocks,
} from '../lib/mockAnalytics'
import type { FullMockDoc, MockDoc, Subject, StudySessionDoc } from '../types'

type AnalyticsFilter = 'tier1' | 'tier2' | 'sectional'

type BreakdownRow = {
  name: string
  score: number
  accuracy: number
}

type TimelineRow = {
  id: string
  label: string
}

const filters: Array<{ key: AnalyticsFilter; label: string }> = [
  { key: 'tier1', label: 'Tier 1' },
  { key: 'tier2', label: 'Tier 2' },
  { key: 'sectional', label: 'Sectional' },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function buildDailyStudy(sessions: StudySessionDoc[]) {
  const keys = lastNDaysKeys(10)
  const lookup = new Map(keys.map((key) => [key, 0]))
  for (const session of sessions) {
    if (lookup.has(session.dayKey)) lookup.set(session.dayKey, (lookup.get(session.dayKey) ?? 0) + session.durationSec)
  }
  return keys.map((dayKey) => ({
    label: dayKey.slice(5),
    hours: Number(((lookup.get(dayKey) ?? 0) / 3600).toFixed(1)),
  }))
}

function buildWeeklyStudy(sessions: StudySessionDoc[]) {
  return Array.from({ length: 8 }, (_, index) => {
    const keys = lastNDaysKeys(56).slice(index * 7, index * 7 + 7)
    const keySet = new Set(keys)
    const totalSec = sessions.reduce((sum, session) => (keySet.has(session.dayKey) ? sum + session.durationSec : sum), 0)
    return {
      label: keys[0]?.slice(5) ?? '',
      hours: Number((totalSec / 3600).toFixed(1)),
    }
  })
}

function buildStudySubjects(sessions: StudySessionDoc[]) {
  const monthKeys = new Set(lastNDaysKeys(30))
  const totals = new Map<Subject, number>([
    ['Maths', 0],
    ['GS', 0],
    ['English', 0],
    ['Reasoning', 0],
    ['Mock', 0],
    ['Mixed', 0],
  ])
  for (const session of sessions) {
    if (monthKeys.has(session.dayKey)) totals.set(session.subject, (totals.get(session.subject) ?? 0) + session.durationSec)
  }
  const max = Math.max(...[...totals.values()], 1)
  return [...totals.entries()]
    .filter(([name]) => name !== 'Mixed' && name !== 'Mock')
    .map(([name, sec]) => {
      const ratio = sec / max
      return {
        name: name === 'GS' ? 'GA' : name,
        hours: Number((sec / 3600).toFixed(1)),
        strength: ratio > 0.66 ? 'High' : ratio > 0.33 ? 'Medium' : 'Low',
      }
    })
    .sort((a, b) => b.hours - a.hours)
}

function buildSectionRows(filter: AnalyticsFilter, fullMocks: FullMockDoc[], sectionalMocks: MockDoc[]): BreakdownRow[] {
  if (filter === 'sectional') {
    return buildSectionalSubjectPerformance(sectionalMocks.filter((mock) => mock.type === 'sectional')).map((item) => ({
      name: item.name,
      score: item.avgScorePct,
      accuracy: item.avgAccuracy,
    }))
  }
  return buildFullSectionBreakdown(fullMocks).map((item) => ({
    name: item.name,
    score: item.avgScorePct,
    accuracy: item.avgAccuracy,
  }))
}

function formatBlockHours(seconds: number) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function getBlockLabel(hour: number) {
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  if (hour < 21) return 'Evening'
  return 'Night'
}

function getHourFromSession(session: Pick<StudySessionDoc, 'startTime' | 'endTime' | 'timeOfDay' | 'topic'>) {
  const time = session.startTime ?? session.endTime ?? session.topic.slice(0, 5)
  const hour = Number(time.slice(0, 2))
  if (!Number.isNaN(hour)) return hour
  if (session.timeOfDay === 'morning') return 8
  if (session.timeOfDay === 'afternoon') return 14
  if (session.timeOfDay === 'evening') return 18
  return 22
}

function buildTimeHeatmap(sessions: StudySessionDoc[]) {
  const keys = lastNDaysKeys(14)
  const slots = ['Morning', 'Afternoon', 'Evening', 'Night']
  const lookup = new Map<string, number>()

  for (const key of keys) {
    for (const slot of slots) lookup.set(`${key}-${slot}`, 0)
  }

  for (const session of sessions) {
    if (!keys.includes(session.dayKey)) continue
    const slot = session.timeOfDay
      ? session.timeOfDay[0].toUpperCase() + session.timeOfDay.slice(1)
      : getBlockLabel(getHourFromSession(session))
    const lookupKey = `${session.dayKey}-${slot}`
    lookup.set(lookupKey, (lookup.get(lookupKey) ?? 0) + session.durationSec)
  }

  return slots.map((slot) => ({
    slot,
    days: keys.map((dayKey) => ({
      dayKey,
      label: dayKey.slice(5),
      hours: Number(((lookup.get(`${dayKey}-${slot}`) ?? 0) / 3600).toFixed(1)),
    })),
  }))
}

export function DashboardPage() {
  const { user } = useAuth()
  const sessions = useSessions(user?.uid, 800)
  const mocks = useMocks(user?.uid)
  const [filter, setFilter] = useState<AnalyticsFilter>('tier1')
  const [selectedDay, setSelectedDay] = useState(todayKey())

  const { tier1Mocks, tier2Mocks, sectionalMocks } = useMemo(() => splitMocks(mocks), [mocks])
  const filteredMocks = useMemo<MockDoc[]>(() => {
    if (filter === 'tier1') return tier1Mocks
    if (filter === 'tier2') return tier2Mocks
    return sectionalMocks
  }, [filter, sectionalMocks, tier1Mocks, tier2Mocks])
  const filteredFullMocks = useMemo<FullMockDoc[]>(() => (filter === 'tier1' ? tier1Mocks : tier2Mocks), [filter, tier1Mocks, tier2Mocks])

  const dailyStudy = useMemo(() => buildDailyStudy(sessions), [sessions])
  const weeklyStudy = useMemo(() => buildWeeklyStudy(sessions), [sessions])
  const timeHeatmap = useMemo(() => buildTimeHeatmap(sessions), [sessions])
  const monthKeys = useMemo(() => lastNDaysKeys(30), [])
  const monthlyTotal = useMemo(
    () => Number((sessions.filter((session) => monthKeys.includes(session.dayKey)).reduce((sum, session) => sum + session.durationSec, 0) / 3600).toFixed(1)),
    [monthKeys, sessions],
  )
  const activeDays = useMemo(
    () => monthKeys.filter((dayKey) => sessions.some((session) => session.dayKey === dayKey)).length,
    [monthKeys, sessions],
  )
  const studySubjects = useMemo(() => buildStudySubjects(sessions), [sessions])
  const daySessions = useMemo(() => sessions.filter((session) => session.dayKey === selectedDay), [selectedDay, sessions])
  const dailyReport = useMemo(() => {
    const subjects = new Map<string, number>()
    let morning = 0
    let afternoon = 0
    let evening = 0
    let night = 0
    const timeline: TimelineRow[] = []

    for (const session of daySessions) {
      subjects.set(session.subject, (subjects.get(session.subject) ?? 0) + session.durationSec)
      const hour = getHourFromSession(session)

      if (hour < 12) morning += session.durationSec
      else if (hour < 17) afternoon += session.durationSec
      else if (hour < 21) evening += session.durationSec
      else night += session.durationSec

      if (session.startTime && session.endTime) {
        timeline.push({
          id: `${session.id}-${session.startTime}`,
          label: `${session.startTime}-${session.endTime} ${session.subject === 'GS' ? 'GA' : session.subject} (${formatBlockHours(session.durationSec)})`,
        })
      }
    }

    return {
      totalSec: daySessions.reduce((sum, session) => sum + session.durationSec, 0),
      subjects: [...subjects.entries()].map(([name, sec]) => ({ name, sec })).sort((a, b) => b.sec - a.sec),
      blocks: [
        { label: 'Morning', value: morning },
        { label: 'Afternoon', value: afternoon },
        { label: 'Evening', value: evening },
        { label: 'Night', value: night },
      ],
      timeline,
    }
  }, [daySessions])

  const latestMock = useMemo(() => getLatestMock(filteredMocks), [filteredMocks])
  const mockTrend = useMemo(
    () => buildMockScoreTrend(filteredMocks, (mock, index) => `${mock.dayKey.slice(5)} ${index + 1}`, 8),
    [filteredMocks],
  )
  const combinedTrend = useMemo(
    () =>
      mockTrend.map((row) => ({
        attempts: row.attempted,
        accuracy: row.accuracy,
        percentage: row.scorePct,
        percentile: row.percentile ?? 0,
        label: row.label,
      })),
    [mockTrend],
  )
  const latestImprovement = mockTrend.at(-1)?.improvement ?? 0
  const averageAccuracy = useMemo(() => getAverageAccuracy(filteredMocks), [filteredMocks])
  const sectionRows = useMemo(() => buildSectionRows(filter, filteredFullMocks, sectionalMocks), [filter, filteredFullMocks, sectionalMocks])
  const strongestSection = [...sectionRows].sort((a, b) => b.score - a.score)[0]
  const weakestSection = [...sectionRows].sort((a, b) => a.score - b.score)[0]

  return (
    <main className="analytics-v2">
      <header className="page-head">
        <p className="eyebrow">Analytics Dashboard</p>
        <div className="page-head-row">
          <h1>Study First</h1>
        </div>
      </header>

      <section className="analytics-top-grid">
        <article className="card metric-card">
          <span>Monthly Total</span>
          <strong>{monthlyTotal}h</strong>
        </article>
        <article className="card metric-card">
          <span>Streak Tracking</span>
          <strong>{activeDays} days</strong>
        </article>
        <article className="card metric-card">
          <span>Today</span>
          <strong>{dailyStudy.at(-1)?.hours ?? 0}h</strong>
        </article>
        <article className="card metric-card">
          <span>Best Subject</span>
          <strong>{studySubjects[0]?.name ?? '-'}</strong>
        </article>
      </section>

      <section className="analytics-chart-grid">
        <article className="card analytics-chart-card">
          <div className="home-block-head">
            <h2>Daily Hours</h2>
          </div>
          {dailyStudy.every((d) => d.hours === 0) ? (
            <div className="chart-panel compact-shell">
              <p className="muted">No study data yet. Start your first session!</p>
            </div>
          ) : (
            <div className="chart-panel compact-shell">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyStudy}>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
                  <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="hours" fill="#22c55e" radius={[12, 12, 0, 0]} name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="card analytics-chart-card">
          <div className="home-block-head">
            <h2>Weekly Hours</h2>
          </div>
          {weeklyStudy.every((d) => d.hours === 0) ? (
            <div className="chart-panel compact-shell">
              <p className="muted">No study data yet. Start your first session!</p>
            </div>
          ) : (
            <div className="chart-panel compact-shell">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weeklyStudy}>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
                  <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="hours" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.22)" strokeWidth={3} name="Hours" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="analytics-chart-grid">
        <article className="card analytics-chart-card wide">
          <div className="home-block-head">
            <h2>Time-of-Day Heatmap</h2>
          </div>
          {timeHeatmap.every((row) => row.days.every((day) => day.hours === 0)) ? (
            <p className="muted">No study data yet. Start your first session!</p>
          ) : (
            <div className="time-heatmap">
              {timeHeatmap.map((row) => (
                <div key={row.slot} className="time-heatmap-row">
                  <span className="time-heatmap-label">{row.slot}</span>
                  <div className="time-heatmap-cells">
                    {row.days.map((day) => (
                      <div
                        key={`${row.slot}-${day.dayKey}`}
                        className={`time-heatmap-cell intensity-${day.hours >= 3 ? 4 : day.hours >= 2 ? 3 : day.hours >= 1 ? 2 : day.hours > 0 ? 1 : 0}`}
                        title={`${row.slot} ${day.dayKey}: ${day.hours}h`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="analytics-detail-grid">
        <article className="card analytics-table-card">
          <div className="home-block-head">
            <h2>Subject-wise Study</h2>
          </div>
          {studySubjects.length === 0 || studySubjects.every((s) => s.hours === 0) ? (
            <p className="muted">No study data yet. Start your first session!</p>
          ) : (
            <div className="analytics-table">
              <div className="analytics-table-head">
                <span>Subject</span>
                <span>Hours</span>
                <span>Strength</span>
              </div>
              {studySubjects.map((row) => (
                <div key={row.name} className="analytics-table-row compact">
                  <span>{row.name}</span>
                  <strong>{row.hours}h</strong>
                  <strong>{row.strength}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card analytics-weak-card">
          <div className="home-block-head">
            <h2>Mock Filter</h2>
          </div>
          <div className="analytics-filters" role="tablist" aria-label="Mock type filters">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === filter ? 'analytics-filter active' : 'analytics-filter'}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="analytics-chart-grid">
        <article className="card analytics-chart-card wide">
          <div className="home-block-head">
            <h2>Mock Performance</h2>
            <span>{latestMock ? `${latestMock.overall.score}/${latestMock.overall.total}` : 'No mock'}</span>
          </div>
          {combinedTrend.length === 0 ? (
            <div className="chart-panel">
              <p className="muted">No mock data yet. Attempt your first mock!</p>
            </div>
          ) : (
            <>
              <div className="mock-score-summary header">
                <strong>{latestMock ? `${latestMock.overall.score} / ${latestMock.overall.total}` : '0 / 0'}</strong>
                <span>{latestImprovement >= 0 ? `UP +${latestImprovement}` : `DOWN ${latestImprovement}`}</span>
                <span>Accuracy: {latestMock?.overall.accuracy ?? averageAccuracy}%</span>
                <span>Percentile: {latestMock?.overall.percentile ?? 0}%</span>
              </div>
              <div className="chart-panel">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={combinedTrend}>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="attempts" stroke="#7f8ea3" axisLine={false} tickLine={false} name="Attempts" />
                    <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="accuracy" stroke="#a78bfa" strokeWidth={3} dot={false} name="Accuracy" />
                    <Line type="monotone" dataKey="percentage" stroke="#38bdf8" strokeWidth={3} dot={false} name="Percentage" />
                    <Line type="monotone" dataKey="percentile" stroke="#2dd4bf" strokeWidth={3} dot={false} name="Percentile" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </article>

        <article className="card analytics-chart-card">
          <div className="home-block-head">
            <h2>Strong vs Weak</h2>
          </div>
          <div className="analytics-weak-grid">
            <div>
              <span>Strong</span>
              <strong>{strongestSection ? `${strongestSection.name} ${strongestSection.score.toFixed(1)}%` : '-'}</strong>
            </div>
            <div>
              <span>Weak</span>
              <strong>{weakestSection ? `${weakestSection.name} ${weakestSection.score.toFixed(1)}%` : '-'}</strong>
            </div>
            <div>
              <span>Accuracy</span>
              <strong>{averageAccuracy}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="card analytics-table-card wide">
        <div className="home-block-head">
          <h2>Daily Report</h2>
          <input type="date" className="date-input" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} />
        </div>
        {dailyReport.totalSec === 0 ? (
          <p className="muted">No study data for this day yet.</p>
        ) : (
          <div className="daily-report-grid">
            <div className="daily-report-summary">
              <strong>{formatBlockHours(dailyReport.totalSec)}</strong>
              <span>Total hours</span>
            </div>
            <div className="analytics-table">
              {dailyReport.subjects.map((row) => (
                <div key={row.name} className="analytics-table-row compact">
                  <span>{row.name === 'GS' ? 'GA' : row.name}</span>
                  <strong>{formatBlockHours(row.sec)}</strong>
                  <strong />
                </div>
              ))}
            </div>
            <div className="daily-report-blocks">
              {dailyReport.blocks.map((block) => (
                <div key={block.label} className="daily-block-card">
                  <span>{block.label}</span>
                  <strong>{formatBlockHours(block.value)}</strong>
                </div>
              ))}
            </div>
            <div className="daily-timeline">
              {dailyReport.timeline.length ? (
                dailyReport.timeline.map((item) => (
                  <div key={item.id} className="daily-timeline-item">
                    <strong>{item.label}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No timed study sessions on this day.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
