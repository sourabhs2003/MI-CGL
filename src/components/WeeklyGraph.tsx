import { useMemo } from 'react'
import type { StudySessionDoc } from '../types'
import { getLatestStudyDate, hasAnyStudy, hasStudyInKeys, weekBucketsEndingAt } from '../lib/sessionGraphData'

type Props = {
  sessions: StudySessionDoc[]
}

function buildWeeklyStudy(sessions: StudySessionDoc[]) {
  const currentBuckets = weekBucketsEndingAt(new Date(), 8)
  const currentKeys = new Set(currentBuckets.flatMap((bucket) => bucket.keys))
  const isFallback = !hasStudyInKeys(sessions, currentKeys) && hasAnyStudy(sessions)
  const latestStudyDate = isFallback ? getLatestStudyDate(sessions) : null
  const buckets = latestStudyDate ? weekBucketsEndingAt(latestStudyDate, 8) : currentBuckets
  const weeks = buckets.map(({ label, keys }) => {
    const keySet = new Set(keys)
    const totalSec = sessions.reduce((sum, session) => (keySet.has(session.dayKey) ? sum + session.durationSec : sum), 0)
    return {
      label,
      hours: Number((totalSec / 3600).toFixed(1)),
    }
  })
  return { data: weeks, isFallback }
}

function MiniBarChart({ data, yMax }: { data: Array<{ label: string; hours: number }>; yMax: number }) {
  const width = 320
  const height = 200
  const pad = { top: 12, right: 12, bottom: 30, left: 32 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const barGap = 10
  const barWidth = Math.max(12, (chartWidth - barGap * (data.length - 1)) / data.length)
  const ticks = [0, Math.round(yMax / 2), yMax]

  return (
    <svg className="mini-study-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly study hours">
      <defs>
        <linearGradient id="weeklyMiniGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4DA3FF" />
          <stop offset="100%" stopColor="#38bdf8" />
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
      {data.map((week, index) => {
        const x = pad.left + index * (barWidth + barGap)
        const barHeight = Math.max(week.hours > 0 ? 3 : 0, (week.hours / yMax) * chartHeight)
        const y = pad.top + chartHeight - barHeight
        return (
          <g key={`${week.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill="url(#weeklyMiniGradient)" />
            {week.hours > 0 && (
              <text x={x + barWidth / 2} y={Math.max(10, y - 4)} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="800">
                {week.hours}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="700">
              {week.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function WeeklyGraph({ sessions }: Props) {
  const { data: weeklyStudy, isFallback } = useMemo(() => buildWeeklyStudy(sessions), [sessions])
  const currentWeek = weeklyStudy.at(-1)?.hours ?? 0
  const lastWeek = weeklyStudy.at(-2)?.hours ?? 0
  const improvement = lastWeek > 0 ? Math.round(((currentWeek - lastWeek) / lastWeek) * 100) : 0
  const yAxisMax = Math.ceil(Math.max(...weeklyStudy.map((week) => week.hours), 1) * 1.15)

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
          {isFallback ? 'Showing your latest weeks with study data' : `${improvement >= 0 ? '+' : ''}${improvement}% improvement from last week`}
        </span>
      </div>
      <div className="chart-container">
        <MiniBarChart data={weeklyStudy} yMax={yAxisMax} />
      </div>
    </div>
  )
}
