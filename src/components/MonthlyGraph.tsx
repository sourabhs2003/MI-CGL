import { useMemo } from 'react'
import type { StudySessionDoc } from '../types'
import { getDisplayKeys } from '../lib/sessionGraphData'

type Props = {
  sessions: StudySessionDoc[]
}

function buildMonthlyStudy(sessions: StudySessionDoc[]) {
  const { keys, isFallback } = getDisplayKeys(sessions, 30)
  const lookup = new Map(keys.map((key) => [key, 0]))
  for (const session of sessions) {
    if (lookup.has(session.dayKey)) lookup.set(session.dayKey, (lookup.get(session.dayKey) ?? 0) + session.durationSec)
  }
  return {
    data: keys.map((dayKey) => ({
      label: dayKey.slice(8),
      hours: Number(((lookup.get(dayKey) ?? 0) / 3600).toFixed(1)),
    })),
    isFallback,
  }
}

function MiniLineChart({ data, yMax }: { data: Array<{ label: string; hours: number }>; yMax: number }) {
  const width = 320
  const height = 200
  const pad = { top: 12, right: 12, bottom: 30, left: 32 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const ticks = [0, Math.round(yMax / 2), yMax]
  const points = data.map((day, index) => {
    const x = pad.left + (index / Math.max(data.length - 1, 1)) * chartWidth
    const y = pad.top + chartHeight - (day.hours / yMax) * chartHeight
    return { ...day, x, y }
  })
  const path = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <svg className="mini-study-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly study hours">
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
      <polyline points={path} fill="none" stroke="#FFB020" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          {point.hours > 0 && <circle cx={point.x} cy={point.y} r="3.5" fill="#FFB020" />}
          {index % 3 === 0 && (
            <text x={point.x} y={height - 10} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="700">
              {point.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function MonthlyGraph({ sessions }: Props) {
  const { data: monthlyStudy, isFallback } = useMemo(() => buildMonthlyStudy(sessions), [sessions])
  const totalHours = monthlyStudy.reduce((sum, d) => sum + d.hours, 0)
  const avgDaily = (totalHours / 30).toFixed(1)
  const daysStudied = monthlyStudy.filter((d) => d.hours > 0).length
  const consistency = Math.round((daysStudied / 30) * 100)
  const yAxisMax = Math.ceil(Math.max(...monthlyStudy.map((day) => day.hours), 1) * 1.15)

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
        <span>{isFallback ? 'Showing your latest 30-day study window' : `Consistency: ${consistency}% - Avg: ${avgDaily}h/day`}</span>
      </div>
      <div className="chart-container">
        <MiniLineChart data={monthlyStudy} yMax={yAxisMax} />
      </div>
    </div>
  )
}
