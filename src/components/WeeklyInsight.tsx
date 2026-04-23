import { useMemo } from 'react'
import { Zap, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function WeeklyInsight({ sessions }: Props) {
  const weeklyData = useMemo(() => {
    const thisWeekKeys = lastNDaysKeys(7)
    const lastWeekKeys = lastNDaysKeys(14).slice(0, 7)

    const thisWeekTotal = sessions
      .filter((s) => thisWeekKeys.includes(s.dayKey))
      .reduce((sum, s) => sum + s.durationSec, 0)
    const lastWeekTotal = sessions
      .filter((s) => lastWeekKeys.includes(s.dayKey))
      .reduce((sum, s) => sum + s.durationSec, 0)

    const thisWeekHours = (thisWeekTotal / 3600).toFixed(1)
    const lastWeekHours = (lastWeekTotal / 3600).toFixed(1)
    const changePercent = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Calculate best and worst day
    const dayTotals = new Map<string, number>()
    for (const key of thisWeekKeys) {
      dayTotals.set(key, 0)
    }
    for (const session of sessions) {
      if (thisWeekKeys.includes(session.dayKey)) {
        dayTotals.set(session.dayKey, (dayTotals.get(session.dayKey) ?? 0) + session.durationSec)
      }
    }

    const dayEntries = [...dayTotals.entries()]
      .map(([key, sec]) => ({ key, hours: sec / 3600 }))
      .sort((a, b) => b.hours - a.hours)

    const bestDay = dayEntries[0]
    const worstDay = dayEntries[dayEntries.length - 1]

    // Weekly goal (e.g., 30 hours)
    const weeklyGoal = 30
    const goalProgress = (thisWeekTotal / (weeklyGoal * 3600)) * 100

    return {
      thisWeekHours,
      lastWeekHours,
      changePercent,
      bestDay,
      worstDay,
      goalProgress,
    }
  }, [sessions])

  if (parseFloat(weeklyData.thisWeekHours) === 0) {
    return (
      <section className="card weekly-insight-card">
        <div className="weekly-insight-header">
          <Zap size={18} />
          <h3>Weekly Insight</h3>
        </div>
        <p className="muted">No study data this week yet.</p>
      </section>
    )
  }

  return (
    <section className="card weekly-insight-card">
      <div className="weekly-insight-header">
        <Zap size={18} />
        <h3>Weekly Insight</h3>
      </div>

      <div className="weekly-insight-content">
        <div className="weekly-summary">
          <div className="weekly-total">
            <span className="weekly-label">Total</span>
            <strong className="weekly-value">{weeklyData.thisWeekHours}h</strong>
          </div>
          <div className={`weekly-change ${weeklyData.changePercent >= 0 ? 'positive' : 'negative'}`}>
            {weeklyData.changePercent >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            <span>{Math.abs(weeklyData.changePercent).toFixed(0)}% vs last week</span>
          </div>
        </div>

        <div className="weekly-best-worst">
          <div className="weekly-day-stat">
            <span className="day-label">Best</span>
            <strong>{weeklyData.bestDay ? `${weeklyData.bestDay.key.slice(5)} (${weeklyData.bestDay.hours.toFixed(1)}h)` : '-'}</strong>
          </div>
          <div className="weekly-day-stat">
            <span className="day-label">Worst</span>
            <strong>{weeklyData.worstDay ? `${weeklyData.worstDay.key.slice(5)} (${weeklyData.worstDay.hours.toFixed(1)}h)` : '-'}</strong>
          </div>
        </div>

        <div className="weekly-goal-section">
          <div className="weekly-goal-header">
            <span className="goal-label">Weekly Goal</span>
            <span className="goal-value">{weeklyData.goalProgress.toFixed(0)}%</span>
          </div>
          <div className="weekly-goal-bar">
            <div
              className="weekly-goal-fill"
              style={{ width: `${Math.min(weeklyData.goalProgress, 100)}%` }}
            />
          </div>
          {weeklyData.goalProgress < 70 && (
            <div className="weekly-goal-tip">
              <AlertCircle size={14} />
              <span>Focus: Improve consistency</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
