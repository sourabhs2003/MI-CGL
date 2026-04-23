import { useMemo } from 'react'
import { Target, Clock, AlertTriangle } from 'lucide-react'
import type { StudySessionDoc, Subject } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

type FocusItem = {
  subject: string
  duration: string
  reason: string
}

export function TodayFocus({ sessions }: Props) {
  const focusItems = useMemo((): FocusItem[] => {
    const monthKeys = new Set(lastNDaysKeys(30))
    const totals = new Map<Subject, number>([
      ['Maths', 0],
      ['GS', 0],
      ['English', 0],
      ['Reasoning', 0],
      ['Mock', 0],
      ['Mixed', 0],
      ['Miscellaneous', 0],
    ])

    for (const session of sessions) {
      if (monthKeys.has(session.dayKey)) {
        totals.set(session.subject, (totals.get(session.subject) ?? 0) + session.durationSec)
      }
    }

    const max = Math.max(...[...totals.values()], 1)
    const items: FocusItem[] = []

    // Sort by hours studied (lowest first = needs more focus)
    const sortedSubjects = [...totals.entries()]
      .filter(([name]) => name !== 'Mixed' && name !== 'Mock' && name !== 'Miscellaneous')
      .sort((a, b) => a[1] - b[1])

    // Generate focus plan for top 3 subjects that need attention
    for (const [subject, sec] of sortedSubjects.slice(0, 3)) {
      const hours = sec / 3600
      const ratio = sec / max
      const displayName = subject === 'GS' ? 'GA' : subject

      if (ratio < 0.33 && hours < 3) {
        // Weak area - needs more focus
        items.push({
          subject: displayName,
          duration: '2h',
          reason: 'Weak area',
        })
      } else if (ratio < 0.5 && hours < 5) {
        // Medium - moderate focus needed
        items.push({
          subject: displayName,
          duration: '1h',
          reason: 'Low accuracy',
        })
      } else if (ratio > 0.66 && hours > 8) {
        // Strong - just revision
        items.push({
          subject: displayName,
          duration: '30m',
          reason: 'Revision',
        })
      } else {
        // Balanced - regular practice
        items.push({
          subject: displayName,
          duration: '1h',
          reason: 'Practice',
        })
      }
    }

    // If no data, provide default plan
    if (items.length === 0) {
      return [
        { subject: 'Reasoning', duration: '2h', reason: 'Start here' },
        { subject: 'Maths', duration: '1h', reason: 'Practice' },
        { subject: 'English', duration: '30m', reason: 'Revision' },
      ]
    }

    return items.slice(0, 3)
  }, [sessions])

  const totalDuration = useMemo(() => {
    return focusItems.reduce((total, item) => {
      const value = parseInt(item.duration)
      const unit = item.duration.includes('m') ? 1 : 60
      return total + (value * unit)
    }, 0)
  }, [focusItems])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
    if (hours > 0) return `${hours}h`
    return `${mins}m`
  }

  return (
    <section className="card today-focus-card">
      <div className="today-focus-header">
        <Target size={18} />
        <h3>Today's Focus</h3>
      </div>

      <div className="today-focus-content">
        <div className="focus-items-list">
          {focusItems.map((item, index) => (
            <div key={`${item.subject}-${index}`} className="focus-item">
              <span className="focus-number">{index + 1}</span>
              <div className="focus-item-content">
                <span className="focus-subject">{item.subject}</span>
                <span className="focus-duration">{item.duration}</span>
              </div>
              <span className="focus-reason">{item.reason}</span>
            </div>
          ))}
        </div>

        <div className="focus-total">
          <Clock size={14} />
          <span>Estimated total: {formatDuration(totalDuration)}</span>
        </div>

        {focusItems.some((item) => item.reason === 'Weak area') && (
          <div className="focus-tip">
            <AlertTriangle size={14} />
            <span>Focus on weak areas to improve overall performance</span>
          </div>
        )}
      </div>
    </section>
  )
}
