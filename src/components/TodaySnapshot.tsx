import { Clock, Target, Flame, TrendingUp } from 'lucide-react'
import type { StudySessionDoc } from '../types'
import { todayKey } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function TodaySnapshot({ sessions }: Props) {
  const today = todayKey()
  const todaySessions = sessions.filter((s) => s.dayKey === today)
  const todaySec = todaySessions.reduce((sum, s) => sum + s.durationSec, 0)
  const todayHours = (todaySec / 3600).toFixed(1)

  const targetHours = 6
  const targetProgress = Math.round((todaySec / (targetHours * 3600)) * 100)

  // Calculate consistency score (days studied in last 30 days)
  const daysStudied = new Set(sessions.map((s) => s.dayKey)).size
  const consistencyScore = Math.round((daysStudied / 30) * 100)

  // Calculate focus score (average session duration)
  const avgSessionDuration = sessions.length > 0 ? todaySec / todaySessions.length : 0
  const focusScore = Math.min(100, Math.round((avgSessionDuration / 3600) * 100))

  return (
    <section className="today-snapshot-grid">
      <div className="snapshot-card">
        <div className="snapshot-icon">
          <Clock size={20} />
        </div>
        <div className="snapshot-content">
          <span className="snapshot-label">Today Study Time</span>
          <strong className="snapshot-value">{todayHours}h</strong>
          <span className="snapshot-sub">Target: {targetHours}h ({targetProgress}%)</span>
        </div>
      </div>

      <div className="snapshot-card">
        <div className="snapshot-icon">
          <Target size={20} />
        </div>
        <div className="snapshot-content">
          <span className="snapshot-label">Daily Target Progress</span>
          <strong className="snapshot-value">{targetProgress}%</strong>
          <span className="snapshot-sub">{targetProgress >= 100 ? '✅ Achieved' : 'Keep going'}</span>
        </div>
      </div>

      <div className="snapshot-card">
        <div className="snapshot-icon">
          <Flame size={20} />
        </div>
        <div className="snapshot-content">
          <span className="snapshot-label">Consistency Score</span>
          <strong className="snapshot-value">{consistencyScore}%</strong>
          <span className="snapshot-sub">
            {consistencyScore >= 70 ? 'Excellent' : consistencyScore >= 50 ? 'Good' : 'Improve'}
          </span>
        </div>
      </div>

      <div className="snapshot-card">
        <div className="snapshot-icon">
          <TrendingUp size={20} />
        </div>
        <div className="snapshot-content">
          <span className="snapshot-label">Focus Score</span>
          <strong className="snapshot-value">{focusScore}%</strong>
          <span className="snapshot-sub">
            {focusScore >= 70 ? 'High focus' : focusScore >= 50 ? 'Moderate' : 'Low focus'}
          </span>
        </div>
      </div>
    </section>
  )
}
