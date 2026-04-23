import { useMemo } from 'react'
import { Play, BookOpen, AlertTriangle } from 'lucide-react'
import type { StudySessionDoc, Subject } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

type SubjectData = {
  name: string
  hours: number
  strength: 'High' | 'Medium' | 'Low'
  retention?: number
  accuracy?: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  recommendation: string
}

export function SubjectIntelligence({ sessions }: Props) {
  const subjectData = useMemo((): SubjectData[] => {
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

    return [...totals.entries()]
      .filter(([name]) => name !== 'Mixed' && name !== 'Mock' && name !== 'Miscellaneous')
      .map(([name, sec]) => {
        const hours = sec / 3600
        const ratio = sec / max
        const strength: 'High' | 'Medium' | 'Low' = ratio > 0.66 ? 'High' : ratio > 0.33 ? 'Medium' : 'Low'

        // Calculate priority based on strength and hours
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
        if (strength === 'Low' && hours < 5) {
          priority = 'HIGH'
        } else if (strength === 'High' && hours > 10) {
          priority = 'LOW'
        }

        // Generate recommendation
        let recommendation = ''
        if (priority === 'HIGH') {
          recommendation = 'Increase practice + mocks'
        } else if (priority === 'LOW') {
          recommendation = 'Maintain with light revision'
        } else {
          recommendation = 'Consistent practice needed'
        }

        return {
          name: name === 'GS' ? 'GA' : name,
          hours: Number(hours.toFixed(1)),
          strength,
          retention: Math.min(100, Math.round(ratio * 100)),
          priority,
          recommendation,
        }
      })
      .sort((a, b) => b.hours - a.hours)
  }, [sessions])

  const getStrengthColor = (strength: 'High' | 'Medium' | 'Low') => {
    switch (strength) {
      case 'High':
        return '#00E6A8'
      case 'Medium':
        return '#FFB020'
      case 'Low':
        return '#FF4D4F'
      default:
        return '#9CA3AF'
    }
  }

  if (subjectData.length === 0 || subjectData.every((s) => s.hours === 0)) {
    return (
      <section className="card subject-intelligence-card">
        <div className="card-head">
          <h2>Subject Intelligence</h2>
        </div>
        <p className="muted">No study data yet. Start your first session!</p>
      </section>
    )
  }

  return (
    <section className="card subject-intelligence-card">
      <div className="card-head">
        <h2>Subject Intelligence</h2>
      </div>
      <div className="subject-intelligence-grid">
        {subjectData.map((subject) => (
          <div key={subject.name} className="subject-intelligence-item">
            <div className="subject-intelligence-header">
              <span className="subject-name">{subject.name}</span>
              <span className="subject-hours">{subject.hours}h</span>
            </div>
            <div className="subject-intelligence-metrics">
              <div className="subject-metric">
                <span className="metric-label">Strength</span>
                <span
                  className="metric-value strength"
                  style={{ color: getStrengthColor(subject.strength) }}
                >
                  {subject.strength}
                </span>
              </div>
              <div className="subject-metric">
                <span className="metric-label">Retention</span>
                <span className="metric-value">{subject.retention}%</span>
              </div>
            </div>
            {subject.priority === 'HIGH' && (
              <div className="subject-priority-badge">
                <AlertTriangle size={12} />
                <span>Priority: HIGH</span>
              </div>
            )}
            <div className="subject-recommendation">
              <span>→ {subject.recommendation}</span>
            </div>
            <button className="subject-cta-btn">
              {subject.priority === 'HIGH' ? (
                <>
                  <Play size={14} />
                  Start Practice
                </>
              ) : (
                <>
                  <BookOpen size={14} />
                  Revise Now
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
