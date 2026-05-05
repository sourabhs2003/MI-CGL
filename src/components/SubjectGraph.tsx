import { useMemo } from 'react'
import type { StudySessionDoc, Subject } from '../types'
import { hasAnyStudy, hasStudyInKeys, dayKeysEndingAt } from '../lib/sessionGraphData'

type Props = {
  sessions: StudySessionDoc[]
}

function buildSubjectStudy(sessions: StudySessionDoc[]) {
  const monthKeys = new Set(dayKeysEndingAt(new Date(), 30))
  const isFallback = !hasStudyInKeys(sessions, monthKeys) && hasAnyStudy(sessions)
  const totals = new Map<Subject, number>([
    ['Maths', 0],
    ['GS', 0],
    ['English', 0],
    ['Reasoning', 0],
  ])
  for (const session of sessions) {
    if ((isFallback || monthKeys.has(session.dayKey)) && totals.has(session.subject)) {
      totals.set(session.subject, (totals.get(session.subject) ?? 0) + session.durationSec)
    }
  }
  const max = Math.max(...[...totals.values()], 1)
  return {
    data: [...totals.entries()]
      .map(([name, sec]) => {
        const hours = Number((sec / 3600).toFixed(1))
        const ratio = sec / max
        return {
          name: name === 'GS' ? 'GA' : name,
          hours,
          strength: ratio > 0.66 ? 'High' : ratio > 0.33 ? 'Medium' : 'Low',
          color: ratio > 0.66 ? '#00E6A8' : ratio > 0.33 ? '#4DA3FF' : '#FF4D4F',
        }
      })
      .sort((a, b) => b.hours - a.hours),
    isFallback,
  }
}

export function SubjectGraph({ sessions }: Props) {
  const { data: subjectData, isFallback } = useMemo(() => buildSubjectStudy(sessions), [sessions])
  const xAxisMax = Math.max(...subjectData.map((subject) => subject.hours), 1)

  if (subjectData.every((d) => d.hours === 0)) {
    return (
      <div className="graph-card empty-state">
        <p className="muted">No study data yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="graph-card">
      {isFallback && (
        <div className="mini-insight">
          <span>Showing all-time subject balance</span>
        </div>
      )}
      <div className="chart-container">
        <div className="subject-bars" role="img" aria-label="Subject study hours">
          {subjectData.map((subject) => (
            <div className="subject-bar-row" key={subject.name}>
              <span className="subject-bar-label">{subject.name}</span>
              <div className="subject-bar-track">
                <span
                  className="subject-bar-fill"
                  style={{ width: `${Math.max(subject.hours > 0 ? 6 : 0, (subject.hours / xAxisMax) * 100)}%`, background: subject.color }}
                />
              </div>
              <strong>{subject.hours}h</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
