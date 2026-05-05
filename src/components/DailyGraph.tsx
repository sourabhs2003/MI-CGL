import { useMemo } from 'react'
import type { StudySessionDoc } from '../types'
import { getDisplayKeys } from '../lib/sessionGraphData'

type Props = {
  sessions: StudySessionDoc[]
}

function buildDailyStudy(sessions: StudySessionDoc[]) {
  const { keys, isFallback } = getDisplayKeys(sessions, 10)
  const lookup = new Map(keys.map((key) => [key, 0]))
  for (const session of sessions) {
    if (lookup.has(session.dayKey)) lookup.set(session.dayKey, (lookup.get(session.dayKey) ?? 0) + session.durationSec)
  }
  return {
    data: keys.map((dayKey) => ({
      label: dayKey.slice(5),
      hours: Number(((lookup.get(dayKey) ?? 0) / 3600).toFixed(1)),
    })),
    isFallback,
  }
}

function MiniBarChart({ data, yMax }: { data: Array<{ label: string; hours: number }>; yMax: number }) {
  const width = 320
  const height = 200
  const pad = { top: 12, right: 12, bottom: 30, left: 32 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const barGap = 6
  const barWidth = Math.max(8, (chartWidth - barGap * (data.length - 1)) / data.length)
  const ticks = [0, Math.round(yMax / 2), yMax]

  return (
    <svg className="mini-study-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily study hours">
      <defs>
        <linearGradient id="dailyMiniGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E6A8" />
          <stop offset="100%" stopColor="#00C2FF" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => {
        const y = pad.top + chartHeight - (tick / yMax) * chartHeight
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="3 6" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#CBD5E1" fontSize="10" fontWeight="700">
              {tick}h
            </text>
          </g>
        )
      })}
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={pad.top + chartHeight - (Math.min(6, yMax) / yMax) * chartHeight}
        y2={pad.top + chartHeight - (Math.min(6, yMax) / yMax) * chartHeight}
        stroke="#00E6A8"
        strokeDasharray="4 4"
        strokeOpacity="0.75"
      />
      {data.map((day, index) => {
        const x = pad.left + index * (barWidth + barGap)
        const barHeight = Math.max(day.hours > 0 ? 3 : 0, (day.hours / yMax) * chartHeight)
        const y = pad.top + chartHeight - barHeight
        return (
          <g key={day.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill="url(#dailyMiniGradient)" />
            {day.hours > 0 && (
              <text x={x + barWidth / 2} y={Math.max(10, y - 4)} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="800">
                {day.hours}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="700">
              {day.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function DailyGraph({ sessions }: Props) {
  const { data: dailyStudy, isFallback } = useMemo(() => buildDailyStudy(sessions), [sessions])
  const latestDailyHours = dailyStudy.at(-1)?.hours ?? 0
  const dailyTargetPercentage = Math.round((latestDailyHours / 6) * 100)
  const yAxisMax = Math.ceil(Math.max(...dailyStudy.map((day) => day.hours), 6) * 1.15)

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
        <span>{isFallback ? 'Showing your latest study streak' : `You hit ${dailyTargetPercentage}% of your daily target today`}</span>
      </div>
      <div className="chart-container">
        <MiniBarChart data={dailyStudy} yMax={yAxisMax} />
      </div>
    </div>
  )
}
