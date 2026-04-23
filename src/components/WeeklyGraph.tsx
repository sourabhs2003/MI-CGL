import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

function buildWeeklyStudy(sessions: StudySessionDoc[]) {
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const keys = lastNDaysKeys(56).slice(index * 7, index * 7 + 7)
    const keySet = new Set(keys)
    const totalSec = sessions.reduce((sum, session) => (keySet.has(session.dayKey) ? sum + session.durationSec : sum), 0)
    return {
      label: keys[0]?.slice(5) ?? '',
      hours: Number((totalSec / 3600).toFixed(1)),
    }
  })
  return weeks
}

function WeeklyTooltip({
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
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ backgroundColor: '#4DA3FF' }} />
        <span>Hours</span>
        <strong>{payload[0]?.value}h</strong>
      </div>
    </div>
  )
}

export function WeeklyGraph({ sessions }: Props) {
  const weeklyStudy = useMemo(() => buildWeeklyStudy(sessions), [sessions])
  const currentWeek = weeklyStudy.at(-1)?.hours ?? 0
  const lastWeek = weeklyStudy.at(-2)?.hours ?? 0
  const improvement = lastWeek > 0 ? Math.round(((currentWeek - lastWeek) / lastWeek) * 100) : 0

  if (weeklyStudy.every((d) => d.hours === 0)) {
    return (
      <div className="graph-card empty-state">
        <p className="muted">No study data yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="graph-card">
      <div className="mini-insight">
        <span className={improvement >= 0 ? 'positive' : 'negative'}>
          {improvement >= 0 ? '+' : ''}{improvement}% improvement from last week
        </span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyStudy} barSize={18}>
            <defs>
              <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4DA3FF"/>
                <stop offset="100%" stopColor="#38bdf8"/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              padding={{ left: 15, right: 15 }}
            />
            <YAxis
              domain={[0, Math.ceil(Math.max(...weeklyStudy.map(d => d.hours), 1) / 1.5)]}
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
            />
            <Tooltip content={<WeeklyTooltip />} />
            <Bar
              dataKey="hours"
              radius={[4, 4, 0, 0]}
              fill="url(#weeklyGradient)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
