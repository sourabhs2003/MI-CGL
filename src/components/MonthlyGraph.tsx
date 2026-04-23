import { useMemo } from 'react'
import {
  Line,
  LineChart,
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

function buildMonthlyStudy(sessions: StudySessionDoc[]) {
  const keys = lastNDaysKeys(30)
  const lookup = new Map(keys.map((key) => [key, 0]))
  for (const session of sessions) {
    if (lookup.has(session.dayKey)) lookup.set(session.dayKey, (lookup.get(session.dayKey) ?? 0) + session.durationSec)
  }
  return keys.map((dayKey) => ({
    label: dayKey.slice(8),
    hours: Number(((lookup.get(dayKey) ?? 0) / 3600).toFixed(1)),
  }))
}

function MonthlyTooltip({
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
        <span className="chart-tooltip-dot" style={{ backgroundColor: '#FFB020' }} />
        <span>Hours</span>
        <strong>{payload[0]?.value}h</strong>
      </div>
    </div>
  )
}

export function MonthlyGraph({ sessions }: Props) {
  const monthlyStudy = useMemo(() => buildMonthlyStudy(sessions), [sessions])
  const totalHours = monthlyStudy.reduce((sum, d) => sum + d.hours, 0)
  const avgDaily = (totalHours / 30).toFixed(1)
  const daysStudied = monthlyStudy.filter((d) => d.hours > 0).length
  const consistency = Math.round((daysStudied / 30) * 100)

  if (monthlyStudy.every((d) => d.hours === 0)) {
    return (
      <div className="graph-card empty-state">
        <p className="muted">No study data yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="graph-card">
      <div className="mini-insight">
        <span>Consistency: {consistency}% • Avg: {avgDaily}h/day</span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyStudy}>
            <defs>
              <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFB020"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={2}
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              padding={{ left: 15, right: 15 }}
            />
            <YAxis
              domain={[0, Math.ceil(Math.max(...monthlyStudy.map(d => d.hours), 1) / 1.5)]}
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
            />
            <Tooltip content={<MonthlyTooltip />} />
            <Line
              type="monotone"
              dataKey="hours"
              stroke="url(#monthlyGradient)"
              strokeWidth={2}
              dot={false}
              name="Hours"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
