import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
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

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const hours = payload[0]?.value as number
  const dailyTarget = 6
  const percentage = ((hours / dailyTarget) * 100).toFixed(0)
  return (
    <div className="chart-tooltip daily-tooltip">
      <strong>{label}</strong>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ backgroundColor: '#00E6A8' }} />
        <span>Hours</span>
        <strong>{hours}h</strong>
      </div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ backgroundColor: '#4DA3FF' }} />
        <span>Target</span>
        <strong>{percentage}%</strong>
      </div>
    </div>
  )
}

export function DailyGraph({ sessions }: Props) {
  const dailyStudy = useMemo(() => buildDailyStudy(sessions), [sessions])
  const latestDailyHours = dailyStudy.at(-1)?.hours ?? 0
  const dailyTargetPercentage = Math.round((latestDailyHours / 6) * 100)

  if (dailyStudy.every((d) => d.hours === 0)) {
    return (
      <div className="graph-card empty-state">
        <p className="muted">No study data yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="graph-card">
      <div className="mini-insight">
        <span>You hit {dailyTargetPercentage}% of your daily target today</span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyStudy} barSize={20}>
            <defs>
              <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E6A8"/>
                <stop offset="100%" stopColor="#00C2FF"/>
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
              domain={[0, Math.ceil(Math.max(...dailyStudy.map(d => d.hours), 6) / 1.5)]}
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
            />
            <Tooltip content={<DailyTooltip />} />
            <Bar
              dataKey="hours"
              radius={[4, 4, 0, 0]}
              fill="url(#dailyGradient)"
              minPointSize={3}
            >
              <LabelList
                dataKey="hours"
                position="top"
                fill="#FFFFFF"
                fontSize={9}
              />
            </Bar>
            <ReferenceLine
              y={6}
              stroke="#00E6A8"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
