import { Clock, Target, Flame, TrendingUp } from 'lucide-react'
import type { MockDoc, StudySessionDoc } from '../types'
import { todayKey } from '../lib/dates'
import { normalizeScore, sortMocksChronologically } from '../lib/mockAnalytics'

type Props = {
  sessions: StudySessionDoc[]
  mocks?: MockDoc[]
}

export function MetricsStrip({ sessions, mocks = [] }: Props) {
  const today = todayKey()
  const todaySessions = sessions.filter((s) => s.dayKey === today)
  const todaySec = todaySessions.reduce((sum, s) => sum + s.durationSec, 0)
  const todayHours = (todaySec / 3600).toFixed(1)
  const latestMock = sortMocksChronologically(mocks).at(-1)
  const score = latestMock ? `${Math.round(latestMock.overall.score)}/${Math.round(latestMock.overall.total)}` : '--'
  const accuracy = latestMock ? `${Math.round(latestMock.overall.accuracy)}%` : '--'
  const percentile = latestMock?.overall.percentile != null ? `${Math.round(latestMock.overall.percentile)}%` : '--'

  const targetHours = 6
  const targetProgress = Math.round((todaySec / (targetHours * 3600)) * 100)

  // Calculate consistency score (days studied in last 30 days)
  const daysStudied = new Set(sessions.map((s) => s.dayKey)).size
  const consistencyScore = Math.round((daysStudied / 30) * 100)

  // Calculate focus score (average session duration)
  const avgSessionDuration = sessions.length > 0 ? todaySec / todaySessions.length : 0
  const focusScore = Math.min(100, Math.round((avgSessionDuration / 3600) * 100))

  const metrics = [
    {
      label: 'Score',
      value: score,
      color: latestMock && normalizeScore(latestMock.overall.score, latestMock.overall.total) >= 65 ? '#00E6A8' : '#FFB020',
    },
    {
      label: 'Accuracy',
      value: accuracy,
      color: latestMock && latestMock.overall.accuracy >= 70 ? '#00E6A8' : '#FFB020',
    },
    {
      label: 'Percentile',
      value: percentile,
      color: '#4DA3FF',
    },
    {
      label: 'Time',
      value: `${todayHours}h`,
      icon: Clock,
      color: '#00E6A8',
    },
    {
      label: 'Target',
      value: `${targetProgress}%`,
      icon: Target,
      color: targetProgress >= 100 ? '#00E6A8' : '#FFB020',
    },
    {
      label: 'Consistency',
      value: `${consistencyScore}%`,
      icon: Flame,
      color: consistencyScore >= 70 ? '#00E6A8' : consistencyScore >= 50 ? '#4DA3FF' : '#FF4D4F',
    },
    {
      label: 'Focus',
      value: `${focusScore}%`,
      icon: TrendingUp,
      color: focusScore >= 70 ? '#00E6A8' : focusScore >= 50 ? '#4DA3FF' : '#FF4D4F',
    },
  ]

  return (
    <section className="metrics-strip">
      <div className="metrics-scroll">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div key={index} className="metric-pill">
              {Icon ? (
                <div className="metric-icon" style={{ color: metric.color }}>
                  <Icon size={14} />
                </div>
              ) : null}
              <div className="metric-content">
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value" style={{ color: metric.color }}>
                  {metric.value}
                </strong>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
