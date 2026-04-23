import { Clock, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'
import type { StudySessionDoc } from '../types'

type Props = {
  sessions: StudySessionDoc[]
  studySubjects: Array<{ name: string; hours: number; strength: string }>
}

export function AnalyticsInsights({ sessions, studySubjects }: Props) {
  const insights: Array<{ icon: typeof Clock; text: string; type: 'info' | 'warning' | 'success' }> = []

  // Best study time analysis
  const timeSlots = new Map<string, number>()
  for (const session of sessions) {
    const time = session.startTime ?? session.endTime ?? session.topic.slice(0, 5)
    const hour = Number(time.slice(0, 2))
    if (!Number.isNaN(hour)) {
      const slot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Night'
      timeSlots.set(slot, (timeSlots.get(slot) ?? 0) + session.durationSec)
    }
  }
  const bestTime = [...timeSlots.entries()].sort((a, b) => b[1] - a[1])[0]
  if (bestTime) {
    insights.push({
      icon: Clock,
      text: `Best study time: ${bestTime[0]}`,
      type: 'info',
    })
  }

  // Weak subject analysis
  const weakSubject = [...studySubjects].sort((a, b) => a.hours - b.hours)[0]
  if (weakSubject && weakSubject.hours > 0) {
    insights.push({
      icon: TrendingDown,
      text: `Weak subject: ${weakSubject.name}`,
      type: 'warning',
    })
  }

  // Strong subject analysis
  const strongSubject = studySubjects[0]
  if (strongSubject && strongSubject.hours > 0) {
    insights.push({
      icon: TrendingUp,
      text: `Strong subject: ${strongSubject.name}`,
      type: 'success',
    })
  }

  // Consistency analysis
  const last30Days = new Set<string>()
  for (const session of sessions) {
    last30Days.add(session.dayKey)
  }
  const consistency = Math.round((last30Days.size / 30) * 100)
  insights.push({
    icon: AlertCircle,
    text: `Consistency: ${consistency}%`,
    type: consistency >= 70 ? 'success' : consistency >= 50 ? 'info' : 'warning',
  })

  return (
    <section className="card analytics-insights-card">
      <div className="home-block-head">
        <h2>Insights</h2>
      </div>
      <div className="analytics-insights-list">
        {insights.map((insight, index) => (
          <div key={index} className={`analytics-insight-item ${insight.type}`}>
            <insight.icon size={18} />
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
