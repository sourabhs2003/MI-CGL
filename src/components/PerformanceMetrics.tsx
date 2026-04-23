import { useMemo } from 'react'
import { Flame, Target, TrendingUp } from 'lucide-react'
import type { StudySessionDoc } from '../types'

type Props = {
  sessions: StudySessionDoc[]
}

export function PerformanceMetrics({ sessions }: Props) {
  const metrics = useMemo(() => {
    // Calculate consistency score
    const daysStudied = new Set(sessions.map((s) => s.dayKey)).size
    const consistencyScore = Math.round((daysStudied / 30) * 100)

    // Calculate focus score (based on average session duration)
    const totalDuration = sessions.reduce((sum, s) => sum + s.durationSec, 0)
    const avgSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0
    const focusScore = Math.min(100, Math.round((avgSessionDuration / 3600) * 100))

    // Calculate streak
    const sortedDays = [...new Set(sessions.map((s) => s.dayKey))].sort().reverse()
    let streak = 0
    let currentDate = new Date()
    let checkDate = new Date(currentDate)

    for (const dayKey of sortedDays) {
      const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (dayKey === checkKey) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (streak === 0) {
        // Skip today if not studied yet
        checkDate.setDate(checkDate.getDate() - 1)
        const prevKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
        if (dayKey === prevKey) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      } else {
        break
      }
    }

    return {
      consistencyScore,
      focusScore,
      streak,
    }
  }, [sessions])

  return (
    <section className="card performance-metrics-card">
      <div className="card-head">
        <h2>Performance Metrics</h2>
      </div>
      <div className="performance-metrics-grid">
        <div className="performance-metric">
          <div className="metric-icon">
            <Target size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Consistency</span>
            <strong className="metric-value">{metrics.consistencyScore}%</strong>
            <span className="metric-status">
              {metrics.consistencyScore >= 70 ? 'Excellent' : metrics.consistencyScore >= 50 ? 'Good' : 'Needs improvement'}
            </span>
          </div>
        </div>

        <div className="performance-metric">
          <div className="metric-icon">
            <TrendingUp size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Focus Score</span>
            <strong className="metric-value">{metrics.focusScore}%</strong>
            <span className="metric-status">
              {metrics.focusScore >= 70 ? 'High focus' : metrics.focusScore >= 50 ? 'Moderate' : 'Low focus'}
            </span>
          </div>
        </div>

        <div className="performance-metric streak-metric">
          <div className="metric-icon streak-icon">
            <Flame size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Streak</span>
            <strong className="metric-value">{metrics.streak} days</strong>
            <span className="metric-status">
              {metrics.streak > 0 ? "Don't break it today!" : 'Start your streak'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
