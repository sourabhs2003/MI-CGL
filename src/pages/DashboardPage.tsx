import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useMocks, useSessions } from '../hooks/useFirestoreData'
import { useUserProfile } from '../hooks/useUserProfile'
import { lastNDaysKeys, todayKey } from '../lib/dates'
import { toMillis } from '../lib/firestoreTime'
import { generateAnalyticsInsight } from '../services/analyticsCoach'

type AnalyticsTab = 'daily' | 'weekly' | 'monthly' | 'mocks' | 'sectional'

const tabs: { key: AnalyticsTab; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'mocks', label: 'Mocks' },
  { key: 'sectional', label: 'Sectional' },
]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }} />
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { profile } = useUserProfile(uid)
  const sessions = useSessions(uid, 700)
  const mocks = useMocks(uid)
  const [tab, setTab] = useState<AnalyticsTab>('daily')
  const [insight, setInsight] = useState('Loading...')

  const dailyData = useMemo(() => {
    const keys = lastNDaysKeys(10)
    const map = new Map(keys.map((key) => [key, 0]))
    for (const session of sessions) {
      if (map.has(session.dayKey)) {
        map.set(session.dayKey, (map.get(session.dayKey) ?? 0) + session.durationSec)
      }
    }
    return keys.map((key) => ({
      label: key.slice(5),
      hours: Number(((map.get(key) ?? 0) / 3600).toFixed(2)),
    }))
  }, [sessions])

  const weeklyData = useMemo(() => {
    const keys = lastNDaysKeys(7)
    const map = new Map(keys.map((key) => [key, 0]))
    for (const session of sessions) {
      if (map.has(session.dayKey)) {
        map.set(session.dayKey, (map.get(session.dayKey) ?? 0) + session.durationSec)
      }
    }
    return keys.map((key) => ({
      label: key.slice(5),
      hours: Number(((map.get(key) ?? 0) / 3600).toFixed(2)),
    }))
  }, [sessions])

  const monthlyData = useMemo(() => {
    const keys = lastNDaysKeys(30)
    const map = new Map(keys.map((key) => [key, 0]))
    for (const session of sessions) {
      if (map.has(session.dayKey)) {
        map.set(session.dayKey, (map.get(session.dayKey) ?? 0) + session.durationSec)
      }
    }
    return keys
      .filter((_, index) => index % 3 === 0)
      .map((key) => ({
        label: key.slice(5),
        hours: Number(((map.get(key) ?? 0) / 3600).toFixed(2)),
      }))
  }, [sessions])

  const mockData = useMemo(() => {
    return [...mocks]
      .filter((mock) => mock.kind !== 'sectional')
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
      .map((mock, index) => ({
        label: `${index + 1}`,
        score: mock.maxScore > 0 ? Math.round((mock.score / mock.maxScore) * 100) : 0,
      }))
  }, [mocks])

  const sectionalData = useMemo(() => {
    const grouped = {
      Maths: [] as number[],
      English: [] as number[],
      Reasoning: [] as number[],
      GS: [] as number[],
    }

    for (const mock of mocks) {
      if (mock.kind !== 'sectional') continue
      if (mock.subject in grouped) {
        grouped[mock.subject as keyof typeof grouped].push(mock.accuracyPct)
      }
    }

    return Object.entries(grouped).map(([subject, scores]) => ({
      label: subject,
      score: scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0,
    }))
  }, [mocks])

  const totals = useMemo(() => {
    const totalStudyHours = sessions.reduce((sum, session) => sum + session.durationSec, 0) / 3600
    const uniqueDays = new Set(sessions.map((session) => session.dayKey)).size || 1
    const avgDailyHours = totalStudyHours / uniqueDays
    const bestDay = dailyData.reduce((best, day) => (day.hours > best.hours ? day : best), {
      label: todayKey().slice(5),
      hours: 0,
    })
    const fullMocks = mocks.filter((mock) => mock.kind !== 'sectional')
    const avgMockScore = fullMocks.length
      ? Math.round(
          fullMocks.reduce((sum, mock) => sum + (mock.maxScore > 0 ? (mock.score / mock.maxScore) * 100 : 0), 0) /
            fullMocks.length,
        )
      : 0

    return [
      { label: 'Hours', value: totalStudyHours.toFixed(1) },
      { label: 'Avg', value: avgDailyHours.toFixed(1) },
      { label: 'Best', value: `${bestDay.label}` },
      { label: 'Streak', value: `${profile?.streak ?? 0}d` },
      { label: 'Mocks', value: `${mocks.length}` },
      { label: 'Avg Mock', value: `${avgMockScore}%` },
    ]
  }, [dailyData, mocks, profile?.streak, sessions])

  useEffect(() => {
    let active = true
    void generateAnalyticsInsight({
      sessions,
      mocks,
      streak: profile?.streak ?? 0,
    }).then((nextInsight) => {
      if (active) setInsight(nextInsight)
    })
    return () => {
      active = false
    }
  }, [mocks, profile?.streak, sessions])

  const chartConfig = useMemo(() => {
    switch (tab) {
      case 'daily':
        return {
          title: 'Daily',
          data: dailyData,
          render: (
            <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="hours" radius={[10, 10, 0, 0]} animationDuration={450} animationEasing="ease-in-out">
                {dailyData.map((entry, index) => (
                  <Cell key={`${entry.label}-${index}`} fill={index === dailyData.length - 1 ? '#22c55e' : '#38bdf8'} />
                ))}
              </Bar>
            </BarChart>
          ),
        }
      case 'weekly':
        return {
          title: 'Weekly',
          data: weeklyData,
          render: (
            <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="hours" radius={[10, 10, 0, 0]} fill="#facc15" animationDuration={450} animationEasing="ease-in-out" />
            </BarChart>
          ),
        }
      case 'monthly':
        return {
          title: 'Monthly',
          data: monthlyData,
          render: (
            <LineChart data={monthlyData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#22c55e"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#22c55e', stroke: '#04110a', strokeWidth: 2 }}
                animationDuration={500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          ),
        }
      case 'mocks':
        return {
          title: 'Mocks',
          data: mockData,
          render: (
            <LineChart data={mockData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7f8ea3" fontSize={12} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#ef4444', stroke: '#180607', strokeWidth: 2 }}
                animationDuration={500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          ),
        }
      case 'sectional':
      default:
        return {
          title: 'Sectional',
          data: sectionalData,
          render: (
            <BarChart data={sectionalData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#7f8ea3" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#7f8ea3" fontSize={12} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="score" radius={[10, 10, 0, 0]} animationDuration={450} animationEasing="ease-in-out">
                {sectionalData.map((entry, index) => (
                  <Cell
                    key={`${entry.label}-${index}`}
                    fill={['#22c55e', '#38bdf8', '#facc15', '#ef4444'][index % 4]}
                  />
                ))}
              </Bar>
            </BarChart>
          ),
        }
    }
  }, [dailyData, mockData, monthlyData, sectionalData, tab, weeklyData])

  return (
    <main className="analytics-shell">
      <div className="analytics-tabs" role="tablist" aria-label="Analytics">
        {tabs.map((item) => (
          <motion.button
            key={item.key}
            type="button"
            className={item.key === tab ? 'analytics-tab active' : 'analytics-tab'}
            whileTap={{ scale: 0.97 }}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </motion.button>
        ))}
      </div>

      <section className="card analytics-summary">
        <div className="summary-grid">
          {totals.map((item) => (
            <div key={item.label} className="summary-card">
              <span className="summary-label">{item.label}</span>
              <strong className="summary-value">{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card analytics-chart-card">
        <div className="card-head">
          <h2>{chartConfig.title}</h2>
        </div>
        <div className="chart-scroll">
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={280}>
              {chartConfig.render}
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card analytics-insight-card">
        <div className="card-head">
          <h2>AI</h2>
        </div>
        <p className="analytics-insight-text">{insight}</p>
      </section>
    </main>
  )
}
